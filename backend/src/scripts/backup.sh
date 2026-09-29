#!/usr/bin/env bash
set -euo pipefail

# Backup cifrado do PostgreSQL. Requer pg_dump e gpg.
# Uso: BACKUP_GPG_RECIPIENT=seu@email npm run backup --workspace backend

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/alerta-segura-$STAMP.sql"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL nao definida" >&2
  exit 1
fi

pg_dump "$DATABASE_URL" > "$FILE"

if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
  gpg --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "$FILE.gpg" "$FILE"
  echo "Backup cifrado em $FILE.gpg"
else
  echo "Backup em texto em $FILE (defina BACKUP_GPG_RECIPIENT para cifrar)"
fi
