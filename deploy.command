#!/bin/bash
# deploy.command
#
# One-click deploy for Looms.
# - Pushes source to GitHub (looms-gg/looms-web)
# - Applies Supabase migrations
# - Builds the Vite app and publishes dist/ to GitHub Pages (gh-pages)
#
# Usage: double-click in Finder, or run from terminal:
#   ./deploy.command

set -euo pipefail
export GIT_TERMINAL_PROMPT=0

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

REPO_SLUG="looms-gg/looms-web"
ORIGIN_URL="https://github.com/${REPO_SLUG}.git"
DEFAULT_BASE="/looms-web/"
PAGES_URL="https://looms-gg.github.io/looms-web/"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Looms Deploy (GitHub Pages)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

abort() {
  echo "" >&2
  echo "❌ Deploy failed: $1" >&2
  echo "   Fix the issue above and re-run." >&2
  exit 1
}
trap 'abort "command failed at line ${BASH_LINENO[0]}"' ERR

staged_env_secrets() {
  git diff --cached --name-only \
    | grep -E '(^|/)\.env($|\.)' \
    | grep -vE '\.(example|sample|template)$' \
    || true
}

# Load env: .env then .env.local (local wins on duplicate keys).
load_env_file() {
  local f="$1"
  if [[ -f "$f" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$f"
    set +a
    echo "✅ Loaded env from $f"
  fi
}
load_env_file "$SCRIPT_DIR/.env"
load_env_file "$SCRIPT_DIR/.env.local"

if [[ -z "${VITE_SUPABASE_URL:-}" || -z "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
  abort "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env (or use .env.local)."
fi

export VITE_BASE="${VITE_BASE:-$DEFAULT_BASE}"

if ! command -v gh >/dev/null 2>&1; then
  abort "GitHub CLI (gh) not found. Install from https://cli.github.com/ then run: gh auth login"
fi
if ! gh auth status -h github.com >/dev/null 2>&1; then
  abort "GitHub CLI not authenticated. Run: gh auth login -h github.com"
fi
echo "✅ GitHub CLI authenticated."

# Attribute deploy commits to the logged-in gh user (never Cursor / machine defaults).
GH_LOGIN="$(gh api user -q .login 2>/dev/null || true)"
GH_ID="$(gh api user -q .id 2>/dev/null || true)"
if [[ -z "$GH_LOGIN" || -z "$GH_ID" ]]; then
  abort "Could not read GitHub user via gh api. Re-run: gh auth login -h github.com"
fi
export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-$GH_LOGIN}"
export GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-${GH_ID}+${GH_LOGIN}@users.noreply.github.com}"
export GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-$GIT_AUTHOR_NAME}"
export GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-$GIT_AUTHOR_EMAIL}"
echo "✅ Git author: $GIT_AUTHOR_NAME <$GIT_AUTHOR_EMAIL>"

# Auto-commit on the *current* branch first. Checkout to main fails when the
# working tree is dirty (diverging tracked files), so commit before switching.
auto_commit_deploy() {
  local default_msg="deploy: $(date '+%Y-%m-%d %H:%M')"
  local commit_msg="${DEPLOY_COMMIT_MSG:-${1:-}}"

  if [[ -z "$commit_msg" ]]; then
    echo ""
    if [[ -t 0 ]]; then
      read -r -p "💬 Enter commit message (or press Enter to skip): " commit_msg || true
    elif [[ -r /dev/tty && -w /dev/tty ]] && { exec 3</dev/tty; } 2>/dev/null; then
      read -r -u 3 -p "💬 Enter commit message (or press Enter to skip): " commit_msg || true
      exec 3<&-
    elif read -r commit_msg 2>/dev/null; then
      :
    fi
  fi
  commit_msg="$(echo "$commit_msg" | sed -e 's/^[[:blank:]]*//' -e 's/[[:blank:]]*$//')"

  DEPLOY_FINAL_MSG="${commit_msg:-$default_msg}"

  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    echo "📦 Auto-committing changes on $(git rev-parse --abbrev-ref HEAD)..."
    git add -A
    while IFS= read -r f; do
      [[ -n "$f" ]] || continue
      git reset HEAD -- "$f" >/dev/null 2>&1 || true
    done < <(staged_env_secrets)
    if [[ -n "$(staged_env_secrets)" ]]; then
      abort "Refusing to commit: a .env file is still staged. Fix .gitignore / untrack it."
    fi
    if [[ -n "$(git diff --cached --name-only 2>/dev/null)" ]]; then
      git commit -m "$DEPLOY_FINAL_MSG"
      echo "✅ Committed: $DEPLOY_FINAL_MSG"
    else
      echo "ℹ️  Nothing to commit after excluding secrets; creating deploy trigger..."
      git commit --allow-empty -m "$DEPLOY_FINAL_MSG"
      echo "✅ Deploy trigger created: $DEPLOY_FINAL_MSG"
    fi
  else
    echo "📦 Creating deploy trigger commit (no code changes)..."
    git commit --allow-empty -m "$DEPLOY_FINAL_MSG"
    echo "✅ Deploy trigger created: $DEPLOY_FINAL_MSG"
  fi
}

