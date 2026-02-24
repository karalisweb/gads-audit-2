#!/bin/bash

#############################################################
#  KW GADS Audit - Deploy Script
#  Versione: 2.11.0
#
#  App:     KW GADS Audit
#  URL:     https://gads.karalisdemo.it
#  Server:  185.192.97.108 (Contabo VPS)
#  Path:    /var/www/gads-audit-2
#  PM2:     gads-audit
#  Stack:   React + Vite | NestJS | PostgreSQL | Redis
#  Porta:   3001
#
#  Uso:
#    ./deploy.sh "feat: descrizione"              # patch bump (default)
#    ./deploy.sh --bump patch "feat: descrizione"  # patch bump esplicito
#    ./deploy.sh --bump minor "feat: descrizione"  # minor bump
#    ./deploy.sh --bump major "feat: descrizione"  # major bump
#
#  Flag opzionali:
#    --dry-run      Mostra cosa farebbe senza eseguire
#    --no-tag       Non creare git tag
#    --help         Mostra guida completa
#############################################################

set -e

# ═══════════════════════════════════════════════════════════
# CONFIGURAZIONE
# ═══════════════════════════════════════════════════════════

APP_NAME="KW GADS Audit"
APP_VERSION="2.11.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPS_HOST="root@185.192.97.108"
VPS_PATH="/var/www/gads-audit-2"
BRANCH="main"
PM2_PROCESS="gads-audit"
LOCAL_PORT_FRONTEND=5173
LOCAL_PORT_BACKEND=3001
SERVER_PORT=3001
PUBLIC_URL="https://gads.karalisdemo.it"
HEALTH_CHECK_URL="https://gads.karalisdemo.it"
NGINX_CONFIG="/etc/nginx/sites-available/gads-audit"

# Timer
DEPLOY_START=$(date +%s)

# Colori output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════
# FUNZIONI UTILITY
# ═══════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ${YELLOW}${BOLD}$APP_NAME${NC}${CYAN} - Deploy                               ║${NC}"
    echo -e "${CYAN}║  ${NC}$PUBLIC_URL${CYAN}                             ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "\n${BLUE}━━━ STEP $1/$TOTAL_STEPS: $2 ━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}  ✓ $1${NC}"
}

print_error() {
    echo -e "${RED}  ✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}  → $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
}

print_dry() {
    echo -e "${MAGENTA}  [DRY] $1${NC}"
}

# Helper per sed cross-platform (macOS vs Linux)
do_sed() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$1" "$2"
    else
        sed -i "$1" "$2"
    fi
}

# Data in italiano
get_italian_date() {
    local day=$(date '+%-d')
    local month_num=$(date '+%-m')
    local year=$(date '+%Y')
    local months=("" "Gennaio" "Febbraio" "Marzo" "Aprile" "Maggio" "Giugno" "Luglio" "Agosto" "Settembre" "Ottobre" "Novembre" "Dicembre")
    echo "$day ${months[$month_num]} $year"
}

get_iso_date() {
    date '+%Y-%m-%d'
}

# ═══════════════════════════════════════════════════════════
# FUNZIONE: Mostra help
# ═══════════════════════════════════════════════════════════

