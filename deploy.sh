#!/bin/bash

#############################################################
#  KW GADS Audit - Deploy Script
#  Versione: 2.8.0
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
#    ./deploy.sh "feat: descrizione"            # patch bump (default)
#    ./deploy.sh --minor "feat: descrizione"    # minor bump
#    ./deploy.sh --major "feat: descrizione"    # major bump
#############################################################

set -e

# ═══════════════════════════════════════════════════════════
# CONFIGURAZIONE
# ═══════════════════════════════════════════════════════════

APP_NAME="KW GADS Audit"
APP_VERSION="2.8.0"
VPS_HOST="root@185.192.97.108"
VPS_PATH="/var/www/gads-audit-2"
BRANCH="main"
PM2_PROCESS="gads-audit"
LOCAL_PORT_FRONTEND=5173
LOCAL_PORT_BACKEND=3001
SERVER_PORT=3001
PUBLIC_URL="https://gads.karalisdemo.it"
NGINX_CONFIG="/etc/nginx/sites-available/gads-audit"

# Colori output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════
# FUNZIONI UTILITY
# ═══════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ${YELLOW}${BOLD}$APP_NAME${NC}${CYAN} - Deploy v${APP_VERSION}                     ║${NC}"
    echo -e "${CYAN}║  ${NC}$PUBLIC_URL${CYAN}                             ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "\n${BLUE}━━━ STEP $1/$TOTAL_STEPS: $2 ━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

TOTAL_STEPS=10

# ═══════════════════════════════════════════════════════════
# FUNZIONE: BUMP VERSIONE
# ═══════════════════════════════════════════════════════════

bump_version() {
    local bump_type=$1
    local current=$APP_VERSION

    IFS='.' read -r major minor patch <<< "$current"

    case $bump_type in
        major) major=$((major + 1)); minor=0; patch=0 ;;
        minor) minor=$((minor + 1)); patch=0 ;;
        patch) patch=$((patch + 1)) ;;
        *)
            print_error "Tipo bump non valido: $bump_type (usa: major, minor, patch)"
            exit 1
            ;;
    esac

    local new_version="${major}.${minor}.${patch}"
    print_info "Aggiornamento versione: ${current} → ${BOLD}${new_version}${NC}"

    # Helper per sed cross-platform (macOS vs Linux)
    do_sed() {
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "$1" "$2"
        else
            sed -i "$1" "$2"
        fi
    }

    # 1. frontend/package.json
    do_sed "s/\"version\": \"${current}\"/\"version\": \"${new_version}\"/" frontend/package.json
    print_success "  frontend/package.json → ${new_version}"

    # 2. backend/package.json (usa regex generica per gestire prima sync da 0.0.1)
    do_sed "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"${new_version}\"/" backend/package.json
    print_success "  backend/package.json → ${new_version}"

    # 3. deploy.sh (APP_VERSION + header comment)
    do_sed "s/APP_VERSION=\"${current}\"/APP_VERSION=\"${new_version}\"/" deploy.sh
    do_sed "s/Versione: ${current}/Versione: ${new_version}/" deploy.sh
    print_success "  deploy.sh → ${new_version}"

    # 4. DEPLOY.md
    if [ -f DEPLOY.md ]; then
        do_sed "s/Versione attuale: \*\*${current}\*\*/Versione attuale: \*\*${new_version}\*\*/" DEPLOY.md
        print_success "  DEPLOY.md → ${new_version}"
    fi

    # 5. Sidebar.tsx (APP_VERSION const)
    do_sed "s/const APP_VERSION = '${current}'/const APP_VERSION = '${new_version}'/" frontend/src/components/Layout/Sidebar.tsx
    print_success "  Sidebar.tsx → ${new_version}"

    # 6. LoginPage.tsx (footer versione)
    do_sed "s/v${current}/v${new_version}/" frontend/src/pages/auth/LoginPage.tsx
    print_success "  LoginPage.tsx → ${new_version}"

    APP_VERSION=$new_version
}

# ═══════════════════════════════════════════════════════════
# FUNZIONE: AGGIORNA CHANGELOG
# ═══════════════════════════════════════════════════════════

