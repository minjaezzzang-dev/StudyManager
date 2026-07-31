#!/usr/bin/env bash
# Deploy EasyKR to Render (Blueprint or CLI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RENDER="${RENDER_CLI:-render}"
if ! command -v "$RENDER" >/dev/null 2>&1; then
  if [[ -x "$HOME/.local/bin/render" ]]; then
    RENDER="$HOME/.local/bin/render"
  else
    echo "Install Render CLI: curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | bash"
    exit 1
  fi
fi

if ! "$RENDER" whoami >/dev/null 2>&1; then
  echo "Run once: $RENDER login"
  exit 1
fi

echo "Launching / updating Blueprint from render.yaml..."
"$RENDER" blueprint launch render.yaml --confirm

echo ""
echo "Set these secrets in Render Dashboard (easykr-backend):"
echo "  OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET"
echo "Optional: NVIDIA_API_KEY"
echo ""
echo "After deploy:"
echo "  Backend:  https://easykr-backend.onrender.com/health"
echo "  Web:      https://easykr-frontend.onrender.com"
echo "  Mobile:   https://easykr-mobile-web.onrender.com"
