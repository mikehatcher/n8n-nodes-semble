#!/bin/bash

# Universal n8n Version Update Script (API-based)
# This script can update n8n in both local and production environments using API calls
# Usage: ./update-n8n.sh [local|production] [version]

set -e

# Load workspace environment variables
WORKSPACE_ROOT="/Users/mikehatcher/Websites/the-health-suite"
ENV_FILE="$WORKSPACE_ROOT/.env"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "❌ .env file not found at $ENV_FILE"
    exit 1
fi

# Default to local environment
ENVIRONMENT="${1:-local}"
TARGET_VERSION="${2:-latest}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color="$1"
    local message="$2"
    echo -e "${color}${message}${NC}"
}

# Function to get environment-specific API configuration
get_api_config() {
    local env="$1"
    
    if [ "$env" = "production" ]; then
        API_ENDPOINT="$N8N_PROD_API_ENDPOINT"
        API_KEY="$N8N_PROD_API_KEY"
        HOST_URL="https://workflows.thehealthsuite.co.uk"
    else
        API_ENDPOINT="$N8N_LOCAL_API_ENDPOINT"
        API_KEY="$N8N_LOCAL_API_KEY"
        HOST_URL="$N8N_LOCAL_HOST"
    fi
    
    # Validate API configuration
    if [ -z "$API_ENDPOINT" ] || [ -z "$API_KEY" ]; then
        print_status "$RED" "❌ API configuration missing for $env environment"
        echo "   Required: API_ENDPOINT and API_KEY"
        return 1
    fi
}

# Function to make API calls to n8n
make_n8n_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    local curl_cmd="curl -s -X $method"
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $API_KEY'"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$API_ENDPOINT$endpoint'"
    
    # Execute the curl command
    eval $curl_cmd
}

# Function to check community nodes status
check_community_nodes() {
    local env="$1"
    
    if [ "$env" = "local" ]; then
        # For local environment, check Docker container
        local test_dir="$WORKSPACE_ROOT/n8n-local-test"
        if [ -d "$test_dir" ]; then
            cd "$test_dir"
            # Check if Semble node is accessible in local container
            local node_check=$(docker compose exec -T n8n sh -c "ls -la /home/node/.n8n/nodes/node_modules/ 2>/dev/null | grep semble || echo 'missing'" 2>/dev/null || echo "error")
            if [[ "$node_check" == *"semble"* ]]; then
                echo "present"
            else
                echo "missing"
            fi
        else
            echo "no-local-env"
        fi
    else
        # For production environment, check via SSH
        if [ -n "$N8N_PROD_HOST" ] && [ -n "$N8N_PROD_USER" ] && [ -n "$N8N_PROD_PWD" ]; then
            local node_check=$(sshpass -p "$N8N_PROD_PWD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$N8N_PROD_USER@$N8N_PROD_HOST" \
                "docker exec \$(docker ps --format '{{.Names}}' | grep n8n | head -1) sh -c 'ls -la /home/node/.n8n/nodes/node_modules/ 2>/dev/null | grep semble || echo missing'" 2>/dev/null || echo "error")
            
            if [[ "$node_check" == *"semble"* ]]; then
                echo "present"
            else
                echo "missing"
            fi
        else
            echo "no-ssh-config"
        fi
    fi
}

# Function to redeploy community nodes
redeploy_community_nodes() {
    local env="$1"
    
    print_status "$YELLOW" "🔧 Redeploying community nodes for $env environment..."
    
    # Navigate to the Semble node directory
    local current_dir=$(pwd)
    local semble_dir="$WORKSPACE_ROOT/n8n-nodes-semble"
    
    if [ ! -d "$semble_dir" ]; then
        print_status "$RED" "❌ Semble node directory not found at $semble_dir"
        return 1
    fi
    
    cd "$semble_dir"
    
    if [ "$env" = "local" ]; then
        print_status "$BLUE" "🚀 Deploying to local environment..."
        if npm run deploy:local >/dev/null 2>&1; then
            print_status "$GREEN" "✅ Local community nodes redeployed successfully"
        else
            print_status "$RED" "❌ Failed to redeploy local community nodes"
            cd "$current_dir"
            return 1
        fi
    else
        print_status "$BLUE" "🚀 Deploying to production environment..."
        if npm run deploy:prod >/dev/null 2>&1; then
            print_status "$GREEN" "✅ Production community nodes redeployed successfully"
        else
            print_status "$RED" "❌ Failed to redeploy production community nodes"
            cd "$current_dir"
            return 1
        fi
    fi
    
    cd "$current_dir"
    return 0
}