update_changelog() {
    local version=$1
    local message=$2
    local date_str
    date_str=$(date '+%Y-%m-%d')

    # Determina sezione dal prefisso del commit
    local section="Modificato"
    case "$message" in
        feat:*|feat\(*) section="Aggiunto" ;;
        fix:*|fix\(*)   section="Corretto" ;;
        refactor:*|refactor\(*) section="Modificato" ;;
        docs:*|docs\(*) section="Modificato" ;;
    esac

    # Pulisci il messaggio (rimuovi prefisso)
    local clean_msg
    clean_msg=$(echo "$message" | sed 's/^[a-z]*([^)]*): *//' | sed 's/^[a-z]*: *//')
    # Maiuscola iniziale
    clean_msg="$(echo "${clean_msg:0:1}" | tr '[:lower:]' '[:upper:]')${clean_msg:1}"

    # Costruisci la nuova entry
    local entry="## [${version}] - ${date_str}\n\n### ${section}\n- ${clean_msg}\n\n---\n"

    # Inserisci dopo l'header del CHANGELOG (prima della prima entry ## [)
    if [ -f CHANGELOG.md ]; then
        # Trova la riga della prima entry ## [ e inserisci prima
        local first_entry_line
        first_entry_line=$(grep -n "^## \[" CHANGELOG.md | head -1 | cut -d: -f1)

        if [ -n "$first_entry_line" ]; then
            # Inserisci prima della prima entry esistente
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "${first_entry_line}i\\
\\
${entry}" CHANGELOG.md
            else
                sed -i "${first_entry_line}i\\${entry}" CHANGELOG.md
            fi
        else
            # Nessuna entry esistente, appendi alla fine
            echo -e "\n${entry}" >> CHANGELOG.md
        fi
        print_success "CHANGELOG.md aggiornato con v${version}"
    else
        # Crea CHANGELOG.md da zero
        cat > CHANGELOG.md << CHANGELOGEOF
# Changelog - KW GADS Audit

Tutte le modifiche rilevanti al progetto sono documentate in questo file.
Formato basato su [Semantic Versioning](https://semver.org/).

---

## [${version}] - ${date_str}

### ${section}
- ${clean_msg}

---

*Ultimo aggiornamento: ${date_str}*
CHANGELOGEOF
        print_success "CHANGELOG.md creato con v${version}"
    fi
}

# ═══════════════════════════════════════════════════════════
# FUNZIONE: VERIFICA DOCUMENTAZIONE
# ═══════════════════════════════════════════════════════════

check_docs() {
    local version=$1
    local warnings=0

    # Controlla GUIDA-UTENTE.md
    if [ -f docs/GUIDA-UTENTE.md ]; then
        if ! grep -q "$version" docs/GUIDA-UTENTE.md; then
            print_warn "GUIDA-UTENTE.md non contiene la versione ${version}"
            warnings=$((warnings + 1))
        else
            print_success "GUIDA-UTENTE.md contiene v${version}"
        fi
    else
        print_warn "docs/GUIDA-UTENTE.md non trovato"
        warnings=$((warnings + 1))
    fi

    # Controlla CLAUDE.md
    if [ -f CLAUDE.md ]; then
        print_success "CLAUDE.md presente"
    fi

    if [ $warnings -gt 0 ]; then
        print_warn "Ci sono ${warnings} warning sulla documentazione (non bloccanti)"
    else
        print_success "Documentazione aggiornata"
    fi
}

# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════

print_header

# Parse argomenti
BUMP_TYPE="patch"  # Default: sempre patch
COMMIT_MSG=""

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
            # Retrocompatibilita con vecchia sintassi --bump <type>
            BUMP_TYPE="$2"
            shift 2
            ;;
        *)
            COMMIT_MSG="$1"
            shift
            ;;
    esac
done

# Verifica messaggio commit
if [ -z "$COMMIT_MSG" ]; then
    print_error "Uso: ./deploy.sh [--minor|--major] \"messaggio commit\""
    echo ""
    echo "  Esempi:"
    echo "    ./deploy.sh \"feat: nuova feature\"             # patch bump (default)"
    echo "    ./deploy.sh --minor \"feat: nuova feature\"     # minor bump"
    echo "    ./deploy.sh --major \"feat: breaking change\"   # major bump"
    echo ""
    exit 1
fi

# ═══════════════════════════════════════════════════════════
# STEP 1: Versioning (SEMPRE obbligatorio)
# ═══════════════════════════════════════════════════════════

print_step "1" "VERSIONING (${BUMP_TYPE})"
bump_version "$BUMP_TYPE"

# ═══════════════════════════════════════════════════════════
# STEP 2: Aggiorna CHANGELOG
# ═══════════════════════════════════════════════════════════

print_step "2" "CHANGELOG"
update_changelog "$APP_VERSION" "$COMMIT_MSG"

