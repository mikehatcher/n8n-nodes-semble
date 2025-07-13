# Development Guide

This guide covers setting up a development environment, understanding the codebase, and contributing to the n8n-nodes-semble project.

## Prerequisites

- Node.js ≥18.10
- pnpm ≥7.18 (enforced by preinstall script)
- Docker and Docker Compose (for local n8n testing)
- Git

## Project Setup

### 1. Clone and Install

```bash
git clone https://github.com/mikehatcher/n8n-nodes-semble.git
cd n8n-nodes-semble
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the workspace root (not in the project directory):

```bash
# SSH Key Configuration
SSH_KEY_PATH=/path/to/your/ssh/key

# n8n host configuration (for production deployment)
N8N_HOST=your-production-server.com
N8N_HOST_USER=root
N8N_HOST_PWD=your-password

# n8n Configuration
N8N_ADMIN_EMAIL=your-email@example.com
N8N_ADMIN_PASSWORD=your-password
N8N_ADMIN_FIRST_NAME=your_first_name
N8N_ADMIN_LAST_NAME=your_last_name
```

## Script Reference

The project uses organized npm scripts grouped by purpose:

### Package Management
```bash
# Enforce pnpm usage (runs automatically)
pnpm run preinstall

# Build before publishing (runs automatically)
pnpm run prepublishOnly
```

### Build & Development
```bash
# Build TypeScript and icons
pnpm run build

# Watch mode for development
pnpm run dev
```

### Code Quality
```bash
# Check code style and rules
pnpm run lint

# Auto-fix linting issues
pnpm run lint:fix
# or
pnpm run lintfix

# Format code with Prettier
pnpm run format
```

### Local Development & Testing
```bash
# Build and package for local testing
pnpm run pack:local

# Install package to local n8n
pnpm run install:node

# Full update cycle (build, pack, install)
pnpm run update:node

# Complete development workflow (build, pack, install, restart n8n)
pnpm run dev:full

# Test environment setup
pnpm run test:env
```

### Local n8n Environment Management
```bash
# Set up local n8n test environment
pnpm run setup:test-env

# Set up n8n owner account
pnpm run setup:owner

# Start local n8n container
pnpm run start:n8n

# Stop local n8n container
pnpm run stop:n8n

# Restart local n8n container
pnpm run restart:n8n

# View n8n container logs
pnpm run logs:n8n
```

### n8n Version Management
```bash
# Check current versions (both local and production)
pnpm run n8n:version

# Check current local version
pnpm run n8n:version:local

# Check current production version
pnpm run n8n:version:production

# List available n8n versions
pnpm run n8n:versions

# Update local n8n to latest version
pnpm run update:n8n:local:latest

# Update production n8n to latest version
pnpm run update:n8n:production:latest

# Update local n8n to specific version
pnpm run update:n8n:local -- 1.102.0

# Update production n8n to specific version
pnpm run update:n8n:production -- 1.102.0

# Generic update commands (defaults to latest)
pnpm run update:n8n:local
pnpm run update:n8n:production
```

#### How n8n Version Management Works

The n8n version management system provides unified API-based control over both local and production n8n environments:

**Local Environment:**
- Uses Docker Compose in `../n8n-local-test/`
- Updates the `N8N_VERSION` variable in workspace `.env` file
- Pulls the specified Docker image version
- Restarts the container with health checks

**Production Environment:**
- Connects via SSH to the production server
- Updates the `docker-compose.yml` file with the specific version tag
- Creates automatic backups before updates
- Handles Traefik reverse proxy configuration
- Performs health checks after deployment

**Features:**
- ✅ **API-based connectivity**: Uses n8n REST API for health checks
- ✅ **Automatic backups**: Production updates create timestamped backups
- ✅ **Health monitoring**: Waits for n8n to be accessible after updates
- ✅ **Version tracking**: Updates `.env` file with current versions
- ✅ **Error handling**: Comprehensive error reporting and rollback guidance
- ✅ **Unified interface**: Same commands work for both environments

**Configuration:**
All credentials and endpoints are managed via the workspace `.env` file:
- `N8N_LOCAL_*`: Local environment configuration
- `N8N_HOST_*`: Production SSH and API credentials
- `N8N_VERSION`: Current local version
- `N8N_PRODUCTION_VERSION`: Current production version

### Production Deployment
```bash
# Build production package
pnpm run pack:prod

# Full production deployment
pnpm run deploy:prod

# Quick deploy (skip build)
pnpm run deploy:prod:quick

# Rollback production deployment
pnpm run rollback:prod

# Check production status
pnpm run status:prod
```

## Development Workflow

### 1. Local Development Setup

```bash
# Set up local n8n environment (first time only)
pnpm run setup:test-env

# Start local n8n
pnpm run start:n8n

# Set up owner account (first time only)
pnpm run setup:owner
```

### 2. Development Cycle

```bash
# Start development with watch mode
pnpm run dev

# In another terminal, update the local n8n installation
pnpm run dev:full

# View logs if needed
pnpm run logs:n8n
```

### 3. Testing Changes

1. Make your code changes
2. Run `pnpm run dev:full` to build and update local n8n
3. Test the nodes in the local n8n interface
4. Check functionality and debug as needed

### 4. Code Quality

Before committing:

```bash
# Check and fix code style
pnpm run lint:fix