auto_commit_deploy "${1:-}"

# Land on main (fast-forward only).
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "↪️  Moving onto main from '$CURRENT_BRANCH' (fast-forward)..."
  FEATURE_BRANCH="$CURRENT_BRANCH"
  git checkout main || abort "Could not checkout main."
  if ! git merge --ff-only "$FEATURE_BRANCH"; then
    abort "Cannot fast-forward main onto $FEATURE_BRANCH. Rebase onto main first, then re-run."
  fi
  echo "✅ Now on main at $(git rev-parse --short HEAD)."
fi
CURRENT_BRANCH=main

# Ensure origin
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "🔗 Adding origin → $ORIGIN_URL"
  git remote add origin "$ORIGIN_URL"
else
  echo "ℹ️  origin: $(git remote get-url origin)"
fi

# Ensure repo is public
echo "🔓 Ensuring $REPO_SLUG is public..."
gh repo edit "$REPO_SLUG" --visibility public --accept-visibility-change-consequences >/dev/null 2>&1 \
  || echo "⚠️  Could not set visibility via gh (may already be public or lack permission)." >&2

# Push source
echo ""
echo "📤 Pushing main to GitHub..."
STASHED_ENV=0
if git status --porcelain -- .env .env.local 2>/dev/null | grep -q .; then
  git stash push -m "deploy-temp-env" -- .env .env.local >/dev/null 2>&1 && STASHED_ENV=1 \
    || echo "⚠️  Could not stash .env; pull may fail." >&2
fi

# If origin/main exists and has diverged (e.g. after an authorship rewrite), do not
# rebase Cursor/old history back onto this branch — abort with a force-push hint.
# Set DEPLOY_FORCE_PUSH=1 once after wiping local history to replace remote main.
if [[ "${DEPLOY_FORCE_PUSH:-}" == "1" ]]; then
  echo "⚠️  DEPLOY_FORCE_PUSH=1 — will replace origin/main with local main."
elif git ls-remote --exit-code --heads origin main >/dev/null 2>&1; then
  git fetch origin main 2>&1 | tail -3 || true
  LOCAL_TIP="$(git rev-parse HEAD)"
  REMOTE_TIP="$(git rev-parse origin/main 2>/dev/null || true)"
  if [[ -n "$REMOTE_TIP" && "$LOCAL_TIP" != "$REMOTE_TIP" ]]; then
    if git merge-base --is-ancestor "$REMOTE_TIP" "$LOCAL_TIP" 2>/dev/null; then
      : # remote is behind local — fast-forward push is fine
    elif git merge-base --is-ancestor "$LOCAL_TIP" "$REMOTE_TIP" 2>/dev/null; then
      git pull --rebase origin main 2>&1 | tail -5 \
        || abort "git pull --rebase failed."
    else
      abort "Local main and origin/main have diverged. If you wiped history on purpose, re-run with: DEPLOY_FORCE_PUSH=1 ./deploy.command"
    fi
  fi
fi

if [[ "${DEPLOY_FORCE_PUSH:-}" == "1" ]]; then
  git push --force-with-lease -u origin main 2>&1 | tail -10 \
    || abort "git push --force-with-lease to origin main failed."
else
  git push -u origin main 2>&1 | tail -10 \
    || abort "git push to origin main failed."
fi
if [[ "$STASHED_ENV" -eq 1 ]]; then
  git stash pop >/dev/null 2>&1 \
    || echo "⚠️  Restored deploy stash failed; check git stash list for your .env." >&2
