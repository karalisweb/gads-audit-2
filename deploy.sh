#!/bin/bash

#############################################################
#  KW GADS Audit - Deploy Script
#  Versione: 2.12.0
#
#  Step: 1.Version → 2.TechDocs → 3.Changelog → 4.GuidaUtente
#        → 5.Git → 6.VPS Pull → 7.Build → 8.PM2 → 9.Health
#
#  Uso:
#    ./deploy.sh "feat: descrizione"
#    ./deploy.sh --bump minor "feat: descrizione"
#    ./deploy.sh --bump major "feat: descrizione"
#    ./deploy.sh --dry-run "feat: descrizione"
#############################################################

set -e

# ═══════════════════════════════════════════════════════════
# CONFIGURAZIONE
# ═══════════════════════════════════════════════════════════

APP_NAME="KW GADS Audit"
APP_VERSION="2.13.3"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VPS_HOST="root@185.192.97.108"
VPS_PATH="/var/www/gads-audit-2"
BRANCH="main"
PM2_PROCESS="gads-audit"
PUBLIC_URL="https://gads.karalisdemo.it"

DEPLOY_START=$(date +%s)

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

print_step()    { echo -e "\n${BLUE}[$1/$TOTAL_STEPS] $2${NC}"; }
print_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
print_error()   { echo -e "${RED}  ✗ $1${NC}"; }
print_info()    { echo -e "${YELLOW}  → $1${NC}"; }
print_warn()    { echo -e "${YELLOW}  ⚠ $1${NC}"; }
print_dry()     { echo -e "${MAGENTA}  [DRY] $1${NC}"; }

do_sed() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$1" "$2"
    else
        sed -i "$1" "$2"
    fi
}

get_italian_date() {
    local day=$(date '+%-d')
    local month_num=$(date '+%-m')
    local year=$(date '+%Y')
    local months=("" "Gennaio" "Febbraio" "Marzo" "Aprile" "Maggio" "Giugno" "Luglio" "Agosto" "Settembre" "Ottobre" "Novembre" "Dicembre")
    echo "$day ${months[$month_num]} $year"
}

get_iso_date() { date '+%Y-%m-%d'; }

# ═══════════════════════════════════════════════════════════
# PARSING ARGOMENTI
# ═══════════════════════════════════════════════════════════

BUMP_TYPE="patch"
COMMIT_MSG=""
DRY_RUN=false
NO_TAG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --major) BUMP_TYPE="major"; shift ;;
        --minor) BUMP_TYPE="minor"; shift ;;
        --patch) BUMP_TYPE="patch"; shift ;;
        --bump)
            BUMP_TYPE="$2"
            if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
                print_error "Tipo bump non valido: $BUMP_TYPE (usa: patch, minor, major)"
                exit 1
            fi
            shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --no-tag) NO_TAG=true; shift ;;
        --help|-h)
            echo "Uso: ./deploy.sh [--bump patch|minor|major] [--dry-run] [--no-tag] \"commit message\""
            exit 0 ;;
        *)
            if [ -z "$COMMIT_MSG" ]; then COMMIT_MSG="$1"; fi
            shift ;;
    esac
done

if [ -z "$COMMIT_MSG" ]; then
    print_error "Uso: ./deploy.sh \"commit message\""
    exit 1
fi

# ═══════════════════════════════════════════════════════════
# CALCOLO VERSIONE
# ═══════════════════════════════════════════════════════════

OLD_VERSION="$APP_VERSION"
IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$APP_VERSION"

case $BUMP_TYPE in
    major) V_MAJOR=$((V_MAJOR + 1)); V_MINOR=0; V_PATCH=0 ;;
    minor) V_MINOR=$((V_MINOR + 1)); V_PATCH=0 ;;
    patch) V_PATCH=$((V_PATCH + 1)) ;;
esac

NEW_VERSION="${V_MAJOR}.${V_MINOR}.${V_PATCH}"
TODAY_ISO=$(get_iso_date)
TODAY_IT=$(get_italian_date)
TOTAL_STEPS=9
PREV_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "n/a")