# Format code
pnpm run format

# Build to ensure no errors
pnpm run build
```

### 5. n8n Version Management Workflow

**Checking Current Versions:**
```bash
# Check both environments
pnpm run n8n:version

# Check specific environment
pnpm run n8n:version:local
pnpm run n8n:version:production
```

**Updating Local Environment:**
```bash
# Update to latest version
pnpm run update:n8n:local:latest

# Update to specific version for testing
pnpm run update:n8n:local -- 1.102.0

# After update, restart your node development
pnpm run restart:n8n
pnpm run dev:full
```

**Updating Production Environment:**
```bash
# Check what's available first
pnpm run n8n:versions

# Update to latest stable version
pnpm run update:n8n:production:latest

# Or update to specific version
pnpm run update:n8n:production -- 1.102.0
```

**Best Practices:**
- Always test n8n updates in local environment first
- Check release notes for breaking changes before updating
- Production updates create automatic backups
- Keep local and production versions synchronized when possible
- Use specific version numbers rather than "latest" for production

**Troubleshooting:**
- If update fails, check the logs with `pnpm run logs:n8n`
- For production issues, backups are available in `/root/n8n-backups/`
- Health checks ensure n8n is accessible after updates
- SSH connection issues are reported with troubleshooting hints

## Project Structure

```
n8n-nodes-semble/
├── credentials/              # API credential definitions
│   └── SembleApi.credentials.ts
├── nodes/                    # Node implementations
│   └── Semble/
│       ├── Semble.node.ts           # Main Semble node
│       ├── SembleTrigger.node.ts    # Trigger node
│       ├── GenericFunctions.ts     # Shared API functions
│       └── descriptions/            # UI property definitions
├── scripts/                  # Development and deployment scripts
├── docs/                     # Documentation
├── dist/                     # Compiled output (generated)
└── package.json             # Project configuration
```

## Key Architecture Concepts

### Modular DRY Architecture
The project uses a modular, extensible architecture built on DRY principles:

#### Base Classes
- **`BaseResource`**: Shared CRUD operations for all resources (booking, patient, etc.)
- **`BaseTrigger`**: Shared polling logic for all triggers
- **`FieldHelpers`**: Reusable field description utilities

#### Resource System
- **`BookingResource`**: Handles booking-specific operations
- **`PatientResource`**: Handles patient-specific operations  
- **Resource Registry**: Dynamic resource handling for easy extension
- **Trigger Classes**: `BookingTrigger`, `PatientTrigger` for resource-specific configurations

#### Permission & Field Handling
- **Centralized permission checking** to avoid code duplication
- **Excluded fields mechanism** for performance optimization
- **Null value handling** with explanatory messages for users

### Debug Logging
Comprehensive logging system for troubleshooting:
- Enable debug mode in trigger nodes
- Logs include API requests, responses, and error details
- Rate limiting and retry logic is logged

### Extensible Design
The codebase is designed for easy extension:
- New resources can be added by extending base classes
- UI descriptions are modular and reusable
- API functions are generalized for multiple resources

## Adding New Features

### Adding a New Resource

The modular architecture makes adding new resources straightforward:

1. **Create Base Classes**:
   ```typescript
   // resources/NewResource.ts
   export class NewResource extends BaseResource {
     // Resource-specific CRUD operations
   }
   
   // triggers/NewTrigger.ts  
   export const NEW_TRIGGER_CONFIG: TriggerResourceConfig = {
     // Trigger-specific configuration
   }
   ```

2. **Create UI Description**:
   ```typescript
   // descriptions/NewDescription.ts
   export const newDescription = {
     // Field definitions using FieldHelpers
   }
   ```

3. **Register the Resource**:
   ```typescript
   // resources/index.ts
   export { NewResource } from './NewResource';
   
   // triggers/index.ts  
   export { NEW_TRIGGER_CONFIG } from './NewTrigger';
   ```

4. **Update Main Nodes**: Add the new resource to the resource registry
5. **Test thoroughly** with the local environment

### Adding New Operations

1. **Add operation definition** in the description file using `FieldHelpers`
2. **Implement the operation** in the resource class
3. **Add any required UI fields** using the shared field utilities
4. **Update documentation** to reflect the new operation

## Production Deployment

See the [Deployment Guide](deployment.md) for detailed production deployment instructions.

## Debugging

### Local Development
- Use `pnpm run logs:n8n` to view container logs
- Enable debug mode in trigger nodes
- Check the browser console for client-side errors

### Production Issues
- Use `pnpm run status:prod` to check deployment status
- Check production n8n logs via SSH
- Review API responses and rate limiting

## Contributing

### Pull Request Process

1. **Fork** the repository
2. **Create a feature branch** from `main`
3. **Make your changes** following the coding standards
4. **Test thoroughly** using the local environment
5. **Run code quality checks** (`lint:fix`, `format`)
6. **Submit a pull request** with a clear description

### Coding Standards

- Use TypeScript with strict type checking
- Follow the existing code organization
- Add comprehensive error handling
- Include debug logging for new features
- Update documentation for user-facing changes

### Commit Messages

Use conventional commit format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for test changes

## Support

- **Issues**: [GitHub Issues](https://github.com/mikehatcher/n8n-nodes-semble/issues)
- **Documentation**: [Project Docs](index.md)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io/)
