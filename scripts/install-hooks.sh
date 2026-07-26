#!/bin/bash

# Get the root directory
ROOT_DIR=$(git rev-parse --show-toplevel)

# Path to the hook script
HOOK_SRC="$ROOT_DIR/scripts/pre-push.sh"
HOOK_DEST="$ROOT_DIR/.git/hooks/pre-push"

# Make the source script executable
chmod +x "$HOOK_SRC"

# Copy/Link to git hooks
cp "$HOOK_SRC" "$HOOK_DEST"
chmod +x "$HOOK_DEST"

echo "✅ Pre-push hook installed successfully!"
echo "It will now run frontend builds and backend checks automatically before every 'git push'."