# Release name dal commit message (rimuovi prefisso tipo feat:/fix:)
CLEAN_MSG=$(echo "$COMMIT_MSG" | sed 's/^[a-z]*([^)]*): *//' | sed 's/^[a-z]*: *//')
CLEAN_MSG="$(echo "${CLEAN_MSG:0:1}" | tr '[:lower:]' '[:upper:]')${CLEAN_MSG:1}"

# Sezione changelog dal prefisso
SECTION="Modificato"
case "$COMMIT_MSG" in
    feat:*|feat\(*) SECTION="Aggiunto" ;;
    fix:*|fix\(*)   SECTION="Corretto" ;;
    refactor:*|refactor\(*) SECTION="Modificato" ;;
    docs:*|docs\(*) SECTION="Documentazione" ;;
esac

# ═══════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════

echo ""
echo -e "${CYAN}${BOLD}$APP_NAME${NC} - Deploy"
echo -e "  ${OLD_VERSION} → ${GREEN}${NEW_VERSION}${NC} (${BUMP_TYPE}) | ${COMMIT_MSG}"
if $DRY_RUN; then echo -e "  ${MAGENTA}DRY-RUN${NC}"; fi
echo ""

# ═══════════════════════════════════════════════════════════
# 1. VERSION BUMP
# ═══════════════════════════════════════════════════════════

print_step "1" "Version bump"

if $DRY_RUN; then
    print_dry "Bump ${OLD_VERSION} → ${NEW_VERSION} in tutti i file"
else
    # frontend/package.json
    do_sed "s/\"version\": \"${OLD_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "${SCRIPT_DIR}/frontend/package.json"
    # backend/package.json
    do_sed "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"${NEW_VERSION}\"/" "${SCRIPT_DIR}/backend/package.json"
    # deploy.sh
    do_sed "s/APP_VERSION=\"${OLD_VERSION}\"/APP_VERSION=\"${NEW_VERSION}\"/" "${SCRIPT_DIR}/deploy.sh"
    # DEPLOY.md
    [ -f "${SCRIPT_DIR}/DEPLOY.md" ] && do_sed "s/Versione attuale: \*\*${OLD_VERSION}\*\*/Versione attuale: \*\*${NEW_VERSION}\*\*/" "${SCRIPT_DIR}/DEPLOY.md"
    # Sidebar.tsx
    do_sed "s/const APP_VERSION = '${OLD_VERSION}'/const APP_VERSION = '${NEW_VERSION}'/" "${SCRIPT_DIR}/frontend/src/components/Layout/Sidebar.tsx"
    # LoginPage.tsx
    do_sed "s/v${OLD_VERSION}/v${NEW_VERSION}/" "${SCRIPT_DIR}/frontend/src/pages/auth/LoginPage.tsx"
    print_success "Bump completato in tutti i file"
fi

APP_VERSION="$NEW_VERSION"

# ═══════════════════════════════════════════════════════════
# 2. TECHNICAL DOCS
# ═══════════════════════════════════════════════════════════

print_step "2" "Technical docs"

TECH_CL="${SCRIPT_DIR}/docs/TECHNICAL-CHANGELOG.md"

if $DRY_RUN; then
    print_dry "Entry: | ${NEW_VERSION} | ${TODAY_ISO} | ${COMMIT_MSG} |"
else
    if [ -f "$TECH_CL" ]; then
        TECH_ROW="| ${NEW_VERSION} | ${TODAY_ISO} | ${COMMIT_MSG} |"
        TEMP_TECH="${TECH_CL}.tmp"
        awk -v row="$TECH_ROW" '
            /^\|----------\|/ && !found {
                print
                print row
                found=1
                next
            }
            { print }
        ' "$TECH_CL" > "$TEMP_TECH"
        mv "$TEMP_TECH" "$TECH_CL"
    else
        printf "# Technical Changelog - KW GADS Audit\n\nLog tecnico delle modifiche al software, auto-generato dal deploy script.\n\n---\n\n| Versione | Data | Commit |\n|----------|------|--------|\n| ${NEW_VERSION} | ${TODAY_ISO} | ${COMMIT_MSG} |\n\n---\n\n*Auto-generato da deploy.sh*\n" > "$TECH_CL"
    fi
    print_success "Technical changelog: ${NEW_VERSION}"
fi

# ═══════════════════════════════════════════════════════════
# 3. CHANGELOG
# ═══════════════════════════════════════════════════════════