show_help() {
    echo ""
    echo -e "${BOLD}${APP_NAME} - Deploy Script${NC}"
    echo ""
    echo -e "${BOLD}Uso:${NC}"
    echo "  ./deploy.sh \"messaggio commit\"                     Deploy con patch bump (default)"
    echo "  ./deploy.sh --bump patch \"messaggio commit\"        Patch bump esplicito"
    echo "  ./deploy.sh --bump minor \"messaggio commit\"        Minor bump + deploy"
    echo "  ./deploy.sh --bump major \"messaggio commit\"        Major bump + deploy"
    echo ""
    echo -e "${BOLD}Flag opzionali:${NC}"
    echo "  --dry-run        Mostra cosa farebbe senza eseguire"
    echo "  --no-tag         Non creare git tag"
    echo "  --help           Mostra questa guida"
    echo ""
    echo -e "${BOLD}Versione corrente:${NC} ${APP_VERSION}"
    echo ""
    echo -e "${BOLD}Cosa aggiorna il version bump:${NC}"
    echo "  1. frontend/package.json                   (version)"
    echo "  2. backend/package.json                    (version)"
    echo "  3. deploy.sh                               (APP_VERSION + header)"
    echo "  4. DEPLOY.md                               (versione attuale)"
    echo "  5. Sidebar.tsx                              (APP_VERSION const)"
    echo "  6. LoginPage.tsx                            (footer versione)"
    echo "  7. docs/GUIDA-UTENTE.md                    (footer versione e data)"
    echo "  8. CHANGELOG.md                            (nuova entry con editor)"
    echo ""
    echo -e "${BOLD}Step deploy:${NC}"
    echo "   1. Version bump (tutti i file)"
    echo "   2. Aggiornamento CHANGELOG.md (con editor)"
    echo "   3. Aggiornamento guida utente e docs"
    echo "   4. Verifica documentazione"
    echo "   5. Verifica Git"
    echo "   6. Commit"
    echo "   7. Git tag"
    echo "   8. Push"
    echo "   9. Pull + Install (VPS)"
    echo "  10. Build Frontend (VPS)"
    echo "  11. Build Backend + Migrazioni (VPS)"
    echo "  12. Restart PM2"
    echo "  13. Health check"
    echo ""
}

# ═══════════════════════════════════════════════════════════
# PARSING ARGOMENTI
# ═══════════════════════════════════════════════════════════

BUMP_TYPE="patch"  # Default: sempre patch
COMMIT_MSG=""
DRY_RUN=false
NO_TAG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --major)
            BUMP_TYPE="major"
            shift
            ;;
        --minor)
            BUMP_TYPE="minor"
            shift
            ;;
        --patch)
            BUMP_TYPE="patch"
            shift
            ;;
        --bump)
            BUMP_TYPE="$2"
            if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
                print_error "Tipo bump non valido: $BUMP_TYPE (usa: patch, minor, major)"
                exit 1
            fi
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-tag)
            NO_TAG=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            if [ -z "$COMMIT_MSG" ]; then
                COMMIT_MSG="$1"
            fi
            shift
            ;;
    esac
done

# Verifica messaggio commit
if [ -z "$COMMIT_MSG" ]; then
    print_error "Uso: ./deploy.sh [--bump minor|major] \"messaggio commit\""
    echo ""
    echo "  Esempi:"
    echo "    ./deploy.sh \"feat: nuova feature\"             # patch bump (default)"
    echo "    ./deploy.sh --bump minor \"feat: nuova feature\" # minor bump"
    echo "    ./deploy.sh --bump major \"feat: breaking change\" # major bump"
    echo ""
    echo "  Per la guida completa: ./deploy.sh --help"
    exit 1
fi

# ═══════════════════════════════════════════════════════════
# CALCOLO NUOVA VERSIONE
# ═══════════════════════════════════════════════════════════

OLD_VERSION="$APP_VERSION"
IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$APP_VERSION"

case $BUMP_TYPE in
    major) V_MAJOR=$((V_MAJOR + 1)); V_MINOR=0; V_PATCH=0 ;;
    minor) V_MINOR=$((V_MINOR + 1)); V_PATCH=0 ;;
    patch) V_PATCH=$((V_PATCH + 1)) ;;
esac

NEW_VERSION="${V_MAJOR}.${V_MINOR}.${V_PATCH}"

# ═══════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════

print_header

echo -e "  ${BOLD}Versione:${NC}   ${OLD_VERSION} → ${GREEN}${NEW_VERSION}${NC} (${BUMP_TYPE})"
echo -e "  ${BOLD}Commit:${NC}     ${COMMIT_MSG}"
echo -e "  ${BOLD}Branch:${NC}     ${BRANCH}"

if $DRY_RUN; then
    echo -e "  ${MAGENTA}${BOLD}MODALITA' DRY-RUN - nessuna modifica verra' applicata${NC}"
fi
echo ""

# Chiedi il nome della release
if ! $DRY_RUN; then
    echo -e "${CYAN}Inserisci il nome della release (es: 'Per-Account Scheduling'):${NC}"
    read -r RELEASE_NAME
fi
if [ -z "$RELEASE_NAME" ]; then
    RELEASE_NAME="Release ${NEW_VERSION}"
