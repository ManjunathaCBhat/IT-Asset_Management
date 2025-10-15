#!/bin/sh
# Entrypoint for container: print a few debug values and exec uvicorn bound to $PORT
set -e

echo "Starting container entrypoint..."
echo "PWD: $(pwd)"
echo "User: $(whoami 2>/dev/null || true)"
echo "ENV PORT='${PORT:-8000}'"
echo "Listing /app contents:"
ls -la || true

# Use ${PORT:-8080} as fallback—Cloud Run sets PORT at runtime
PORT_TO_USE="${PORT:-8000}"

echo "Launching uvicorn on 0.0.0.0:${PORT_TO_USE} (reload disabled)"

# Exec so uvicorn becomes PID 1 (good for signal handling)
exec uvicorn main:app --host 0.0.0.0 --port ${PORT_TO_USE} --log-level info
