#!/usr/bin/env bash
# =========================================================================
# Strangler cutover driver: Django -> Rust, zero downtime, reversible.
#
# Flips nginx `proxy_pass` targets one phase-group at a time and reloads
# nginx, then (Phase 3) hands job scheduling from Django's Celery beat to
# the Rust in-process scheduler. Every phase has an inverse `rollback`.
#
# It edits frontend/nginx.conf in place. To make reloads INSTANT (no image
# rebuild), run `cutover.sh dev-mount` once first: it bind-mounts the conf
# into holy-frontend so `nginx -s reload` picks up edits live. Without that,
# each flip rebuilds the frontend image (slower, but still no API downtime).
#
# Usage:
#   scripts/cutover.sh status                 # show current routing + scheduler
#   scripts/cutover.sh phase0                 # build + start holy-rust (shadow)
#   scripts/cutover.sh phase1                 # flip reads
#   scripts/cutover.sh phase2                 # flip auth + writes
#   scripts/cutover.sh phase3                 # flip admin, hand off scheduler
#   scripts/cutover.sh phase4                 # flip catch-all (retire Django path)
#   scripts/cutover.sh rollback {1|2|3|4}     # undo a phase
#   scripts/cutover.sh smoke                  # hit holy-rust /health/ directly
#
# Invariant: exactly ONE scheduler owns api_job. Django beat owns it until
# phase3; Rust's ENABLE_SCHEDULER stays false until then. Never both.
# =========================================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONF="$REPO/frontend/nginx.conf"
ENVFILE="$REPO/.env"
DC="docker compose"

# Endpoint groups per phase (nginx location prefixes, sans trailing proxy line).
READS=(/api/categories/ /api/flavors/ /api/banners/)
WRITES=(/api/auth/ "= /api/token/" /api/ratings/ /api/replies/ /api/users/ /api/notifications/ /api/tickets/)
ADMIN=(/api/admin-custom/)
CATCHALL=(/api/schema /api/)

c_red()  { printf '\033[31m%s\033[0m\n' "$*"; }
c_grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
c_ylw()  { printf '\033[33m%s\033[0m\n' "$*"; }
die()    { c_red "ERROR: $*" >&2; exit 1; }

[ -f "$CONF" ] || die "nginx.conf not found at $CONF"

# Flip the upstream on the location line(s) for a given prefix.
# $1 = location token (e.g. /api/flavors/  or  '= /api/token/')
# $2 = target upstream (rust_backend | django_backend)
flip_one() {
  local loc="$1" target="$2"
  # Match: location <loc> { proxy_pass http://<anything>; ... }
  # Anchor on the exact location token to avoid hitting the catch-all /api/.
  local esc; esc="$(printf '%s' "$loc" | sed 's/[.[\*^$/]/\\&/g')"
  # The catch-all "/api/" lives on its own multi-line block; handle separately.
  if [ "$loc" = "/api/" ]; then
    # Flip only the catch-all block's proxy_pass (the one not on a one-liner).
    perl -0pi -e "s{(location /api/ \{\s*\n\s*proxy_pass http://)\w+;}{\${1}${target};}g" "$CONF"
    return
  fi
  sed -i -E "s|(location ${esc}[[:space:]]+\{[[:space:]]+proxy_pass http://)[a-z_]+;|\1${target};|" "$CONF"
}

flip_group() {
  local target="$1"; shift
  local g
  for g in "$@"; do flip_one "$g" "$target"; done
}

reload_nginx() {
  if $DC ps frontend --format '{{.Names}}' 2>/dev/null | grep -q holy-frontend \
     && docker inspect holy-frontend --format '{{range .Mounts}}{{.Destination}}{{"\n"}}{{end}}' 2>/dev/null \
        | grep -q '/etc/nginx/conf.d/default.conf'; then
    c_ylw "conf is bind-mounted -> live reload"
    docker exec holy-frontend nginx -t && docker exec holy-frontend nginx -s reload
  else
    c_ylw "conf baked into image -> rebuilding frontend (no API downtime)"
    $DC up -d --build frontend
  fi
}

set_env() { # set_env KEY value  (idempotent upsert in .env)
  local k="$1" v="$2"
  [ -f "$ENVFILE" ] || touch "$ENVFILE"
  if grep -qE "^${k}=" "$ENVFILE"; then
    sed -i -E "s|^${k}=.*|${k}=${v}|" "$ENVFILE"
  else
    printf '%s=%s\n' "$k" "$v" >> "$ENVFILE"
  fi
}

confirm() {
  read -r -p "$1 [y/N] " a; [ "$a" = y ] || [ "$a" = Y ] || die "aborted"
}