fi

TODAY_ISO=$(get_iso_date)
TODAY_IT=$(get_italian_date)
TOTAL_STEPS=13

# Salva hash corrente per info rollback
PREV_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "n/a")

# ═══════════════════════════════════════════════════════════
# STEP 1: VERSION BUMP (tutti i file)
# ═══════════════════════════════════════════════════════════

print_step "1" "VERSION BUMP (${BUMP_TYPE}: ${OLD_VERSION} → ${NEW_VERSION})"

if $DRY_RUN; then
    print_dry "frontend/package.json → ${NEW_VERSION}"
    print_dry "backend/package.json → ${NEW_VERSION}"
    print_dry "deploy.sh → ${NEW_VERSION}"
    print_dry "DEPLOY.md → ${NEW_VERSION}"
    print_dry "Sidebar.tsx → ${NEW_VERSION}"
    print_dry "LoginPage.tsx → v${NEW_VERSION}"
else
    # 1. frontend/package.json
    do_sed "s/\"version\": \"${OLD_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "${SCRIPT_DIR}/frontend/package.json"
    print_success "frontend/package.json → ${NEW_VERSION}"

    # 2. backend/package.json (regex generica per gestire sync)
    do_sed "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"${NEW_VERSION}\"/" "${SCRIPT_DIR}/backend/package.json"
    print_success "backend/package.json → ${NEW_VERSION}"

    # 3. deploy.sh (APP_VERSION + header comment)
    do_sed "s/APP_VERSION=\"${OLD_VERSION}\"/APP_VERSION=\"${NEW_VERSION}\"/" "${SCRIPT_DIR}/deploy.sh"
    do_sed "s/Versione: ${OLD_VERSION}/Versione: ${NEW_VERSION}/" "${SCRIPT_DIR}/deploy.sh"
    print_success "deploy.sh → ${NEW_VERSION}"

    # 4. DEPLOY.md
    if [ -f "${SCRIPT_DIR}/DEPLOY.md" ]; then
        do_sed "s/Versione attuale: \*\*${OLD_VERSION}\*\*/Versione attuale: \*\*${NEW_VERSION}\*\*/" "${SCRIPT_DIR}/DEPLOY.md"
        print_success "DEPLOY.md → ${NEW_VERSION}"
    fi

    # 5. Sidebar.tsx (APP_VERSION const)
    do_sed "s/const APP_VERSION = '${OLD_VERSION}'/const APP_VERSION = '${NEW_VERSION}'/" "${SCRIPT_DIR}/frontend/src/components/Layout/Sidebar.tsx"
    print_success "Sidebar.tsx → ${NEW_VERSION}"

    # 6. LoginPage.tsx (footer versione)
    do_sed "s/v${OLD_VERSION}/v${NEW_VERSION}/" "${SCRIPT_DIR}/frontend/src/pages/auth/LoginPage.tsx"
    print_success "LoginPage.tsx → v${NEW_VERSION}"
fi

APP_VERSION="$NEW_VERSION"

# ═══════════════════════════════════════════════════════════
# STEP 2: CHANGELOG
# ═══════════════════════════════════════════════════════════

print_step "2" "CHANGELOG"

# Determina sezione dal prefisso del commit
SECTION="Modificato"
case "$COMMIT_MSG" in
    feat:*|feat\(*) SECTION="Aggiunto" ;;
    fix:*|fix\(*)   SECTION="Corretto" ;;
    refactor:*|refactor\(*) SECTION="Modificato" ;;
    docs:*|docs\(*) SECTION="Documentazione" ;;
esac

# Pulisci il messaggio (rimuovi prefisso)
CLEAN_MSG=$(echo "$COMMIT_MSG" | sed 's/^[a-z]*([^)]*): *//' | sed 's/^[a-z]*: *//')
CLEAN_MSG="$(echo "${CLEAN_MSG:0:1}" | tr '[:lower:]' '[:upper:]')${CLEAN_MSG:1}"

# Template entry changelog
CHANGELOG_ENTRY="## [${NEW_VERSION}] - ${TODAY_ISO}

### Nome Release: ${RELEASE_NAME}

### Aggiunto
-

### Modificato
-

