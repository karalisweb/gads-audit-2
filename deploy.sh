#!/bin/bash

#############################################################
#  KW GADS Audit - Deploy Script
#  Versione: 2.7.0
#
#  App:     KW GADS Audit
#  URL:     https://gads.karalisdemo.it
#  Server:  185.192.97.108 (Contabo VPS)
#  Path:    /var/www/gads-audit-2
#  PM2:     gads-audit
#  Stack:   React + Vite | NestJS | PostgreSQL | Redis
#  Porta:   3001
#############################################################

# ═══════════════════════════════════════════════════════════
# CONFIGURAZIONE
# ═══════════════════════════════════════════════════════════

APP_NAME="KW GADS Audit"
APP_VERSION="2.7.0"
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
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════
# FUNZIONI
# ═══════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║  ${YELLOW}$APP_NAME${CYAN} - Deploy v${APP_VERSION}           ║${NC}"
    echo -e "${CYAN}║  ${NC}$PUBLIC_URL${CYAN}                       ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "\n${BLUE}━━━ STEP $1: $2 ━━━${NC}\n"
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

# ═══════════════════════════════════════════════════════════
# VERSIONING (--bump)
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
    print_info "Aggiornamento versione: ${current} → ${new_version}"

    # Aggiorna frontend/package.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"${current}\"/\"version\": \"${new_version}\"/" frontend/package.json
    else
        sed -i "s/\"version\": \"${current}\"/\"version\": \"${new_version}\"/" frontend/package.json
    fi
    print_success "frontend/package.json aggiornato"

    # Aggiorna deploy.sh
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/APP_VERSION=\"${current}\"/APP_VERSION=\"${new_version}\"/" deploy.sh
        sed -i '' "s/Versione: ${current}/Versione: ${new_version}/" deploy.sh
    else
        sed -i "s/APP_VERSION=\"${current}\"/APP_VERSION=\"${new_version}\"/" deploy.sh
        sed -i "s/Versione: ${current}/Versione: ${new_version}/" deploy.sh
    fi
    print_success "deploy.sh aggiornato"

    # Aggiorna DEPLOY.md
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/Versione attuale: \*\*${current}\*\*/Versione attuale: \*\*${new_version}\*\*/" DEPLOY.md
    else
        sed -i "s/Versione attuale: \*\*${current}\*\*/Versione attuale: \*\*${new_version}\*\*/" DEPLOY.md
    fi
    print_success "DEPLOY.md aggiornato"

    # Aggiorna Sidebar.tsx (APP_VERSION)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/const APP_VERSION = '${current}'/const APP_VERSION = '${new_version}'/" frontend/src/components/Layout/Sidebar.tsx
    else
        sed -i "s/const APP_VERSION = '${current}'/const APP_VERSION = '${new_version}'/" frontend/src/components/Layout/Sidebar.tsx
    fi
    print_success "Sidebar.tsx aggiornato"

    # Aggiorna LoginPage.tsx (footer versione)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/v${current}/v${new_version}/" frontend/src/pages/auth/LoginPage.tsx
    else
        sed -i "s/v${current}/v${new_version}/" frontend/src/pages/auth/LoginPage.tsx
    fi
    print_success "LoginPage.tsx aggiornato"

    APP_VERSION=$new_version
}

# ═══════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════

print_header

# Parse argomenti
BUMP_TYPE=""
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --bump)
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
    print_error "Uso: ./deploy.sh [--bump patch|minor|major] \"messaggio commit\""
    exit 1
fi

# ═══════════════════════════════════════════════════════════
# STEP 0: Versioning (opzionale)
# ═══════════════════════════════════════════════════════════

if [ -n "$BUMP_TYPE" ]; then
    print_step "0" "VERSIONING"
    bump_version "$BUMP_TYPE"
fi

# ═══════════════════════════════════════════════════════════
# STEP 1: Verifica Git
# ═══════════════════════════════════════════════════════════

print_step "1" "VERIFICA GIT"

if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    if [ -n "$BUMP_TYPE" ]; then
        print_info "Solo modifiche di versioning, procedo..."
    else
        print_error "Nessuna modifica da committare"
        exit 1
    fi
fi

BRANCH_CURRENT=$(git branch --show-current)
if [ "$BRANCH_CURRENT" != "$BRANCH" ]; then
    print_error "Sei sul branch '$BRANCH_CURRENT', devi essere su '$BRANCH'"
    exit 1
fi
print_success "Branch: $BRANCH"

# ═══════════════════════════════════════════════════════════
# STEP 2: Commit
# ═══════════════════════════════════════════════════════════

print_step "2" "COMMIT"

git add .
git commit -m "$COMMIT_MSG"
if [ $? -ne 0 ]; then
    print_error "Commit fallito"
    exit 1
fi
print_success "Commit: $COMMIT_MSG"

# ═══════════════════════════════════════════════════════════
# STEP 3: Push
# ═══════════════════════════════════════════════════════════

print_step "3" "PUSH"

git push origin $BRANCH
if [ $? -ne 0 ]; then
    print_error "Push fallito"
    exit 1
fi
print_success "Push completato su origin/$BRANCH"

# ═══════════════════════════════════════════════════════════
# STEP 4: Pull + Install sul VPS
# ═══════════════════════════════════════════════════════════

print_step "4" "PULL + INSTALL (VPS)"

ssh $VPS_HOST "cd $VPS_PATH && git pull origin $BRANCH && cd frontend && npm install && cd ../backend && npm install"
if [ $? -ne 0 ]; then
    print_error "Pull/Install fallito sul VPS"
    exit 1
fi
print_success "Pull e npm install completati"

# ═══════════════════════════════════════════════════════════
# STEP 5: Build Frontend
# ═══════════════════════════════════════════════════════════

print_step "5" "BUILD FRONTEND (VPS)"

ssh $VPS_HOST "cd $VPS_PATH/frontend && npm run build && cp -r dist/* $VPS_PATH/public/"
if [ $? -ne 0 ]; then
    print_error "Build frontend fallita"
    exit 1
fi
print_success "Frontend build completata"

# ═══════════════════════════════════════════════════════════
# STEP 6: Build Backend
# ═══════════════════════════════════════════════════════════

print_step "6" "BUILD BACKEND (VPS)"

ssh $VPS_HOST "cd $VPS_PATH/backend && npm run build"
if [ $? -ne 0 ]; then
    print_error "Build backend fallita"
    exit 1
fi
print_success "Backend build completata"

# ═══════════════════════════════════════════════════════════
# STEP 7: Restart PM2
# ═══════════════════════════════════════════════════════════

print_step "7" "RESTART PM2"

ssh $VPS_HOST "pm2 restart $PM2_PROCESS --update-env 2>/dev/null || cd $VPS_PATH/backend && pm2 start dist/main.js --name '$PM2_PROCESS' && pm2 save"
if [ $? -ne 0 ]; then
    print_error "Restart PM2 fallito"
    exit 1
fi
print_success "PM2 riavviato: $PM2_PROCESS"

# ═══════════════════════════════════════════════════════════
# COMPLETATO
# ═══════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ DEPLOY COMPLETATO                             ║${NC}"
echo -e "${GREEN}║  Versione: ${APP_VERSION}                                ║${NC}"
echo -e "${GREEN}║  URL: ${PUBLIC_URL}              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Verifica finale
print_info "Verifica logs: ssh $VPS_HOST 'pm2 logs $PM2_PROCESS --lines 10 --nostream'"