# Function to get current n8n version via API
get_current_version_api() {
    local env="$1"
    
    get_api_config "$env" || return 1
    
    # Try to get version from API health endpoint
    local response=$(curl -s "$HOST_URL/healthz" 2>/dev/null || echo "")
    
    if [ -n "$response" ]; then
        # Try to extract version from response if available
        local version=$(echo "$response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "")
        
        if [ -n "$version" ]; then
            echo "$version"
        else
            # Fallback: try to get from status endpoint
            local status_response=$(make_n8n_api_call "GET" "/settings" 2>/dev/null || echo "")
            echo "api-accessible"
        fi
    else
        echo "unreachable"
    fi
}

# Function to get latest stable n8n version from GitHub releases
get_latest_version() {
    # Get the latest stable release (non-prerelease) from GitHub API
    local latest_tag=$(curl -s "https://api.github.com/repos/n8n-io/n8n/releases" | \
        jq -r '.[] | select(.prerelease == false) | .tag_name' | \
        head -1 2>/dev/null)
    
    if [ -n "$latest_tag" ] && [ "$latest_tag" != "null" ]; then
        # Extract version number from tag (remove 'n8n@' prefix)
        echo "$latest_tag" | sed 's/^n8n@//'
    else
        # Fallback to hardcoded stable version if API fails
        echo "1.104.2"
    fi
}

# Function to list available stable versions
list_available_versions() {
    print_status "$BLUE" "🏷️  Available stable n8n versions:"
    echo "   latest (latest stable release)"
    echo "   Recent stable releases:"
    
    # Get stable releases from GitHub API
    curl -s "https://api.github.com/repos/n8n-io/n8n/releases" | \
        jq -r '.[] | select(.prerelease == false) | .tag_name' | \
        sed 's/^n8n@//' | \
        head -10 | sed 's/^/   /'
}

# Function to update local Docker environment
update_local_docker() {
    local version="$1"
    local test_dir="$WORKSPACE_ROOT/n8n-local-test"
    
    if [ ! -d "$test_dir" ]; then
        print_status "$RED" "❌ Local test environment not found at $test_dir"
        echo "   Run 'npm run setup:test-env' first"
        return 1
    fi
    
    cd "$test_dir"
    
    print_status "$BLUE" "🔄 Updating local n8n to version $version"
    
    # Get current version first
    local current_version=$(get_current_version_api "local")
    
    if [ "$current_version" = "$version" ]; then
        print_status "$GREEN" "✅ Local n8n already running version $version"
        return 0
    fi
    
    print_status "$YELLOW" "Current version: $current_version"
    print_status "$YELLOW" "Target version: $version"
    
    # Check community nodes before update
    print_status "$BLUE" "🔍 Checking community nodes before update..."
    local nodes_before=$(check_community_nodes "local")
    if [ "$nodes_before" = "present" ]; then
        print_status "$GREEN" "✅ Community nodes detected before update"
    else
        print_status "$YELLOW" "⚠️  No community nodes detected before update"
    fi
    
    # Update N8N_LOCAL_VERSION in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^N8N_LOCAL_VERSION=.*/N8N_LOCAL_VERSION=$version/" "$ENV_FILE"
    else
        sed -i "s/^N8N_LOCAL_VERSION=.*/N8N_LOCAL_VERSION=$version/" "$ENV_FILE"
    fi
    
    print_status "$BLUE" "📥 Pulling n8nio/n8n:$version..."
    docker compose pull
    
    print_status "$BLUE" "🔄 Restarting with new version..."
    docker compose down
    docker compose up -d
    
    # Health check
    print_status "$YELLOW" "⏳ Waiting for local n8n to start..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:5678/healthz >/dev/null 2>&1; then
            print_status "$GREEN" "✅ Local n8n updated successfully to version $version"
            
            # Check community nodes after update
            print_status "$BLUE" "🔍 Checking community nodes after update..."
            sleep 5  # Give n8n time to fully start
            local nodes_after=$(check_community_nodes "local")
            
            if [ "$nodes_after" = "present" ]; then
                print_status "$GREEN" "✅ Community nodes still present after update"
            elif [ "$nodes_before" = "present" ]; then
                print_status "$YELLOW" "⚠️  Community nodes missing after update - redeploying..."
                if redeploy_community_nodes "local"; then
                    print_status "$GREEN" "✅ Community nodes restored successfully"
                else
                    print_status "$RED" "❌ Failed to restore community nodes"
                    print_status "$YELLOW" "💡 Run 'npm run deploy:local' manually to restore community nodes"
                fi
            fi
            
            print_status "$GREEN" "🌐 Access at: http://localhost:5678"
            return 0
        fi
        
        echo "  Still waiting... (attempt $((attempt + 1))/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    print_status "$RED" "❌ Local update failed - n8n did not start properly"
    print_status "$YELLOW" "💡 Check logs: docker compose logs -f"
    return 1
}

# Function to update production Docker environment
update_production_docker() {
    local version="$1"
    
    # Validate SSH credentials
    if [ -z "$N8N_PROD_HOST" ] || [ -z "$N8N_PROD_USER" ] || [ -z "$N8N_PROD_PWD" ]; then
        print_status "$RED" "❌ Production SSH credentials not configured"
        echo "   Required: N8N_PROD_HOST, N8N_PROD_USER, N8N_PROD_PWD"
        return 1
    fi
    
    print_status "$BLUE" "🔄 Updating production n8n to version $version"
    
    # Get current version first
    local current_version=$(get_current_version_api "production")
    
    if [ "$current_version" = "$version" ]; then
        print_status "$GREEN" "✅ Production n8n already running version $version"
        return 0
    fi
    
    print_status "$YELLOW" "Current version: $current_version"
    print_status "$YELLOW" "Target version: $version"
    
    # Check SSH connection
    print_status "$YELLOW" "🔍 Checking SSH connection to production server..."
    if ! sshpass -p "$N8N_PROD_PWD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$N8N_PROD_USER@$N8N_PROD_HOST" "echo 'SSH OK'" >/dev/null 2>&1; then
        print_status "$RED" "❌ Cannot connect to production server $N8N_PROD_HOST"
        return 1
    fi
    
    # Check community nodes before update
    print_status "$BLUE" "🔍 Checking community nodes before update..."
    local nodes_before=$(check_community_nodes "production")
    if [ "$nodes_before" = "present" ]; then
        print_status "$GREEN" "✅ Community nodes detected before update"
    else
        print_status "$YELLOW" "⚠️  No community nodes detected before update"
    fi
    
    # Get current Docker container info
    local container_info=$(sshpass -p "$N8N_PROD_PWD" ssh -o StrictHostKeyChecking=no "$N8N_PROD_USER@$N8N_PROD_HOST" \
        "docker ps --format 'table {{.Names}}\t{{.Image}}' | grep n8n" 2>/dev/null || echo "")
    
    if [ -z "$container_info" ]; then
        print_status "$RED" "❌ No n8n Docker container found on production server"
        return 1
    fi
    
    print_status "$BLUE" "📦 Found n8n container: $container_info"
    
    # Create backup timestamp
    local backup_timestamp=$(date +%Y%m%d-%H%M%S)
    print_status "$BLUE" "💾 Creating backup: n8n-backup-$backup_timestamp"
    
    # Update production
    print_status "$BLUE" "🔄 Updating production n8n to version $version..."
    
    sshpass -p "$N8N_PROD_PWD" ssh -o StrictHostKeyChecking=no "$N8N_PROD_USER@$N8N_PROD_HOST" << EOF
        set -e
        
        # Find the current n8n container
        CONTAINER_NAME=\$(docker ps --format "{{.Names}}" | grep n8n | head -1)
        
        if [ -z "\$CONTAINER_NAME" ]; then
            echo "No n8n container found"
            exit 1
        fi
        
        echo "Updating container: \$CONTAINER_NAME"
        
        # Create backup
        mkdir -p /root/n8n-backups
        docker run --rm -v n8n_data:/source -v /root/n8n-backups:/backup alpine sh -c "
            mkdir -p /backup/n8n-backup-$backup_timestamp
            cp -r /source/* /backup/n8n-backup-$backup_timestamp/ 2>/dev/null || true
        "
        
        # Update docker-compose.yml with specific version
        cd /root
        sed -i "s|image: docker.n8n.io/n8nio/n8n.*|image: docker.n8n.io/n8nio/n8n:$version|" docker-compose.yml
        
        # Pull new version
        docker compose pull n8n
        
        # Stop and remove old container
        docker compose down n8n
        
        # Start with new version
        docker compose up -d n8n
        
        echo "Production updated to version $version"
EOF
    
    # Health check for production
    print_status "$YELLOW" "⏳ Waiting for production n8n to start..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f "https://workflows.thehealthsuite.co.uk/healthz" >/dev/null 2>&1; then
            print_status "$GREEN" "✅ Production n8n updated successfully to version $version"
            
            # Check community nodes after update
            print_status "$BLUE" "🔍 Checking community nodes after update..."
            sleep 10  # Give production n8n more time to fully start
            local nodes_after=$(check_community_nodes "production")
            
            if [ "$nodes_after" = "present" ]; then
                print_status "$GREEN" "✅ Community nodes still present after update"
            elif [ "$nodes_before" = "present" ]; then
                print_status "$YELLOW" "⚠️  Community nodes missing after update - redeploying..."
                if redeploy_community_nodes "production"; then
                    print_status "$GREEN" "✅ Community nodes restored successfully"
                else
                    print_status "$RED" "❌ Failed to restore community nodes"
                    print_status "$YELLOW" "💡 Run 'npm run deploy:prod' manually to restore community nodes"
                fi
            fi
            
            print_status "$GREEN" "🌐 Access at: https://workflows.thehealthsuite.co.uk"
            print_status "$GREEN" "💾 Backup available: n8n-backup-$backup_timestamp"
            
            # Update production version in .env
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/^N8N_PROD_VERSION=.*/N8N_PROD_VERSION=$version/" "$ENV_FILE"
            else
                sed -i "s/^N8N_PROD_VERSION=.*/N8N_PROD_VERSION=$version/" "$ENV_FILE"
            fi
            
            return 0
        fi
        
        echo "  Still waiting... (attempt $((attempt + 1))/$max_attempts)"
        sleep 3
        ((attempt++))
    done
    
    print_status "$RED" "❌ Production update failed - n8n did not start properly"
    print_status "$YELLOW" "💡 Consider manual rollback using backup: n8n-backup-$backup_timestamp"
    return 1
}

# Function to update n8n version (unified approach)
update_n8n_unified() {
    local env="$1"
    local version="$2"
    
    get_api_config "$env" || return 1
    
    # Check if n8n is accessible
    print_status "$YELLOW" "🔍 Checking $env n8n accessibility..."
    local current_version=$(get_current_version_api "$env")
    
    if [ "$current_version" = "unreachable" ]; then
        print_status "$RED" "❌ Cannot reach $env n8n at $HOST_URL"
        return 1
    fi
    
    # For Docker-based environments, we need to update the container
    if [ "$env" = "local" ]; then
        update_local_docker "$version"
    else
        update_production_docker "$version"
    fi
}

# Function to get current version
get_current_version_display() {
    local env="$1"
    
    if [ "$env" = "production" ]; then
        local version=$(get_current_version_api "production")
        echo "Production n8n version: $version"
    elif [ "$env" = "local" ]; then
        local version=$(get_current_version_api "local")
        echo "Local n8n version: $version"
    else
        # Show both
        local local_version=$(get_current_version_api "local")
        local prod_version=$(get_current_version_api "production")
        echo "Local n8n version: $local_version"
        echo "Production n8n version: $prod_version"
    fi
}

# Function to show usage
show_usage() {
    echo "🔄 Universal n8n Update Script (API-based) with Community Node Protection"
    echo ""
    echo "Features:"
    echo "  • Automatic community node detection before/after updates"
    echo "  • Auto-redeployment of missing community nodes after n8n updates"
    echo "  • GitHub API integration for proper stable/pre-release detection"
    echo "  • Backup creation for production updates"
    echo ""
    echo "Usage:"
    echo "  $0 [local|production] [version]          # Update to specific version"
    echo "  $0 [local|production] latest             # Update to latest stable version"
    echo "  $0 [local|production] current            # Show current version"
    echo "  $0 [local|production] list               # List available versions"
    echo "  $0 list                                  # List available versions"
    echo ""
    echo "Examples:"
    echo "  $0 local 1.55.3                         # Update local to version 1.55.3"
    echo "  $0 production latest                     # Update production to latest stable"
    echo "  $0 production current                    # Show production version"
    echo ""
    echo "Community Node Protection:"
    echo "  • Checks for Semble community node before update"
    echo "  • Automatically redeploys if missing after update"
    echo "  • Provides manual recovery instructions if auto-redeploy fails"
    echo ""
    echo "Environment Configuration:"
    echo "  Local: Uses API at $N8N_LOCAL_HOST"
    echo "  Production: Uses API at https://workflows.thehealthsuite.co.uk"
    echo ""
}

# Main script logic
case "$1" in
    "local"|"production")
        case "$2" in
            "list"|"versions")
                list_available_versions
                ;;
            "current")
                get_current_version_display "$1"
                ;;
            "latest")
                latest_version=$(get_latest_version)
                update_n8n_unified "$1" "$latest_version"
                ;;
            *)
                # Assume it's a version number
                update_n8n_unified "$1" "$2"
                ;;
        esac
        ;;
    "list"|"versions")
        list_available_versions
        ;;
    "current")
        get_current_version_display "both"
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    "")
        show_usage
        ;;
    *)
        get_current_version_display "local"
        ;;
esac