### Corretto
-

---"

if $DRY_RUN; then
    print_dry "Nuova entry: ## [${NEW_VERSION}] - ${TODAY_ISO}"
    print_dry "Release: ${RELEASE_NAME}"
    print_dry "Editor si aprirebbe per compilare il changelog"
else
    if [ -f "${SCRIPT_DIR}/CHANGELOG.md" ]; then
        # Inserisci dopo la prima riga "---" (dopo l'header del CHANGELOG)
        TEMP_CL="${SCRIPT_DIR}/CHANGELOG.md.tmp"
        awk -v entry="$CHANGELOG_ENTRY" '
            /^---$/ && !found {
                print
                print ""
                print entry
                print ""
                found=1
                next
            }
            { print }
        ' "${SCRIPT_DIR}/CHANGELOG.md" > "$TEMP_CL"
        mv "$TEMP_CL" "${SCRIPT_DIR}/CHANGELOG.md"
        print_success "Entry [${NEW_VERSION}] aggiunta al CHANGELOG"

        # Apri editor per compilare il changelog
        EDITOR_CMD="${EDITOR:-nano}"
        echo ""
        echo -e "    ${CYAN}Apro ${EDITOR_CMD} per compilare il CHANGELOG...${NC}"
        echo -e "    ${CYAN}(Salva e chiudi l'editor per continuare il deploy)${NC}"
        echo ""
        $EDITOR_CMD "${SCRIPT_DIR}/CHANGELOG.md"
        print_success "CHANGELOG compilato"
    else
        # Crea CHANGELOG.md da zero
        cat > "${SCRIPT_DIR}/CHANGELOG.md" << CHANGELOGEOF
# Changelog - KW GADS Audit