print_step "3" "Changelog"

if $DRY_RUN; then
    print_dry "Entry [${NEW_VERSION}] - ${SECTION}: ${CLEAN_MSG}"
else
    CHANGELOG_ENTRY="## [${NEW_VERSION}] - ${TODAY_ISO}\n\n### ${SECTION}\n- ${CLEAN_MSG}\n\n---"

    if [ -f "${SCRIPT_DIR}/CHANGELOG.md" ]; then
        TEMP_CL="${SCRIPT_DIR}/CHANGELOG.md.tmp"
        awk -v entry="$CHANGELOG_ENTRY" '
            /^---$/ && !found {
                print
                print ""
                printf "%s\n", entry
                print ""
                found=1
                next
            }
            { print }
        ' "${SCRIPT_DIR}/CHANGELOG.md" > "$TEMP_CL"
        mv "$TEMP_CL" "${SCRIPT_DIR}/CHANGELOG.md"
    else
        printf "# Changelog - KW GADS Audit\n\n---\n\n${CHANGELOG_ENTRY}\n\n*Ultimo aggiornamento: ${TODAY_ISO}*\n" > "${SCRIPT_DIR}/CHANGELOG.md"
    fi
    print_success "[${NEW_VERSION}] ${SECTION}: ${CLEAN_MSG}"
fi

# ═══════════════════════════════════════════════════════════
# 4. GUIDA UTENTE + DOCS FOOTER
# ═══════════════════════════════════════════════════════════

print_step "4" "Guida Utente + docs footer"

