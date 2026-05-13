#!/usr/bin/env bash
set -euo pipefail

LOCAL_DIR="/home/m3kky/Projects/Physio-Flow"
REMOTE_HOST="hosty@192.168.1.11"
REMOTE_DIR="/home/hosty/PhysioFlow"
REMOTE_USER_HOME="/home/hosty"
SSH_KEY="${HOME}/.ssh/id_ed25519_beelink_openclaw"
SSH_OPTS=(-i "$SSH_KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=no)
STAMP="$(date +%Y%m%d-%H%M%S)"
BASE_URL="https://physio-flow.online"
APP_BACKUP_PATH="$REMOTE_USER_HOME/PhysioFlow-app-backup-$STAMP.tar.gz"
DB_BACKUP_PATH="$REMOTE_USER_HOME/physioflow.db.backup-$STAMP"

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

fail() {
  printf '\n[ERROR] %s\n' "$*" >&2
  printf 'Rollback app archive: %s\n' "$APP_BACKUP_PATH" >&2
  printf 'Rollback DB backup:   %s\n' "$DB_BACKUP_PATH" >&2
  exit 1
}

remote() {
  ssh "${SSH_OPTS[@]}" "$REMOTE_HOST" "$@"
}

require_local_file() {
  local path="$1"
  [ -f "$path" ] || fail "Fehlende Datei: $path"
}

trap 'fail "Deploy abgebrochen oder fehlgeschlagen."' ERR

log "0/8 Preflight checks"
require_local_file "$SSH_KEY"
require_local_file "$LOCAL_DIR/package.json"
require_local_file "$LOCAL_DIR/package-lock.json"
require_local_file "$LOCAL_DIR/ecosystem.config.cjs"
require_local_file "$LOCAL_DIR/.env"

grep -q '^PHYSIOFLOW_ADMIN_PASSWORD=' "$LOCAL_DIR/.env" || fail "PHYSIOFLOW_ADMIN_PASSWORD fehlt in .env"
grep -q '^SESSION_SECRET=' "$LOCAL_DIR/.env" || fail "SESSION_SECRET fehlt in .env"

if grep -Eq '^PHYSIOFLOW_ADMIN_PASSWORD=change-me-now$' "$LOCAL_DIR/.env"; then
  fail "PHYSIOFLOW_ADMIN_PASSWORD ist noch auf change-me-now gesetzt"
fi

if grep -Eq '^SESSION_SECRET=change-me-now-too$' "$LOCAL_DIR/.env"; then
  fail "SESSION_SECRET ist noch auf change-me-now-too gesetzt"
fi

log "1/8 Lokaler Build-Test"
(
  cd "$LOCAL_DIR"
  npm run build >/dev/null
)

log "2/8 Backup remote app + DB"
remote "mkdir -p $REMOTE_DIR/data && \
  tar -czf $APP_BACKUP_PATH -C $REMOTE_USER_HOME PhysioFlow && \
  if [ -f $REMOTE_DIR/data/physioflow.db ]; then cp $REMOTE_DIR/data/physioflow.db $DB_BACKUP_PATH; fi && \
  echo backup_done"

log "3/8 Sync code to Beelink"
rsync -a --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude '.env' \
  --exclude 'data/physioflow.db' \
  --exclude '.codex' \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=no" \
  "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

log "4/8 Install dependencies on Beelink"
remote "cd $REMOTE_DIR && npm ci"

log "5/8 Rebuild native modules + build frontend"
remote "cd $REMOTE_DIR && npm rebuild better-sqlite3 && npm run build"

log "6/8 Restart app via systemd"
remote "sudo systemctl restart physioflow"

log "7/8 Remote process check"
remote "systemctl --no-pager --full status physioflow | head -40"

log "8/8 HTTP smoke test"
HTTP_ROOT=""
HTTP_API=""
AUTH_ENABLED="unknown"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  HTTP_ROOT=$(curl -sk -o /dev/null -w '%{http_code}' "$BASE_URL/" || true)
  HTTP_API=$(curl -sk -o /tmp/physioflow-health.json -w '%{http_code}' "$BASE_URL/api/health" || true)
  if [ -f /tmp/physioflow-health.json ]; then
    AUTH_ENABLED=$(python3 - <<'PY'
import json
try:
    with open('/tmp/physioflow-health.json', 'r', encoding='utf-8') as f:
        payload = json.load(f)
    print(str(payload.get('data', {}).get('authEnabled', 'unknown')).lower())
except Exception:
    print('unknown')
PY
)
  fi
  if [ "$HTTP_ROOT" = "200" ] && [ "$HTTP_API" = "200" ]; then
    break
  fi
  sleep 2
done

printf '\nDeploy fertig.\n'
printf 'Remote app backup: %s\n' "$APP_BACKUP_PATH"
printf 'Remote DB backup:  %s\n' "$DB_BACKUP_PATH"
printf 'HTTP /            : %s\n' "$HTTP_ROOT"
printf 'HTTP /api/health   : %s\n' "$HTTP_API"
printf 'Auth aktiv         : %s\n' "$AUTH_ENABLED"

if [ "$HTTP_ROOT" != "200" ] || [ "$HTTP_API" != "200" ]; then
  fail "Smoke test failed"
fi

trap - ERR
echo "DEPLOY_OK"
