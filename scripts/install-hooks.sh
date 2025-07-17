#!/bin/bash

# =============================================================================
# Git Hooks Installation Script
# =============================================================================
# Sets up git hooks to enforce quality standards
# Author: Mike Hatcher
# Website: https://progenious.com
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Installing Git Hooks for n8n-nodes-semble${NC}"
echo "========================================"

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

# Check if we're in a git repository
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ Error: Not a git repository"
    exit 1
fi

# Create pre-commit hook
echo -e "${YELLOW}Installing pre-commit hook...${NC}"

cat > "$GIT_HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash
# Automatically generated pre-commit hook for n8n-nodes-semble

echo "🔍 Running pre-commit quality checks..."

# Run our comprehensive quality gate
if ./scripts/pre-commit.sh; then
    echo "✅ All quality checks passed - commit allowed"
    exit 0
else
    echo "❌ Quality checks failed - commit blocked"
    echo ""
    echo "To fix issues:"
    echo "  npm run lint:fix    # Fix linting issues"
    echo "  npm run format      # Fix formatting issues"
    echo "  npm test            # Run tests"
    echo ""
    echo "Or run: npm run pre-commit"
    exit 1
fi
EOF

# Make the hook executable
chmod +x "$GIT_HOOKS_DIR/pre-commit"

echo -e "${GREEN}✅ Pre-commit hook installed${NC}"

# Create pre-push hook
echo -e "${YELLOW}Installing pre-push hook...${NC}"

cat > "$GIT_HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
# Automatically generated pre-push hook for n8n-nodes-semble

echo "🚀 Running pre-push quality checks..."

# Run comprehensive checks including coverage
if ./scripts/pre-commit.sh && npm run test:coverage; then
    echo "✅ All quality checks passed - push allowed"
    exit 0
else
    echo "❌ Quality checks failed - push blocked"
    echo ""
    echo "Ensure all tests pass and coverage requirements are met"
    exit 1
fi
EOF

# Make the hook executable
chmod +x "$GIT_HOOKS_DIR/pre-push"

echo -e "${GREEN}✅ Pre-push hook installed${NC}"

# Create commit-msg hook for conventional commits
echo -e "${YELLOW}Installing commit-msg hook...${NC}"

cat > "$GIT_HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash
# Automatically generated commit-msg hook for n8n-nodes-semble

commit_regex='^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "❌ Invalid commit message format"
    echo ""
    echo "Commit messages should follow conventional commits format:"
    echo "  type(scope): description"
    echo ""
    echo "Types: feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert"
    echo ""
    echo "Examples:"
    echo "  feat(services): add field discovery service"
    echo "  fix(auth): handle token refresh errors"
    echo "  docs: update API documentation"
    echo ""
    exit 1
fi
EOF

# Make the hook executable
chmod +x "$GIT_HOOKS_DIR/commit-msg"

echo -e "${GREEN}✅ Commit message hook installed${NC}"

echo ""
echo "========================================"
echo -e "${GREEN}🎉 All git hooks installed successfully!${NC}"
echo ""
echo "The following hooks are now active:"
echo "  • pre-commit  - Runs quality checks before each commit"
echo "  • pre-push    - Runs full test suite before pushing"
echo "  • commit-msg  - Enforces conventional commit format"
echo ""
echo "To bypass hooks temporarily (not recommended):"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
