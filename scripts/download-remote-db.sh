#!/bin/bash

# Script per scaricare il database dal server remoto e importarlo in locale
# Esegui con: ./scripts/download-remote-db.sh
#
# Configurazioni documentate in: docs/INFRASTRUCTURE.md

set -e

# ============================================
# CONFIGURAZIONE REMOTA (Produzione)
# ============================================
REMOTE_HOST="root@vmi2996361.contaboserver.net"
REMOTE_DB_HOST="localhost"
REMOTE_DB_PORT="5432"
REMOTE_DB_NAME="gadsaudit"
REMOTE_DB_USER="gadsaudit"
REMOTE_DB_PASSWORD="GadsAudit2024"

# ============================================
# CONFIGURAZIONE LOCALE (Sviluppo)
# ============================================
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5432"
LOCAL_DB_NAME="google_ads_audit"
LOCAL_DB_USER="audit"
LOCAL_DB_PASSWORD="dev_password"
PSQL="/usr/local/opt/postgresql@15/bin/psql"

# ============================================
# VARIABILI
# ============================================
DUMP_FILE="db_dump_$(date +%Y%m%d_%H%M%S).sql"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================
# FUNZIONI
# ============================================
error_exit() {
    echo ""
    echo "❌ ERRORE: $1"
    exit 1
}

check_local_postgres() {
    echo "   Verifico PostgreSQL locale..."
    if ! $PSQL -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d postgres -c "SELECT 1" > /dev/null 2>&1; then
        error_exit "Impossibile connettersi a PostgreSQL locale. Verifica che sia in esecuzione."
    fi
    echo "   ✓ PostgreSQL locale OK"
}

# ============================================
# MAIN
# ============================================
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     DOWNLOAD DATABASE REMOTO             ║"
echo "║     Remoto: $REMOTE_DB_NAME → Locale: $LOCAL_DB_NAME"
echo "╚══════════════════════════════════════════╝"
echo ""

# Pre-check: verifica PostgreSQL locale
echo "0. Verifica prerequisiti..."
check_local_postgres
echo ""

# Step 1: Crea dump sul server remoto
echo "1. Creazione dump sul server remoto..."
echo "   Database: $REMOTE_DB_NAME"
echo "   User: $REMOTE_DB_USER"
ssh $REMOTE_HOST "PGPASSWORD=$REMOTE_DB_PASSWORD pg_dump -h $REMOTE_DB_HOST -p $REMOTE_DB_PORT -U $REMOTE_DB_USER $REMOTE_DB_NAME > /tmp/$DUMP_FILE" || error_exit "Impossibile creare dump sul server remoto"
echo "   ✓ Dump creato: /tmp/$DUMP_FILE"

# Step 2: Scarica il dump in locale
echo ""
echo "2. Download del dump in locale..."
scp $REMOTE_HOST:/tmp/$DUMP_FILE "$SCRIPT_DIR/$DUMP_FILE" || error_exit "Impossibile scaricare il dump"
DUMP_SIZE=$(ls -lh "$SCRIPT_DIR/$DUMP_FILE" | awk '{print $5}')
echo "   ✓ Dump scaricato: $SCRIPT_DIR/$DUMP_FILE ($DUMP_SIZE)"

# Step 3: Pulisci il file temporaneo sul server
echo ""
echo "3. Pulizia file temporaneo sul server..."
ssh $REMOTE_HOST "rm -f /tmp/$DUMP_FILE" || echo "   ⚠ Warning: impossibile eliminare file temporaneo"
echo "   ✓ File temporaneo rimosso"

# Step 4: Importa nel database locale
echo ""
echo "4. Importazione nel database locale..."
echo "   Database: $LOCAL_DB_NAME"
echo "   User: $LOCAL_DB_USER"

# Chiudi connessioni esistenti
echo "   Chiudo connessioni esistenti..."
PGPASSWORD=$LOCAL_DB_PASSWORD $PSQL -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LOCAL_DB_NAME' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

# Ricrea il database
echo "   Ricreo database..."
PGPASSWORD=$LOCAL_DB_PASSWORD $PSQL -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d postgres -c "DROP DATABASE IF EXISTS $LOCAL_DB_NAME;" > /dev/null 2>&1 || error_exit "Impossibile eliminare database esistente"
PGPASSWORD=$LOCAL_DB_PASSWORD $PSQL -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d postgres -c "CREATE DATABASE $LOCAL_DB_NAME;" > /dev/null 2>&1 || error_exit "Impossibile creare database"

# Importa il dump
echo "   Importo dati..."
PGPASSWORD=$LOCAL_DB_PASSWORD $PSQL -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME < "$SCRIPT_DIR/$DUMP_FILE" > /dev/null 2>&1 || error_exit "Impossibile importare dump"
echo "   ✓ Database importato con successo"

# Step 5: Verifica importazione
echo ""
echo "5. Verifica importazione..."
TABLE_COUNT=$(PGPASSWORD=$LOCAL_DB_PASSWORD $PSQL -h $LOCAL_DB_HOST -p $LOCAL_DB_PORT -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "   ✓ Tabelle importate: $TABLE_COUNT"

# Step 6: Pulizia dump locale (opzionale)
echo ""
read -p "6. Vuoi eliminare il file dump locale? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm "$SCRIPT_DIR/$DUMP_FILE"
    echo "   ✓ Dump locale eliminato"
else
    echo "   → Dump mantenuto in: $SCRIPT_DIR/$DUMP_FILE"
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     ✓ COMPLETATO CON SUCCESSO            ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Il database locale '$LOCAL_DB_NAME' è ora sincronizzato"
echo "con il database remoto '$REMOTE_DB_NAME'."
echo ""
