#!/bin/bash

# Get the root directory of the project
ROOT_DIR=$(git rev-parse --show-toplevel)

echo "========================================"
echo "   Running Pre-Push Integrity Checks    "
echo "========================================"

# 1. Frontend Formatting & Build
echo ""
echo "Step 1: Checking Frontend Formatting..."
cd "$ROOT_DIR/frontend"
if ! npm run format:check; then
    echo ""
    echo "❌ ERROR: Frontend formatting issues found. Run 'npm run format' in frontend/."
    exit 1
fi

echo ""
echo "Step 2: Checking Frontend Build..."
if ! npm run build; then
    echo ""
    echo "❌ ERROR: Frontend build failed."
    echo "   Please fix build errors before pushing."
    exit 1
fi

# 2. Rust backend checks
echo ""
echo "Step 3: Checking Rust backend..."
cd "$ROOT_DIR/backend-rs"

if ! cargo fmt --check; then
    echo ""
    echo "❌ ERROR: Rust formatting issues. Run 'cargo fmt' in backend-rs/."
    exit 1
fi

if ! cargo check --locked; then
    echo ""
    echo "❌ ERROR: Rust backend does not compile."
    exit 1
fi

echo ""
echo "✅ All checks passed! Proceeding with push..."
echo "========================================"
exit 0