if ! $DRY_RUN; then
    # Auto-append alla tabella Cronologia Aggiornamenti in GUIDA-UTENTE.md
    GUIDA="${SCRIPT_DIR}/docs/GUIDA-UTENTE.md"
    if [ -f "$GUIDA" ] && grep -q "Cronologia Aggiornamenti" "$GUIDA"; then
        GUIDA_ROW="| ${NEW_VERSION} | ${TODAY_IT} | ${CLEAN_MSG} |"
        TEMP_GUIDA="${GUIDA}.tmp"
        awk -v row="$GUIDA_ROW" '
            /^\|----------\|/ && !found {
                print
                print row
                found=1
                next
            }
            { print }
        ' "$GUIDA" > "$TEMP_GUIDA"
        mv "$TEMP_GUIDA" "$GUIDA"
        print_success "Cronologia aggiornamenti: ${NEW_VERSION}"
    fi

    # Footer versione GUIDA-UTENTE.md
    [ -f "$GUIDA" ] && \
        do_sed "s/\*Ultimo aggiornamento: .* | Versione app: .*\*/*Ultimo aggiornamento: ${TODAY_IT} | Versione app: ${NEW_VERSION}*/" "$GUIDA"

    # INFRASTRUCTURE.md
    [ -f "${SCRIPT_DIR}/docs/INFRASTRUCTURE.md" ] && grep -q "Ultimo aggiornamento" "${SCRIPT_DIR}/docs/INFRASTRUCTURE.md" && \
        do_sed "s/\*\*Ultimo aggiornamento\*\*: .* (v[0-9]*\.[0-9]*\.[0-9]*)/**Ultimo aggiornamento**: ${TODAY_IT} (v${NEW_VERSION})/" "${SCRIPT_DIR}/docs/INFRASTRUCTURE.md"

    # Altri docs (esclusi quelli gestiti sopra)
    for doc_file in "${SCRIPT_DIR}"/docs/*.md; do
        [ -f "$doc_file" ] || continue
        basename_doc=$(basename "$doc_file")
        [[ "$basename_doc" == "GUIDA-UTENTE.md" || "$basename_doc" == "INFRASTRUCTURE.md" || "$basename_doc" == "TECHNICAL-CHANGELOG.md" ]] && continue
        grep -q "Ultimo aggiornamento.*v[0-9]" "$doc_file" && \
            do_sed "s/\*\*Ultimo aggiornamento\*\*: .* (v[0-9]*\.[0-9]*\.[0-9]*)/**Ultimo aggiornamento**: ${TODAY_IT} (v${NEW_VERSION})/" "$doc_file"
    done
    print_success "Docs aggiornati"
else
    print_dry "Guida utente + footer docs → v${NEW_VERSION}"
fi

# ═══════════════════════════════════════════════════════════
# 5. GIT (commit + tag + push)
# ═══════════════════════════════════════════════════════════

print_step "5" "Git commit + push"

cd "${SCRIPT_DIR}"
BRANCH_CURRENT=$(git branch --show-current)
if [ "$BRANCH_CURRENT" != "$BRANCH" ]; then
    print_error "Branch '$BRANCH_CURRENT' != '$BRANCH'"
    exit 1
fi

FULL_COMMIT_MSG="v${NEW_VERSION}: ${COMMIT_MSG}"

if $DRY_RUN; then
    print_dry "git commit -m \"${FULL_COMMIT_MSG}\" && git push"
else
    git add .
    git commit -m "$FULL_COMMIT_MSG" || print_warn "Niente da committare"
    COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "n/a")
    print_success "Commit: ${FULL_COMMIT_MSG} (${COMMIT_HASH})"

    if ! $NO_TAG; then
        TAG_NAME="v${NEW_VERSION}"
        if ! git tag -l | grep -q "^${TAG_NAME}$"; then
            git tag -a "${TAG_NAME}" -m "Release ${NEW_VERSION}"
            print_success "Tag ${TAG_NAME}"
        fi
    fi

    git push origin $BRANCH
    ! $NO_TAG && git push origin --tags
    print_success "Push completato"
fi

# ═══════════════════════════════════════════════════════════
# 6. VPS: PULL + INSTALL
# ═══════════════════════════════════════════════════════════

print_step "6" "VPS pull + install"

if $DRY_RUN; then
    print_dry "ssh → git pull && npm install"
else
    ssh $VPS_HOST "cd $VPS_PATH && git pull origin $BRANCH && cd frontend && npm install && cd ../backend && npm install"
    print_success "Pull e install completati"
fi

# ═══════════════════════════════════════════════════════════
# 7. VPS: BUILD
# ═══════════════════════════════════════════════════════════

print_step "7" "VPS build"

if $DRY_RUN; then
    print_dry "ssh → build frontend + backend + migrazioni"
else
    ssh $VPS_HOST "cd $VPS_PATH/frontend && npm run build && cp -r dist/* $VPS_PATH/public/"
    print_success "Frontend build"
    ssh $VPS_HOST "cd $VPS_PATH/backend && npm run build"
    print_success "Backend build"
    ssh $VPS_HOST "cd $VPS_PATH/backend && npm run migration:run" 2>&1 || true
    print_success "Migrazioni"
fi

# ═══════════════════════════════════════════════════════════
# 8. VPS: RESTART PM2
# ═══════════════════════════════════════════════════════════

print_step "8" "PM2 restart"

if $DRY_RUN; then
    print_dry "ssh → pm2 restart ${PM2_PROCESS}"
else
    ssh $VPS_HOST "pm2 restart $PM2_PROCESS --update-env 2>/dev/null || (cd $VPS_PATH/backend && pm2 start dist/main.js --name '$PM2_PROCESS' --update-env && pm2 save)"
    print_success "PM2 riavviato"
fi

# ═══════════════════════════════════════════════════════════
# 9. HEALTH CHECK
# ═══════════════════════════════════════════════════════════

print_step "9" "Health check"

if $DRY_RUN; then
    print_dry "curl ${PUBLIC_URL}"
else
    sleep 5
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$PUBLIC_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        print_success "HTTP ${HTTP_CODE}"
    else
        print_warn "HTTP ${HTTP_CODE} - verificare manualmente"
    fi
fi

# ═══════════════════════════════════════════════════════════
# RIEPILOGO
# ═══════════════════════════════════════════════════════════

DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))

echo ""
echo -e "${GREEN}${BOLD}Deploy completato${NC} - v${NEW_VERSION} (${DEPLOY_DURATION}s)"
echo -e "  ${PUBLIC_URL}"
if ! $DRY_RUN; then
    echo -e "  ${YELLOW}Rollback:${NC} git revert ${PREV_HASH}..HEAD"
    echo -e "  ${YELLOW}Logs:${NC}     ssh ${VPS_HOST} 'pm2 logs ${PM2_PROCESS} --lines 20 --nostream'"
fi
echo ""
