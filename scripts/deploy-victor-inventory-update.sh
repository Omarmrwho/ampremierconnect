#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/.openclaw/workspace/ampremierconnect"
LOG_DIR="/root/.openclaw/workspace/logs"
LOG_FILE="$LOG_DIR/victor-inventory-deploy.log"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

{
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] starting Victor inventory sync"
  npm run sync:victor-inventory

  if git diff --quiet -- data/victor-generator-inventory.json; then
    echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] no inventory data changes"
    exit 0
  fi

  git add data/victor-generator-inventory.json
  git commit -m "Update Victor generator inventory"
  git push origin main
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] pushed inventory update"
} >> "$LOG_FILE" 2>&1
