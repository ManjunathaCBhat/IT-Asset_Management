#!/bin/sh

echo "--- container startup ---"
echo "PORT=${PORT:-8080}"
echo "PWD=$(pwd)"
echo "Listing /app dir:"
ls -la /app || true

echo "Environment vars (filtered):"
env | grep -E 'PORT|MONGO|API_BASE|JWT|SMTP' || true

echo "Starting uvicorn on port ${PORT:-8080}"

exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