fi
echo "✅ GitHub source push complete."

# Supabase migrations
echo ""
echo "🗄️  Applying Supabase migrations..."
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "⚠️  SUPABASE_ACCESS_TOKEN is not set. Skipping migrations." >&2
else
  SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
  if [[ -z "$SUPABASE_PROJECT_REF" ]]; then
    SUPERBASE_HOST="${VITE_SUPABASE_URL#https://}"
    SUPERBASE_HOST="${SUPERBASE_HOST%/}"
    SUPERBASE_HOST="${SUPERBASE_HOST#http://}"
    SUPERBASE_HOST="${SUPERBASE_HOST#*://}"
    SUPABASE_PROJECT_REF="${SUPERBASE_HOST%%.*}"
  fi
  if [[ -z "$SUPABASE_PROJECT_REF" ]] || ! [[ "$SUPABASE_PROJECT_REF" =~ ^[a-z0-9]{20,}$ ]]; then
    echo "⚠️  Could not derive a valid Supabase project ref; skipping migrations." >&2
  else
    echo "ℹ️  Using Supabase project ref: $SUPABASE_PROJECT_REF"
    (
      cd "$SCRIPT_DIR"
      npx supabase@latest link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null 2>&1 \
        || echo "⚠️  supabase link failed; continuing with db push." >&2
      if ! npx supabase@latest db push --include-all --yes < /dev/null; then
        echo "⚠️  supabase db push failed; continuing with Pages deploy." >&2
      else
        echo "✅ Supabase migrations applied."
      fi
    )
  fi
fi

# Build
echo ""
echo "🏗️  Building the Vite app (base=$VITE_BASE)..."
(
  cd "$SCRIPT_DIR"
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
  npm run build
)
echo "✅ Build complete (output: $SCRIPT_DIR/dist)."

# SPA deep-link support on GitHub Pages + disable Jekyll so asset folders publish as-is
cp "$SCRIPT_DIR/dist/index.html" "$SCRIPT_DIR/dist/404.html"
touch "$SCRIPT_DIR/dist/.nojekyll"
echo "✅ Wrote dist/404.html and dist/.nojekyll."

# Publish ONLY dist/ to gh-pages (never the Vite source tree)
echo ""
echo "☁️  Publishing dist/ to gh-pages..."
(
  cd "$SCRIPT_DIR"
  npx --yes gh-pages@latest -d dist -b gh-pages -m "${DEPLOY_FINAL_MSG:-deploy: $(date '+%Y-%m-%d %H:%M')}"
)

# Ensure Pages is enabled on gh-pages / root.
# Use a JSON body — form -f "source[branch]=..." is unreliable with the Pages API,
# and a misconfigured source publishes main (raw index.html → /src/main.tsx MIME errors).
echo "ℹ️  Ensuring GitHub Pages source is gh-pages / ..."
PAGES_PAYLOAD='{"build_type":"legacy","source":{"branch":"gh-pages","path":"/"}}'
if ! gh api -X PUT "repos/${REPO_SLUG}/pages" --input - <<<"$PAGES_PAYLOAD" >/dev/null 2>&1; then
  if ! gh api -X POST "repos/${REPO_SLUG}/pages" --input - <<<"$PAGES_PAYLOAD" >/dev/null 2>&1; then
    echo "⚠️  Could not configure Pages via API." >&2
    echo "   Enable manually: Settings → Pages → Deploy from branch → gh-pages / (root)." >&2
  fi
fi

PAGES_BRANCH="$(gh api "repos/${REPO_SLUG}/pages" --jq '.source.branch // empty' 2>/dev/null || true)"
if [[ "$PAGES_BRANCH" != "gh-pages" ]]; then
  echo "⚠️  Pages source branch is '${PAGES_BRANCH:-unknown}', expected 'gh-pages'." >&2
  echo "   Live site will keep serving Vite source until you switch it:" >&2
  echo "   https://github.com/${REPO_SLUG}/settings/pages" >&2
else
  echo "✅ Pages source: gh-pages /"
  # Nudge GitHub to rebuild from the branch we just published
  gh api -X POST "repos/${REPO_SLUG}/pages/builds" >/dev/null 2>&1 \
    || echo "ℹ️  Could not request a Pages rebuild (push to gh-pages should still trigger one)." >&2
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deploy complete."
echo "   App: $PAGES_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