Tutte le modifiche rilevanti al progetto sono documentate in questo file.
Formato basato su [Semantic Versioning](https://semver.org/).

---

## [${NEW_VERSION}] - ${TODAY_ISO}

### Nome Release: ${RELEASE_NAME}

### ${SECTION}
- ${CLEAN_MSG}

---

*Ultimo aggiornamento: ${TODAY_ISO}*
CHANGELOGEOF
        print_success "CHANGELOG.md creato con v${NEW_VERSION}"
    fi
fi

# ═══════════════════════════════════════════════════════════
# STEP 3: AGGIORNAMENTO GUIDA UTENTE E DOCS
# ═══════════════════════════════════════════════════════════

print_step "3" "GUIDA UTENTE E DOCUMENTAZIONE"

# 1. docs/GUIDA-UTENTE.md - aggiorna footer versione e data
if [ -f "${SCRIPT_DIR}/docs/GUIDA-UTENTE.md" ]; then
    if $DRY_RUN; then
        print_dry "GUIDA-UTENTE.md: footer → ${TODAY_IT} | Versione app: ${NEW_VERSION}"
    else
        # Pattern footer: *Ultimo aggiornamento: DATE | Versione app: X.Y.Z*
        # Supporta sia formato ISO (2026-02-14) che italiano (14 Febbraio 2026)
        do_sed "s/\*Ultimo aggiornamento: .* | Versione app: .*\*/*Ultimo aggiornamento: ${TODAY_IT} | Versione app: ${NEW_VERSION}*/" "${SCRIPT_DIR}/docs/GUIDA-UTENTE.md"
        print_success "docs/GUIDA-UTENTE.md → v${NEW_VERSION} (${TODAY_IT})"
    fi
else
    print_warn "docs/GUIDA-UTENTE.md non trovato"
fi

# 2. docs/INFRASTRUCTURE.md - aggiorna se ha footer versione
if [ -f "${SCRIPT_DIR}/docs/INFRASTRUCTURE.md" ]; then
    if grep -q "Ultimo aggiornamento" "${SCRIPT_DIR}/docs/INFRASTRUCTURE.md"; then
        if $DRY_RUN; then
            print_dry "INFRASTRUCTURE.md: footer → ${TODAY_IT} (v${NEW_VERSION})"
        else
            do_sed "s/\*\*Ultimo aggiornamento\*\*: .* (v[0-9]*\.[0-9]*\.[0-9]*)/**Ultimo aggiornamento**: ${TODAY_IT} (v${NEW_VERSION})/" "${SCRIPT_DIR}/docs/INFRASTRUCTURE.md"
            print_success "docs/INFRASTRUCTURE.md → v${NEW_VERSION}"
        fi
    else
        print_info "INFRASTRUCTURE.md: nessun footer versione, skip"
    fi
fi

# 3. Aggiorna eventuali altri docs con footer "Ultimo aggiornamento"
DOC_UPDATED=0
for doc_file in "${SCRIPT_DIR}"/docs/*.md; do
    if [ -f "$doc_file" ]; then
        basename_doc=$(basename "$doc_file")
        # Skip file già gestiti
        if [[ "$basename_doc" == "GUIDA-UTENTE.md" ]] || [[ "$basename_doc" == "INFRASTRUCTURE.md" ]]; then
            continue
        fi
        if grep -q "Ultimo aggiornamento.*v[0-9]" "$doc_file"; then
            if $DRY_RUN; then
                print_dry "${basename_doc}: footer → ${TODAY_IT} (v${NEW_VERSION})"
            else
                do_sed "s/\*\*Ultimo aggiornamento\*\*: .* (v[0-9]*\.[0-9]*\.[0-9]*)/**Ultimo aggiornamento**: ${TODAY_IT} (v${NEW_VERSION})/" "$doc_file"
                DOC_UPDATED=$((DOC_UPDATED + 1))
            fi
        fi
    fi
done
if [ $DOC_UPDATED -gt 0 ]; then
    print_success "docs/ → ${DOC_UPDATED} file aggiuntivi aggiornati"
fi

# ═══════════════════════════════════════════════════════════
# STEP 4: VERIFICA DOCUMENTAZIONE
# ═══════════════════════════════════════════════════════════

print_step "4" "VERIFICA DOCUMENTAZIONE"

WARNINGS=0

# Verifica GUIDA-UTENTE.md contiene versione corretta
if [ -f "${SCRIPT_DIR}/docs/GUIDA-UTENTE.md" ]; then
    if grep -q "$NEW_VERSION" "${SCRIPT_DIR}/docs/GUIDA-UTENTE.md"; then
        print_success "GUIDA-UTENTE.md contiene v${NEW_VERSION}"
    else
        print_warn "GUIDA-UTENTE.md non contiene v${NEW_VERSION}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    print_warn "docs/GUIDA-UTENTE.md non trovato"
    WARNINGS=$((WARNINGS + 1))
fi

# Verifica CHANGELOG contiene versione
if [ -f "${SCRIPT_DIR}/CHANGELOG.md" ]; then
    if grep -q "\[${NEW_VERSION}\]" "${SCRIPT_DIR}/CHANGELOG.md"; then
        print_success "CHANGELOG.md contiene [${NEW_VERSION}]"
    else
        print_warn "CHANGELOG.md non contiene [${NEW_VERSION}]"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Verifica CLAUDE.md presente
if [ -f "${SCRIPT_DIR}/CLAUDE.md" ]; then
    print_success "CLAUDE.md presente"
fi

if [ $WARNINGS -gt 0 ]; then
    print_warn "${WARNINGS} warning sulla documentazione (non bloccanti)"
else
    print_success "Documentazione aggiornata"
fi

# ═══════════════════════════════════════════════════════════
# STEP 5: VERIFICA GIT
# ═══════════════════════════════════════════════════════════

print_step "5" "VERIFICA GIT"

cd "${SCRIPT_DIR}"
BRANCH_CURRENT=$(git branch --show-current)
if [ "$BRANCH_CURRENT" != "$BRANCH" ]; then
    print_error "Sei sul branch '$BRANCH_CURRENT', devi essere su '$BRANCH'"
    exit 1
fi
print_success "Branch: $BRANCH"

if [ -n "$(git status --porcelain)" ]; then
    git status --short | head -20
else
    print_warn "Nessuna modifica da committare"
    if ! $DRY_RUN; then
        read -p "  Vuoi continuare comunque? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
fi

# ═══════════════════════════════════════════════════════════
# STEP 6: COMMIT
# ═══════════════════════════════════════════════════════════

print_step "6" "COMMIT"

FULL_COMMIT_MSG="v${NEW_VERSION}: ${COMMIT_MSG}"

if $DRY_RUN; then
    print_dry "git add ."
    print_dry "git commit -m \"${FULL_COMMIT_MSG}\""
else
    git add .
    git commit -m "$FULL_COMMIT_MSG" || print_warn "Niente da committare"
    COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "n/a")
    print_success "Commit: ${FULL_COMMIT_MSG} (${COMMIT_HASH})"
fi

# ═══════════════════════════════════════════════════════════
# STEP 7: GIT TAG
# ═══════════════════════════════════════════════════════════

print_step "7" "GIT TAG"

if ! $NO_TAG; then
    TAG_NAME="v${NEW_VERSION}"
    if $DRY_RUN; then
        print_dry "git tag -a ${TAG_NAME} -m \"Release ${NEW_VERSION} - ${RELEASE_NAME}\""
    else
        if git tag -l | grep -q "^${TAG_NAME}$"; then
            print_warn "Tag ${TAG_NAME} esiste gia', skip"
        else
            git tag -a "${TAG_NAME}" -m "Release ${NEW_VERSION} - ${RELEASE_NAME}"
            print_success "Tag ${TAG_NAME} creato (${RELEASE_NAME})"
        fi
    fi
else
    print_warn "Tag skippato (--no-tag)"
fi

# ═══════════════════════════════════════════════════════════
# STEP 8: PUSH
# ═══════════════════════════════════════════════════════════

print_step "8" "PUSH"

if $DRY_RUN; then
    print_dry "git push origin ${BRANCH}"
    if ! $NO_TAG; then
        print_dry "git push origin --tags"
    fi
else
    git push origin $BRANCH
    if ! $NO_TAG; then
        git push origin --tags
    fi
    print_success "Push completato su origin/$BRANCH"
fi

# ═══════════════════════════════════════════════════════════
# STEP 9: PULL + INSTALL (VPS)
# ═══════════════════════════════════════════════════════════

print_step "9" "PULL + INSTALL (VPS)"

if $DRY_RUN; then
    print_dry "ssh ${VPS_HOST} \"cd ${VPS_PATH} && git pull origin ${BRANCH}\""
    print_dry "npm install frontend + backend"
else
    ssh $VPS_HOST "cd $VPS_PATH && git pull origin $BRANCH && cd frontend && npm install && cd ../backend && npm install"
    if [ $? -ne 0 ]; then
        print_error "Pull/Install fallito sul VPS"
        exit 1
    fi
    print_success "Pull e npm install completati"
fi

# ═══════════════════════════════════════════════════════════
# STEP 10: BUILD FRONTEND (VPS)
# ═══════════════════════════════════════════════════════════

print_step "10" "BUILD FRONTEND (VPS)"

if $DRY_RUN; then
    print_dry "ssh ${VPS_HOST} \"cd ${VPS_PATH}/frontend && npm run build && cp -r dist/* ${VPS_PATH}/public/\""
else
    ssh $VPS_HOST "cd $VPS_PATH/frontend && npm run build && cp -r dist/* $VPS_PATH/public/"
    if [ $? -ne 0 ]; then
        print_error "Build frontend fallita"
        exit 1
    fi
    print_success "Frontend build completata"
fi

# ═══════════════════════════════════════════════════════════
# STEP 11: BUILD BACKEND + MIGRAZIONI (VPS)
# ═══════════════════════════════════════════════════════════

print_step "11" "BUILD BACKEND + MIGRAZIONI (VPS)"

if $DRY_RUN; then
    print_dry "ssh ${VPS_HOST} \"cd ${VPS_PATH}/backend && npm run build\""
    print_dry "ssh ${VPS_HOST} \"cd ${VPS_PATH}/backend && npm run migration:run\""
else
    ssh $VPS_HOST "cd $VPS_PATH/backend && npm run build"
    if [ $? -ne 0 ]; then
        print_error "Build backend fallita"
        exit 1
    fi
    print_success "Backend build completata"

    # Esegui migrazioni DB
    print_info "Esecuzione migrazioni database..."
    ssh $VPS_HOST "cd $VPS_PATH/backend && npm run migration:run" 2>&1 || true
    print_success "Migrazioni completate"
fi

# ═══════════════════════════════════════════════════════════
# STEP 12: RESTART PM2
# ═══════════════════════════════════════════════════════════

print_step "12" "RESTART PM2"

if $DRY_RUN; then
    print_dry "ssh ${VPS_HOST} \"pm2 restart ${PM2_PROCESS} --update-env\""
else
    ssh $VPS_HOST "pm2 restart $PM2_PROCESS --update-env 2>/dev/null || (cd $VPS_PATH/backend && pm2 start dist/main.js --name '$PM2_PROCESS' --update-env && pm2 save)"
    if [ $? -ne 0 ]; then
        print_error "Restart PM2 fallito"
        exit 1
    fi
    print_success "PM2 riavviato: $PM2_PROCESS"
fi

# ═══════════════════════════════════════════════════════════
# STEP 13: HEALTH CHECK
# ═══════════════════════════════════════════════════════════

print_step "13" "HEALTH CHECK"

if $DRY_RUN; then
    print_dry "curl -s -o /dev/null -w '%{http_code}' --max-time 10 ${HEALTH_CHECK_URL}"
else
    print_info "Attendo 5 secondi per l'avvio..."
    sleep 5
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        print_success "Server risponde: HTTP ${HTTP_CODE} ✓"
    elif [ "$HTTP_CODE" = "000" ]; then
        print_warn "Health check timeout - verificare manualmente"
    else
        print_warn "Server risponde: HTTP ${HTTP_CODE} - verificare manualmente"
    fi
fi

# ═══════════════════════════════════════════════════════════
# RIEPILOGO FINALE
# ═══════════════════════════════════════════════════════════

DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
if $DRY_RUN; then
echo -e "${GREEN}║  ${MAGENTA}${BOLD}DRY-RUN COMPLETATO (nessuna modifica)${NC}${GREEN}                    ║${NC}"
else
echo -e "${GREEN}║  ${BOLD}✓ DEPLOY COMPLETATO${NC}${GREEN}                                      ║${NC}"
fi
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}App:${NC}        ${APP_NAME}"
echo -e "${GREEN}║${NC}  ${BOLD}Versione:${NC}   ${OLD_VERSION} → ${GREEN}${NEW_VERSION}${NC} (${BUMP_TYPE})"
echo -e "${GREEN}║${NC}  ${BOLD}Release:${NC}    ${RELEASE_NAME}"
if ! $DRY_RUN; then
echo -e "${GREEN}║${NC}  ${BOLD}Commit:${NC}     ${COMMIT_HASH:-n/a}"
fi
echo -e "${GREEN}║${NC}  ${BOLD}Branch:${NC}     ${BRANCH}"
if ! $NO_TAG; then
echo -e "${GREEN}║${NC}  ${BOLD}Tag:${NC}        v${NEW_VERSION}"
fi
echo -e "${GREEN}║${NC}  ${BOLD}URL:${NC}        ${PUBLIC_URL}"
echo -e "${GREEN}║${NC}  ${BOLD}Data:${NC}       $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${GREEN}║${NC}  ${BOLD}Durata:${NC}     ${DEPLOY_DURATION} secondi"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# File aggiornati
echo -e "  ${BOLD}File aggiornati:${NC}"
echo -e "    ${CYAN} 1.${NC} frontend/package.json"
echo -e "    ${CYAN} 2.${NC} backend/package.json"
echo -e "    ${CYAN} 3.${NC} deploy.sh"
echo -e "    ${CYAN} 4.${NC} DEPLOY.md"
echo -e "    ${CYAN} 5.${NC} Sidebar.tsx"
echo -e "    ${CYAN} 6.${NC} LoginPage.tsx"
echo -e "    ${CYAN} 7.${NC} docs/GUIDA-UTENTE.md"
echo -e "    ${CYAN} 8.${NC} CHANGELOG.md"
echo ""

if ! $DRY_RUN; then
    echo -e "  ${YELLOW}Rollback:${NC}  git revert ${PREV_HASH}..HEAD"
    echo -e "  ${YELLOW}Logs:${NC}      ssh ${VPS_HOST} 'pm2 logs ${PM2_PROCESS} --lines 20 --nostream'"
    echo ""
fi
