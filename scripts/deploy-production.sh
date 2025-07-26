#!/bin/bash

##############################################################################
# Production Deployment Script for n8n-nodes-semble
# 
# This script builds the package locally and deploys it directly to your
# production VPS running n8n in Docker.
#
# Usage:
#   ./scripts/deploy-production.sh           # Full deployment
#   ./scripts/deploy-production.sh --rollback # Rollback to previous version
#   ./scripts/deploy-production.sh --status   # Check deployment status
#
# Setup required:
#   1. Set N8N_HOST, N8N_HOST_USER, SSH_KEY_PATH in your .env file
#   2. Ensure SSH key access to your production VPS  
#   3. Ensure n8n is running in Docker on the production server
#
# Environment variables (set in .env file):
#   N8N_HOST          - Your production VPS IP/hostname
#   N8N_HOST_USER     - SSH username (usually root)
#   N8N_HOST_PWD      - SSH password (optional, if not using key auth)
#   SSH_KEY_PATH      - Path to SSH private key (without .pub extension)
##############################################################################

set -e  # Exit on any error

# ===========================
# CONFIGURATION
# ===========================

# Load environment variables from .env file if it exists
if [ -f "../.env" ]; then
    set -a  # automatically export all variables
    source ../.env
    set +a  # stop automatically exporting
elif [ -f "../../.env" ]; then
    set -a
    source ../../.env 
    set +a
fi

# Production server details - loaded from environment or defaults
PROD_HOST="${N8N_HOST:-your-server.example.com}"    # Your production VPS hostname/IP
PROD_USER="${N8N_HOST_USER:-root}"                  # SSH user (usually root on VPS)
PROD_PWD="${N8N_HOST_PWD:-}"                        # SSH password (optional)

# SSH key path - remove .pub extension if present (we need private key for SSH)
if [ -n "$SSH_KEY_PATH" ]; then
    # Remove .pub extension if present
    SSH_PRIVATE_KEY="${SSH_KEY_PATH%.pub}"
    PROD_SSH_KEY="${SSH_PRIVATE_KEY}"
else
    PROD_SSH_KEY="${PROD_SSH_KEY:-~/.ssh/id_rsa}"
fi

# Docker and n8n configuration
DOCKER_CONTAINER_NAME="${N8N_CONTAINER:-root-n8n-1}"    # Updated to match your actual container name
N8N_CUSTOM_NODES_DIR="/root/.n8n/custom"            # Custom nodes directory in container
BACKUP_DIR="/tmp/n8n-nodes-semble-backups"          # Backup directory on server

# Package information
PACKAGE_NAME="n8n-nodes-semble"
LOCAL_PACKAGE_PATH="./n8n-nodes-semble-*.tgz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ===========================
# HELPER FUNCTIONS
# ===========================

# SSH wrapper functions for consistent authentication
ssh_exec() {
    if [ -n "$PROD_PWD" ] && command -v sshpass >/dev/null 2>&1; then
        # Use password authentication if password is available and sshpass is installed
        sshpass -p "$PROD_PWD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 "$PROD_USER@$PROD_HOST" "$@"
    elif [ -f "$PROD_SSH_KEY" ]; then
        # Fall back to SSH key authentication
        ssh -i "$PROD_SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 "$PROD_USER@$PROD_HOST" "$@"
    else
        # Last resort: default SSH (will prompt for password)
        ssh -o ConnectTimeout=30 "$PROD_USER@$PROD_HOST" "$@"
    fi
}

scp_exec() {
    if [ -n "$PROD_PWD" ] && command -v sshpass >/dev/null 2>&1; then
        # Use password authentication if password is available and sshpass is installed
        sshpass -p "$PROD_PWD" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 "$@"
    elif [ -f "$PROD_SSH_KEY" ]; then
        # Fall back to SSH key authentication
        scp -i "$PROD_SSH_KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 "$@"
    else
        # Last resort: default SCP (will prompt for password)
        scp -o ConnectTimeout=30 "$@"
    fi
}

log() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if required tools are installed
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v ssh >/dev/null 2>&1; then
        error "SSH is required but not installed"
    fi
    
    if ! command -v scp >/dev/null 2>&1; then
        error "SCP is required but not installed"
    fi
    
    if [ ! -f "$PROD_SSH_KEY" ]; then
        error "SSH key not found at $PROD_SSH_KEY"
    fi
    
    success "Dependencies check passed"
}

# Test SSH connection to production server
test_ssh_connection() {
    log "Testing SSH connection to $PROD_USER@$PROD_HOST..."
    
    if ssh_exec "echo 'SSH connection successful'" >/dev/null 2>&1; then
        success "SSH connection successful"
    else
        error "SSH connection failed. Please check your SSH configuration."
    fi
}

# Build the package locally
build_package() {
    log "Building package locally..."
    
    # Clean any existing packages
    rm -f n8n-nodes-semble-*.tgz
    
    # Build and pack
    npm run build
    
    # Create a production package.json without pnpm restriction
    log "Creating production-friendly package..."
    
    # Backup original package.json
    cp package.json package.json.backup
    
    # Remove preinstall script for production
    cat package.json | jq 'del(.scripts.preinstall)' > package.json.prod
    mv package.json.prod package.json
    
    # Create package
    npm pack
    
    # Restore original package.json
    mv package.json.backup package.json
    
    # Check if package was created
    if ls n8n-nodes-semble-*.tgz >/dev/null 2>&1; then
        success "Production package built successfully (without pnpm restriction)"
    else
        error "Package build failed"
    fi
}

# Create backup of current installation
create_backup() {
    log "Creating backup of current installation..."
    
    ssh_exec bash << 'EOF'
        # Create backup directory
        mkdir -p /tmp/n8n-nodes-semble-backups
        
        # Get current timestamp
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="/tmp/n8n-nodes-semble-backups/backup_$TIMESTAMP.tar.gz"
        
        # Check if n8n container exists and is running
        if docker ps --format "table {{.Names}}" | grep -q "^root-n8n-1$"; then
            echo "Creating backup from running container..."
            # Create backup of custom nodes from container
            docker exec n8n tar -czf /tmp/backup_temp.tar.gz -C /root/.n8n/custom . 2>/dev/null || echo "No custom nodes to backup"
            docker cp n8n:/tmp/backup_temp.tar.gz "$BACKUP_FILE" 2>/dev/null || echo "No existing installation to backup"
            docker exec n8n rm -f /tmp/backup_temp.tar.gz 2>/dev/null || true
        else
            echo "Container not running, checking host filesystem..."
            # If container is not running, try to find n8n data on host
            if [ -d "/opt/n8n/data/.n8n/custom" ]; then
                tar -czf "$BACKUP_FILE" -C /opt/n8n/data/.n8n/custom . 2>/dev/null || echo "No custom nodes to backup"
            else
                echo "No existing installation found to backup"
                touch "$BACKUP_FILE"  # Create empty backup file
            fi
        fi
        
        echo "Backup created: $BACKUP_FILE"
        
        # Keep only last 5 backups
        cd /tmp/n8n-nodes-semble-backups
        ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
EOF
    
    success "Backup created"
}

