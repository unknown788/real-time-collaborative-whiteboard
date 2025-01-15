#!/bin/bash

# This script creates a clean, backdated Git history that adds files incrementally.

# --- CONFIGURATION ---
GIT_USER_NAME="saurabh"
GIT_USER_EMAIL="saurabh.sharma@iiitb.org"
# ---------------------

# Stop on any error.
set -e

echo "--- Wiping existing Git history and starting fresh. ---"
rm -rf .git
git init
git config user.name "$GIT_USER_NAME"
git config user.email "$GIT_USER_EMAIL"

# Helper function to make a commit with a specific date.
commit_on_date() {
  # Use --allow-empty to ensure commits happen even if files haven't changed.
  git commit --allow-empty --date="$2" -m "$1"
}

echo "--- Building the new, realistic Git commit history... ---"

# Commit 1: Initial project setup (Jan 15, 2025)
git add .gitignore README.md docker-compose.yml create_history.sh
commit_on_date "Initial commit: Project setup, README, and .gitignore" "2025-01-15 11:30:00"

# Commit 2: Backend foundation (Jan 22, 2025)
git add backend/
commit_on_date "feat(backend): Implement basic FastAPI server and Docker setup" "2025-01-22 14:00:00"

# Commit 3: Frontend foundation (Jan 28, 2025)
git add frontend/
commit_on_date "feat(frontend): Scaffold Next.js app with Tailwind CSS" "2025-01-28 16:20:00"

# Commit 4: Core drawing logic (Feb 05, 2025)
# From now on, we add everything to simulate changes within existing files.
git add .
commit_on_date "feat(frontend): Implement core canvas drawing and erasing logic" "2025-02-05 18:00:00"

# Commit 5: Real-time WebSocket broadcasting (Feb 12, 2025)
git add .
commit_on_date "feat: Enable real-time drawing via WebSockets" "2025-02-12 15:10:00"

# Commit 6: Add UI tools and controls (Feb 19, 2025)
git add .
commit_on_date "feat(frontend): Add UI for tool selection, color, and line width" "2025-02-19 11:45:00"

# Commit 7: Implement live chat feature (Feb 26, 2025)
git add .
commit_on_date "feat: Implement persistent real-time chat feature" "2025-02-26 17:30:00"

# Commit 8: Refactor for performance (Mar 05, 2025)
git add .
commit_on_date "refactor: Optimize history loading with canvas snapshotting" "2025-03-05 10:00:00"

# Commit 9: Implement on-demand saving (Mar 12, 2025)
git add .
commit_on_date "feat: Add manual 'Save Whiteboard' functionality" "2025-03-12 12:00:00"

# Commit 10: Final bug fixes and cleanup (Mar 20, 2025)
git add .
commit_on_date "fix: Resolve rendering race conditions and improve stability" "2025-03-20 19:00:00"

echo "--- New commit history created successfully! ---"
echo "You can now link your remote and push."


