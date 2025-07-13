# Deployment Guide

This guide covers deploying the n8n-nodes-semble package to production environments.

## Prerequisites

- Production n8n instance running in Docker
- SSH access to the production server
- Environment variables configured (see [Development Guide](development.md#environment-configuration))

## Production Deployment

The project includes automated deployment scripts that handle the entire deployment process.

### Quick Start

```bash
# Deploy to production (builds and deploys)
pnpm run deploy:prod

# Check deployment status
pnpm run status:prod
```

### Deployment Process

The deployment script performs these steps:

1. **Builds** the package locally with production optimizations
2. **Creates a backup** of the current installation
3. **Uploads** the package to the production server
4. **Installs** the package using n8n's community node method
5. **Restarts** the n8n container
6. **Verifies** the deployment was successful

### Environment Configuration

Create a `.env` file in your workspace root with production server details:

```bash
# Production server details
N8N_HOST=your-production-server.com
N8N_HOST_USER=root
N8N_HOST_PWD=your-ssh-password

# SSH key configuration
SSH_KEY_PATH=/path/to/your/ssh/private/key

# n8n container name (if different from default)
N8N_CONTAINER=your-n8n-container-name
```

## Deployment Commands

### Full Deployment
```bash
# Build package and deploy to production
pnpm run deploy:prod
```

This is the standard deployment command that:
- Runs linting to ensure code quality
- Builds the TypeScript code
- Creates a production package
- Deploys to the production server
- Restarts n8n and verifies the installation

### Status Check
```bash
# Check production deployment status
pnpm run status:prod
```

This command shows:
- n8n container status
- Installed package versions
- Recent container logs
- Installation verification

### Rollback
```bash
# Rollback to previous version
pnpm run rollback:prod
```

Automatically restores the previous version from backup if something goes wrong.

## Deployment Architecture

### How Community Nodes Work in n8n

n8n loads community nodes from the user's `.n8n/nodes/` directory, not from global npm packages. The deployment script handles this correctly by:

1. **Installing globally** first to make the package available
2. **Installing locally** in `/home/node/.n8n/nodes/` using npm
3. **Creating a symlink** from the user directory to the global package
4. **Updating package.json** in the user's nodes directory

### Production Installation Method

```bash
# The deployment script runs these commands in the n8n container:

# 1. Install globally
npm install -g --force /tmp/n8n-nodes-semble-*.tgz

# 2. Clean previous installation
cd /home/node/.n8n/nodes
npm uninstall n8n-nodes-semble --save

# 3. Install in user directory (creates proper symlink)
npm install /usr/local/lib/node_modules/n8n-nodes-semble/ --save

# 4. Restart n8n container
docker restart n8n-container
```

## Server Requirements

### n8n Configuration

Your production n8n must have community packages enabled:

```yaml
# docker-compose.yml
services:
  n8n:
    environment:
      - N8N_COMMUNITY_PACKAGES_ENABLED=true
      # ... other environment variables
```

### Docker Setup

The deployment assumes:
- n8n running in a Docker container
- Container name matches `N8N_CONTAINER` environment variable (default: `root-n8n-1`)
- SSH access to the Docker host
- Sufficient permissions to restart containers

## Troubleshooting Deployment

### Common Issues

**SSH Connection Failed**
```bash
# Test SSH connectivity
ssh your-user@your-server.com "echo 'SSH test successful'"

# Check SSH key permissions
chmod 600 /path/to/your/ssh/key
```

**Container Not Found**
```bash
# List available containers
ssh your-user@your-server.com "docker ps --format 'table {{.Names}}\t{{.Status}}'"

# Update N8N_CONTAINER in .env if needed
```

**Package Installation Failed**
```bash
# Check container logs
pnpm run status:prod

# Or SSH directly to check logs
ssh your-user@your-server.com "docker logs your-n8n-container --tail 50"
```

**Node Not Visible After Deployment**
1. Verify community packages are enabled
2. Check the package is installed in the user directory
3. Restart the n8n container
4. Clear browser cache

### Manual Verification

```bash
# SSH to production server
ssh your-user@your-server.com

# Check global installation
docker exec your-n8n-container npm list -g n8n-nodes-semble

# Check user directory installation
docker exec your-n8n-container cat /home/node/.n8n/nodes/package.json

# Check symlink
docker exec your-n8n-container ls -la /home/node/.n8n/nodes/node_modules/
```

## Backup and Recovery

### Automatic Backups

The deployment script automatically creates backups before each deployment:
- Stored in `/tmp/n8n-nodes-semble-backups/` on the production server
- Keeps the last 5 backups
- Includes timestamp in filename

### Manual Backup

```bash
# Create manual backup before deployment
ssh your-user@your-server.com "
  mkdir -p /tmp/manual-backup
  docker exec your-n8n-container tar -czf /tmp/backup.tar.gz -C /home/node/.n8n/nodes .
  docker cp your-n8n-container:/tmp/backup.tar.gz /tmp/manual-backup/nodes-$(date +%Y%m%d_%H%M%S).tar.gz
"
```

### Recovery Process

```bash
# Use automated rollback
pnpm run rollback:prod

# Or manual recovery via SSH
ssh your-user@your-server.com "
  LATEST_BACKUP=\$(ls -t /tmp/n8n-nodes-semble-backups/backup_*.tar.gz | head -1)
  docker cp \"\$LATEST_BACKUP\" your-n8n-container:/tmp/restore.tar.gz
  docker exec your-n8n-container sh -c 'cd /home/node/.n8n/nodes && tar -xzf /tmp/restore.tar.gz'
  docker restart your-n8n-container
"
```

## Monitoring and Maintenance

### Health Checks

```bash
# Regular health check
pnpm run status:prod

# Check API connectivity from n8n
curl -H "Authorization: Bearer YOUR_N8N_API_KEY" https://your-n8n-instance.com/api/v1/credentials
```

### Log Monitoring

```bash
# View recent n8n logs
ssh your-user@your-server.com "docker logs your-n8n-container --tail 100 -f"

# Check for Semble-related errors
ssh your-user@your-server.com "docker logs your-n8n-container 2>&1 | grep -i semble"
```

### Updates

```bash
# Deploy new version of Semble nodes
pnpm run deploy:prod

# Verify deployment
pnpm run status:prod

# Monitor logs for issues
ssh your-user@your-server.com "docker logs your-n8n-container --tail 50"
```

### n8n Version Management

The project includes unified n8n version management for both local and production environments:

```bash
# Check current n8n versions
pnpm run n8n:version

# Update production n8n to latest version
pnpm run update:n8n:production:latest

# Update to specific version
pnpm run update:n8n:production -- 1.102.0
```

**Important Notes:**
- n8n updates are separate from Semble node deployment
- Always test n8n updates in local environment first
- Production updates create automatic backups
- Updates modify the docker-compose.yml file with specific version tags
- Health checks ensure n8n is accessible after updates

For detailed information about n8n version management, see the [Development Guide](development.md#n8n-version-management).

## Security Considerations

### SSH Keys
- Use SSH keys instead of passwords when possible
- Ensure SSH keys have appropriate permissions (600)
- Store SSH keys securely and rotate regularly

### Environment Variables
- Store sensitive data in `.env` files, not in code
- Use different credentials for development and production
- Regularly rotate API keys and passwords

### Server Access
- Limit SSH access to specific IP addresses if possible
- Use fail2ban or similar tools to prevent brute force attacks
- Keep the production server updated with security patches

## Performance Optimization

### Deployment Speed
- Keep deployment packages small by excluding unnecessary files
- Use efficient build processes with proper caching

### Runtime Performance
- Monitor n8n memory usage after deployments
- Use appropriate polling intervals for triggers
- Implement proper error handling to prevent workflow failures

For more detailed troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).