cmd_status() {
  c_grn "== nginx routing (frontend/nginx.conf) =="
  grep -E 'location (= )?/api/' "$CONF" | sed -E 's/\s*include.*//' \
    | sed -E 's/proxy_pass http:\/\/(rust_backend)/proxy_pass -> \x1b[32m\1\x1b[0m/; s/proxy_pass http:\/\/(django_backend)/proxy_pass -> \1/'
  echo
  c_grn "== scheduler ownership =="
  local rust_sched; rust_sched="$(grep -E '^RUST_ENABLE_SCHEDULER=' "$ENVFILE" 2>/dev/null | cut -d= -f2 || true)"
  echo "RUST_ENABLE_SCHEDULER=${rust_sched:-unset (=false)}"
  if $DC ps beat --format '{{.Names}} {{.State}}' 2>/dev/null | grep -q running; then
    echo "Django beat: RUNNING (Django owns api_job)"
  else
    echo "Django beat: stopped"
  fi
}

cmd_smoke() {
  c_grn "Hitting holy-rust /health/ directly (bypasses nginx)..."
  docker exec holy-frontend wget -qO- http://holy-rust:8001/health/ \
    || die "holy-rust not reachable — run phase0 first?"
  echo; c_grn "OK"
}

cmd_phase0() {
  grep -qE '^SECRET_KEY=.+' "$ENVFILE" 2>/dev/null \
    || die "SECRET_KEY must be set in .env to the SAME value Django uses (JWTs break otherwise)"
  c_grn "Phase 0: building + starting holy-rust in shadow (no traffic)..."
  $DC up -d --build backend-rs
  c_ylw "Wait for healthy, then: scripts/cutover.sh smoke"
}

cmd_phase1() { c_grn "Phase 1: flip READS -> rust"; flip_group rust_backend "${READS[@]}"; reload_nginx; cmd_status; }
cmd_phase2() { c_grn "Phase 2: flip AUTH+WRITES -> rust"; flip_group rust_backend "${WRITES[@]}"; reload_nginx; cmd_status; }

cmd_phase3() {
  c_grn "Phase 3: flip ADMIN -> rust, then hand off scheduler"
  flip_group rust_backend "${ADMIN[@]}"; reload_nginx
  c_ylw "About to STOP Django beat/worker/flower and ENABLE Rust scheduler."
  c_ylw "This transfers api_job ownership. Ensure no job is mid-run."
  confirm "Proceed with scheduler handover?"
  $DC stop beat worker flower
  set_env RUST_ENABLE_SCHEDULER true
  $DC up -d backend-rs
  c_grn "Done. Check: docker logs holy-rust | grep 'job scheduler ENABLED'"
  cmd_status
}

cmd_phase4() {
  c_grn "Phase 4: flip CATCH-ALL /api/ + /api/schema -> rust (Django serves only /admin/ + /static/)"
  flip_group rust_backend "${CATCHALL[@]}"; reload_nginx
  c_ylw "Django now handles only its admin site. To drop it entirely:"
  c_ylw "  $DC stop backend ; then remove /admin/ + /static/ locations from nginx.conf"
  c_ylw "  $DC stop redis    # only a Celery broker + Django cache; Rust uses neither"
  cmd_status
}

cmd_rollback() {
  local p="${1:-}"
  case "$p" in
    1) c_grn "Rollback Phase 1"; flip_group django_backend "${READS[@]}"; reload_nginx ;;
    2) c_grn "Rollback Phase 2"; flip_group django_backend "${WRITES[@]}"; reload_nginx ;;
    3) c_grn "Rollback Phase 3: scheduler back to Django, admin back to Django"
       set_env RUST_ENABLE_SCHEDULER false
       $DC up -d backend-rs
       $DC start beat worker flower
       flip_group django_backend "${ADMIN[@]}"; reload_nginx ;;
    4) c_grn "Rollback Phase 4"; flip_group django_backend "${CATCHALL[@]}"; reload_nginx ;;
    *) die "usage: cutover.sh rollback {1|2|3|4}" ;;
  esac
  cmd_status
}

cmd_dev_mount() {
  c_ylw "Add this under the 'frontend' service volumes in docker-compose.yml for live reloads:"
  echo '      - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf'
  echo '      - ./frontend/proxy_params.conf:/etc/nginx/proxy_params.conf'
  c_ylw "Then: $DC up -d frontend"
}

case "${1:-}" in
  status)    cmd_status ;;
  smoke)     cmd_smoke ;;
  phase0)    cmd_phase0 ;;
  phase1)    cmd_phase1 ;;
  phase2)    cmd_phase2 ;;
  phase3)    cmd_phase3 ;;
  phase4)    cmd_phase4 ;;
  rollback)  cmd_rollback "${2:-}" ;;
  dev-mount) cmd_dev_mount ;;
  *) cat <<EOF
Strangler cutover driver. Phases are reversible; data never forks (shared DB).

  status              show routing + scheduler ownership
  smoke               curl holy-rust /health/ directly
  phase0              build + start holy-rust (shadow, no traffic)
  phase1              flip reads      (categories, flavors, banners)
  phase2              flip auth+writes (auth, token, ratings, replies, users, notifications, tickets)
  phase3              flip admin + hand scheduler Django->Rust  (CAREFUL)
  phase4              flip catch-all /api/  (Django -> only /admin/ + /static/)
  rollback {1|2|3|4}  undo a phase
  dev-mount           print compose lines for live nginx reloads

See MIGRATION.md for the full runbook.
EOF
  ;;
esac
