#!/usr/bin/env bash
# ============================================================
# 履歴書メーカー (Rirekisho Maker) - Launch Script
# ============================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Check if .venv exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    if command -v uv &> /dev/null; then
        uv venv .venv
        uv pip install -r requirements.txt --python .venv
    else
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements.txt
    fi
fi

echo "============================================================"
echo "  履歴書メーカー / Rirekisho CV Generator"
echo "  Starting server at http://localhost:5000"
echo "  Press Ctrl+C to stop the server"
echo "============================================================"

exec .venv/bin/python app.py
