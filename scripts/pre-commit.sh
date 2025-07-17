#!/bin/bash

# =============================================================================
# Pre-commit Quality Gate Script
# =============================================================================
# Enforces code quality standards before any commit/deployment
# Author: Mike Hatcher
# Website: https://progenious.com
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/pre-commit-$(date +%Y%m%d-%H%M%S).log"

# Ensure logs directory exists
mkdir -p "$PROJECT_ROOT/logs"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_step() {
    log "${BLUE}▶ $1${NC}"
}

log_success() {
    log "${GREEN}✅ $1${NC}"
}

log_warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    log "${RED}❌ $1${NC}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "Required command '$1' not found"
        exit 1
    fi
}

# =============================================================================
# QUALITY CHECKS
# =============================================================================

run_linting() {
    log_step "Running ESLint..."
    
    if npm run lint; then
        log_success "Linting passed"
    else
        log_error "Linting failed"
        log "Run 'npm run lint:fix' to automatically fix some issues"
        exit 1
    fi
}

run_formatting() {
    log_step "Checking code formatting..."
    
    # Run prettier in check mode first
    if npx prettier --check "**/*.{ts,js,json,md}" --ignore-path .gitignore; then
        log_success "Code formatting is correct"
    else
        log_warning "Code formatting issues found, auto-fixing..."
        npm run format
        log_success "Code formatting fixed"
    fi
}

run_type_checking() {
    log_step "Running TypeScript type checking..."
    
    if npx tsc --noEmit; then
        log_success "Type checking passed"
    else
        log_error "Type checking failed"
        exit 1
    fi
}

run_tests() {
    log_step "Running test suite..."
    
    if npm test; then
        log_success "All tests passed"
    else
        log_error "Tests failed"
        exit 1
    fi
}

run_coverage_check() {
    log_step "Checking test coverage..."
    
    if npm run test:coverage; then
        log_success "Coverage check passed"
    else
        log_error "Coverage check failed"
        exit 1
    fi
}

run_build() {
    log_step "Running build process..."
    
    if npm run build; then
        log_success "Build successful"
    else
        log_error "Build failed"
        exit 1
    fi
}

check_dependencies() {
    log_step "Checking for dependency vulnerabilities..."
    
    if npm audit --audit-level=moderate; then
        log_success "No moderate or high security vulnerabilities found"
    else
        log_warning "Security vulnerabilities detected"
        log "Run 'npm audit fix' to attempt automatic fixes"
        log "Review vulnerabilities manually if auto-fix is not available"
    fi
}

check_package_integrity() {
    log_step "Checking package.json integrity..."
    
    # Verify package.json is valid JSON
    if jq empty package.json &> /dev/null; then
        log_success "package.json is valid JSON"
    else
        log_error "package.json contains invalid JSON"
        exit 1
    fi
    
    # Check for required fields
    local required_fields=("name" "version" "description" "main" "scripts")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" package.json > /dev/null; then
            log_error "package.json missing required field: $field"
            exit 1
        fi
    done
    
    log_success "package.json integrity verified"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    log "=========================================="
    log "Pre-commit Quality Gate"
    log "Started: $(date)"
    log "=========================================="
    
    # Change to project directory
    cd "$PROJECT_ROOT"
    
    # Check required tools
    check_command "npm"
    check_command "npx"
    check_command "jq"
    
    # Run all quality checks in order
    check_package_integrity
    check_dependencies
    run_formatting
    run_linting
    run_type_checking
    run_tests
    run_coverage_check
    run_build
    
    log "=========================================="
    log_success "All quality checks passed!"
    log "Completed: $(date)"
    log "=========================================="
}

# Handle script arguments
case "${1:-}" in
    --lint-only)
        run_linting
        ;;
    --test-only)
        run_tests
        ;;
    --build-only)
        run_build
        ;;
    --format-only)
        run_formatting
        ;;
    --coverage-only)
        run_coverage_check
        ;;
    --help|-h)
        echo "Usage: $0 [option]"
        echo "Options:"
        echo "  --lint-only      Run only linting"
        echo "  --test-only      Run only tests"
        echo "  --build-only     Run only build"
        echo "  --format-only    Run only formatting"
        echo "  --coverage-only  Run only coverage check"
        echo "  --help, -h       Show this help message"
        echo ""
        echo "Without options, runs all quality checks"
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        log "Use --help for usage information"
        exit 1
        ;;
esac
