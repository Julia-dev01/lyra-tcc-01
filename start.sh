#!/bin/bash
set -euo pipefail

# Sobe API e frontend (o preview expoe a porta do Vite, que faz proxy de /api).
cd "$(dirname "$0")"
npm run dev
