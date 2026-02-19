#!/bin/bash

# Get the root directory of the project
ROOT_DIR=$(git rev-parse --show-toplevel)

# Set environment variables for non-interactive backend checks
export SECRET_KEY="pre-push-check-key"
export DEBUG="false"
export ALLOWED_HOSTS="localhost"

echo "========================================"
echo "   Running Pre-Push Integrity Checks    "
echo "========================================"

# 1. Frontend Build
echo ""
echo "Step 1: Checking Frontend Build..."
cd "$ROOT_DIR/frontend"
if ! npm run build; then
    echo ""
    echo "❌ ERROR: Frontend build failed."
    echo "   Please fix build errors before pushing."
    exit 1
fi

# 2. Backend Check
echo ""
echo "Step 2: Checking Backend Integrity..."
cd "$ROOT_DIR/backend"

# Detect python executable (prefer venv if exists)
if [ -f "venv/bin/python" ]; then
    PYTHON_EXEC="venv/bin/python"
elif command -v python3 &>/dev/null; then
    PYTHON_EXEC="python3"
else
    PYTHON_EXEC="python"
fi

# Check for missing migrations
if ! $PYTHON_EXEC manage.py makemigrations --check --dry-run &>/dev/null; then
    echo ""
    echo "❌ ERROR: Missing migrations detected."
    echo "   Please run 'python manage.py makemigrations' locally."
    exit 1
fi

# Run Django system checks
if ! $PYTHON_EXEC manage.py check; then
    echo ""
    echo "❌ ERROR: Django system check failed."
    exit 1
fi

echo ""
echo "✅ All checks passed! Proceeding with push..."
echo "========================================"
exit 0