# ═══════════════════════════════════════════════════════════
# STEP 3: Verifica Documentazione
# ═══════════════════════════════════════════════════════════

print_step "3" "DOCS CHECK"
check_docs "$APP_VERSION"

# ═══════════════════════════════════════════════════════════
# STEP 4: Verifica Git
# ═══════════════════════════════════════════════════════════

print_step "4" "VERIFICA GIT"

BRANCH_CURRENT=$(git branch --show-current)
if [ "$BRANCH_CURRENT" != "$BRANCH" ]; then
    print_error "Sei sul branch '$BRANCH_CURRENT', devi essere su '$BRANCH'"
    exit 1
fi
print_success "Branch: $BRANCH"

# ═══════════════════════════════════════════════════════════
# STEP 5: Commit
# ═══════════════════════════════════════════════════════════

print_step "5" "COMMIT"

git add .
FULL_COMMIT_MSG="v${APP_VERSION}: ${COMMIT_MSG}"
git commit -m "$FULL_COMMIT_MSG"
if [ $? -ne 0 ]; then
    print_error "Commit fallito"
    exit 1
fi
COMMIT_HASH=$(git rev-parse --short HEAD)
print_success "Commit: ${FULL_COMMIT_MSG} (${COMMIT_HASH})"

# ═══════════════════════════════════════════════════════════
# STEP 6: Push
# ═══════════════════════════════════════════════════════════

print_step "6" "PUSH"

git push origin $BRANCH
if [ $? -ne 0 ]; then
    print_error "Push fallito"
    exit 1
fi
print_success "Push completato su origin/$BRANCH"

# ═══════════════════════════════════════════════════════════
# STEP 7: Pull + Install sul VPS
# ═══════════════════════════════════════════════════════════

print_step "7" "PULL + INSTALL (VPS)"

ssh $VPS_HOST "cd $VPS_PATH && git pull origin $BRANCH && cd frontend && npm install && cd ../backend && npm install"
if [ $? -ne 0 ]; then
    print_error "Pull/Install fallito sul VPS"
    exit 1
fi
print_success "Pull e npm install completati"

# ═══════════════════════════════════════════════════════════
# STEP 8: Build Frontend
# ═══════════════════════════════════════════════════════════

print_step "8" "BUILD FRONTEND (VPS)"

ssh $VPS_HOST "cd $VPS_PATH/frontend && npm run build && cp -r dist/* $VPS_PATH/public/"
if [ $? -ne 0 ]; then
    print_error "Build frontend fallita"
    exit 1
fi
print_success "Frontend build completata"

# ═══════════════════════════════════════════════════════════
# STEP 9: Build Backend
# ═══════════════════════════════════════════════════════════

print_step "9" "BUILD BACKEND (VPS)"

ssh $VPS_HOST "cd $VPS_PATH/backend && npm run build"
if [ $? -ne 0 ]; then
    print_error "Build backend fallita"
    exit 1
fi
print_success "Backend build completata"

# ═══════════════════════════════════════════════════════════
# STEP 10: Restart PM2
# ═══════════════════════════════════════════════════════════

print_step "10" "RESTART PM2"

ssh $VPS_HOST "pm2 restart $PM2_PROCESS --update-env 2>/dev/null || (cd $VPS_PATH/backend && pm2 start dist/main.js --name '$PM2_PROCESS' --update-env && pm2 save)"
if [ $? -ne 0 ]; then
    print_error "Restart PM2 fallito"
    exit 1
fi
print_success "PM2 riavviato: $PM2_PROCESS"

# ═══════════════════════════════════════════════════════════
# COMPLETATO
# ═══════════════════════════════════════════════════════════

DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ${BOLD}✓ DEPLOY COMPLETATO${NC}${GREEN}                                      ║${NC}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Versione:  ${BOLD}${APP_VERSION}${NC}${GREEN}                                        ║${NC}"
echo -e "${GREEN}║  Commit:    ${COMMIT_HASH}${GREEN}                                         ║${NC}"
echo -e "${GREEN}║  Bump:      ${BUMP_TYPE}${GREEN}                                         ║${NC}"
echo -e "${GREEN}║  URL:       ${PUBLIC_URL}${GREEN}              ║${NC}"
echo -e "${GREEN}║  Ora:       ${DEPLOY_TIME}${GREEN}                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verifica finale
print_info "Verifica:"
echo "  curl -s -o /dev/null -w '%{http_code}' $PUBLIC_URL"
echo "  ssh $VPS_HOST 'pm2 logs $PM2_PROCESS --lines 10 --nostream'"