# Deploy the package to production
deploy_package() {
    local package_file=$(ls n8n-nodes-semble-*.tgz | head -1)
    
    if [ -z "$package_file" ]; then
        error "No package file found. Run with --build first."
    fi
    
    log "Deploying $package_file to production..."
    
    # Copy package to server
    scp_exec "$package_file" "$PROD_USER@$PROD_HOST:/tmp/"
    
    # Install on server
    ssh_exec bash << EOF
        set -e
        
        # Get the uploaded package filename
        PACKAGE_FILE=\$(ls /tmp/n8n-nodes-semble-*.tgz | head -1)
        
        if [ -z "\$PACKAGE_FILE" ]; then
            echo "ERROR: Package file not found on server"
            exit 1
        fi
        
        echo "Installing package: \$PACKAGE_FILE"
        
        # Check if n8n container is running
        if docker ps --format "table {{.Names}}" | grep -q "^$DOCKER_CONTAINER_NAME\$"; then
            echo "Installing to running n8n container..."
            
            # Copy package into container
            docker cp "\$PACKAGE_FILE" "$DOCKER_CONTAINER_NAME:/tmp/"
            
            # Install in container (improved n8n community node method)
            docker exec --user root "$DOCKER_CONTAINER_NAME" sh -c "
                cd /tmp
                PACKAGE_FILE=\\\$(ls n8n-nodes-semble-*.tgz | head -1)
                echo 'Installing package: \\\$PACKAGE_FILE'
                
                # Step 1: Completely remove any existing installation to avoid permission issues
                echo 'Removing old installation...'
                npm uninstall -g n8n-nodes-semble --force 2>/dev/null || true
                rm -rf /usr/local/lib/node_modules/n8n-nodes-semble
                
                # Step 2: Install globally with ignore-scripts to avoid postinstall issues
                echo 'Installing new package globally...'
                npm install -g \\\$PACKAGE_FILE --ignore-scripts --force
                
                # Step 3: Verify global installation
                if [ ! -d '/usr/local/lib/node_modules/n8n-nodes-semble' ]; then
                    echo 'ERROR: Global installation failed'
                    exit 1
                fi
                
                # Step 4: Set up community nodes directory with proper ownership
                echo 'Setting up community nodes directory...'
                mkdir -p /home/node/.n8n/nodes
                chown -R node:node /home/node/.n8n
                cd /home/node/.n8n/nodes
                
                # Clean existing community node setup
                rm -rf node_modules package.json package-lock.json
                
                # Create fresh package.json for community nodes
                echo '{\\\"name\\\":\\\"installed-nodes\\\",\\\"private\\\":true,\\\"dependencies\\\":{\\\"n8n-nodes-semble\\\":\\\"file:../../../../usr/local/lib/node_modules/n8n-nodes-semble\\\"}}' > package.json
                chown node:node package.json
                
                # Step 5: Install community node link
                echo 'Installing community node link...'
                npm install --no-package-lock 2>/dev/null || true
                chown -R node:node node_modules 2>/dev/null || true
                
                # Step 6: Verify installation
                echo 'Verifying installation...'
                ls -la /usr/local/lib/node_modules/n8n-nodes-semble/dist/nodes/Semble/ | head -3
                ls -la node_modules/ | grep n8n-nodes-semble || echo 'Community node link not found but continuing...'
                
                echo 'Package installed successfully'
                rm -f /tmp/\\\$PACKAGE_FILE
            "
            
            echo "Restarting n8n container..."
            docker restart "$DOCKER_CONTAINER_NAME"
            
            # Wait for container to be ready
            echo "Waiting for n8n to start..."
            sleep 10
            
            # Check if container is running
            if docker ps --format "table {{.Names}}" | grep -q "^$DOCKER_CONTAINER_NAME\$"; then
                echo "✅ n8n container is running"
            else
                echo "❌ n8n container failed to start"
                exit 1
            fi
            
        else
            echo "ERROR: n8n container '$DOCKER_CONTAINER_NAME' is not running"
            echo "Available containers:"
            docker ps --format "table {{.Names}}\t{{.Status}}"
            exit 1
        fi
        
        # Clean up
        rm -f "\$PACKAGE_FILE"
        
        echo "Deployment completed successfully!"
EOF
    
    success "Package deployed successfully"
}

# Check deployment status
check_status() {
    log "Checking deployment status..."
    
    ssh_exec bash << 'EOF'
        echo "=== n8n Container Status ==="
        if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "root-n8n-1"; then
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "root-n8n-1"
        else
            echo "❌ n8n container not found or not running"
            echo ""
            echo "All containers:"
            docker ps --format "table {{.Names}}\t{{.Status}}"
        fi
        
        echo ""
        echo "=== Installed n8n Packages ==="
        if docker ps --format "table {{.Names}}" | grep -q "^root-n8n-1$"; then
            echo "Checking for n8n community nodes..."
            docker exec --user root root-n8n-1 sh -c "npm list -g --depth=0 2>/dev/null | grep n8n" || echo "No n8n packages found in global npm"
            echo ""
            echo "Checking for Semble node specifically..."
            docker exec --user root root-n8n-1 sh -c "npm list -g n8n-nodes-semble 2>/dev/null || echo 'n8n-nodes-semble not found in global'"
            echo ""
            echo "=== Package Version & File Timestamps ==="
            docker exec --user root root-n8n-1 sh -c "
                if [ -f '/usr/local/lib/node_modules/n8n-nodes-semble/package.json' ]; then
                    echo 'Package version:'
                    cat /usr/local/lib/node_modules/n8n-nodes-semble/package.json | grep '\"version\"' | head -1
                    echo ''
                    echo 'Node file timestamps (should be recent for successful deployment):'
                    ls -la /usr/local/lib/node_modules/n8n-nodes-semble/dist/nodes/Semble/*.js 2>/dev/null || echo 'Node files not found'
                else
                    echo 'n8n-nodes-semble package not found globally'
                fi
            "
            echo ""
            echo "=== Community Node Setup ==="
            docker exec --user root root-n8n-1 sh -c "
                echo 'Community nodes directory:'
                if [ -f '/home/node/.n8n/nodes/package.json' ]; then
                    cat /home/node/.n8n/nodes/package.json | grep n8n-nodes-semble || echo 'n8n-nodes-semble not found in user directory'
                else
                    echo 'Community nodes package.json not found'
                fi
                echo ''
                echo 'Community node link:'
                if [ -L '/home/node/.n8n/nodes/node_modules/n8n-nodes-semble' ]; then
                    ls -la /home/node/.n8n/nodes/node_modules/n8n-nodes-semble
                else
                    echo 'Community node link not found'
                fi
            "
        else
            echo "Cannot check packages - n8n container not running"
        fi
        
        echo ""
        echo "=== Recent Container Logs ==="
        if docker ps --format "table {{.Names}}" | grep -q "^root-n8n-1$"; then
            docker logs root-n8n-1 --tail 20
        else
            echo "Cannot show logs - n8n container not running"
        fi
EOF
}

# Rollback to previous version
rollback_deployment() {
    log "Rolling back to previous version..."
    
    ssh_exec bash << 'EOF'
        # Find latest backup
        LATEST_BACKUP=$(ls -t /tmp/n8n-nodes-semble-backups/backup_*.tar.gz 2>/dev/null | head -1)
        
        if [ -z "$LATEST_BACKUP" ]; then
            echo "❌ No backup found to rollback to"
            exit 1
        fi
        
        echo "Rolling back using backup: $LATEST_BACKUP"
        
        if docker ps --format "table {{.Names}}" | grep -q "^root-n8n-1$"; then
            # Stop container
            echo "Stopping n8n container..."
            docker stop root-n8n-1
            
            # Restore backup
            echo "Restoring backup..."
            docker cp "$LATEST_BACKUP" root-n8n-1:/tmp/restore.tar.gz
            docker start root-n8n-1
            sleep 5
            
            # Extract backup in container
            docker exec root-n8n-1 sh -c "
                cd /root/.n8n
                rm -rf custom/*
                cd custom
                tar -xzf /tmp/restore.tar.gz
                rm -f /tmp/restore.tar.gz
            "
            
            # Restart container
            echo "Restarting n8n..."
            docker restart root-n8n-1
            
            echo "✅ Rollback completed"
        else
            echo "❌ n8n container not found"
            exit 1
        fi
EOF
    
    success "Rollback completed"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  (no args)    Full deployment: build + deploy"
    echo "  --rollback   Rollback to previous version"
    echo "  --status     Check deployment status"
    echo "  --help       Show this help message"
    echo ""
    echo "Configuration (set these in script or environment):"
    echo "  PROD_HOST    Production server hostname/IP"
    echo "  PROD_USER    SSH username"
    echo "  PROD_SSH_KEY Path to SSH private key"
    echo ""
    echo "Examples:"
    echo "  $0                           # Full deployment"
    echo "  $0 --status                  # Check status"
    echo "  PROD_HOST=my-server $0       # Override host"
}

# ===========================
# MAIN SCRIPT LOGIC
# ===========================

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        show_usage
        exit 0
        ;;
    --status)
        check_dependencies
        test_ssh_connection
        check_status
        exit 0
        ;;
    --rollback)
        check_dependencies
        test_ssh_connection
        rollback_deployment
        exit 0
        ;;
    "")
        # Default case - no arguments
        ;;
    *)
        error "Unknown option: $1. Use --help for usage information."
        ;;
esac

# Validate configuration
if [ "$PROD_HOST" = "your-server.example.com" ]; then
    error "Please configure N8N_HOST in your .env file"
fi

if [ ! -f "$PROD_SSH_KEY" ]; then
    error "SSH private key not found at $PROD_SSH_KEY. Please check SSH_KEY_PATH in your .env file (should point to private key, not .pub file)"
fi

# Main deployment flow
log "Starting production deployment..."
log "Target: $PROD_USER@$PROD_HOST"
log "Container: $DOCKER_CONTAINER_NAME"

check_dependencies
test_ssh_connection

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    ssh_exec bash << 'EOF'
        echo "=== Deployment Verification ==="
        
        # Check if container is running
        if ! docker ps --format "table {{.Names}}" | grep -q "^root-n8n-1$"; then
            echo "❌ VERIFICATION FAILED: n8n container not running"
            exit 1
        fi
        
        # Check if global package is installed with correct version
        VERSION_CHECK=$(docker exec --user root root-n8n-1 sh -c "
            if [ -f '/usr/local/lib/node_modules/n8n-nodes-semble/package.json' ]; then
                cat /usr/local/lib/node_modules/n8n-nodes-semble/package.json | grep '\"version\"' | head -1 | grep '2.0.0'
            fi
        " 2>/dev/null)
        
        if [ -z "$VERSION_CHECK" ]; then
            echo "❌ VERIFICATION FAILED: Package version 2.0.0 not found"
            exit 1
        fi
        
        # Check if node files exist and are recent (within last hour)
        NODE_FILES_CHECK=$(docker exec --user root root-n8n-1 sh -c "
            find /usr/local/lib/node_modules/n8n-nodes-semble/dist/nodes/Semble/ -name '*.js' -newermt '-1 hour' | wc -l
        " 2>/dev/null)
        
        if [ "$NODE_FILES_CHECK" -lt "3" ]; then
            echo "❌ VERIFICATION FAILED: Node files are not recent or missing"
            docker exec --user root root-n8n-1 sh -c "ls -la /usr/local/lib/node_modules/n8n-nodes-semble/dist/nodes/Semble/*.js"
            exit 1
        fi
        
        # Check if community node link exists
        if ! docker exec --user root root-n8n-1 sh -c "[ -L '/home/node/.n8n/nodes/node_modules/n8n-nodes-semble' ]" 2>/dev/null; then
            echo "⚠️  WARNING: Community node link not found, but continuing..."
        fi
        
        echo "✅ VERIFICATION PASSED: Deployment successful"
        echo "   - Container running: ✅"
        echo "   - Package version 2.0.0: ✅"
        echo "   - Recent node files: ✅"
        echo "   - Community node link: $(docker exec --user root root-n8n-1 sh -c '[ -L "/home/node/.n8n/nodes/node_modules/n8n-nodes-semble" ] && echo "✅" || echo "⚠️"')"
        echo ""
        echo "🎉 DEPLOYMENT SUMMARY:"
        echo "   • n8n-nodes-semble version 2.0.0 successfully deployed"
        echo "   • All node files updated with current timestamp"
        echo "   • n8n container restarted and running"
        echo "   • Access your n8n at: https://workflows.thehealthsuite.co.uk"
        echo "   • Remember to hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
EOF
}

build_package
create_backup
deploy_package
verify_deployment
check_status

success "Production deployment completed successfully!"
log "You can check the status anytime with: $0 --status"
log "If there are issues, you can rollback with: $0 --rollback"
