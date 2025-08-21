# Installation Guide

This guide will help you install and set up the n8n Semble community node v2.0 in your n8n instance.

!!! warning "Version 2.0 Breaking Changes"
    Version 2.0 includes breaking changes from v1.x. Please review the [migration guide](#migration-from-v1x) if upgrading from a previous version.

## Prerequisites

Before installing the Semble node, ensure you have:

- **n8n instance** (self-hosted or cloud) - minimum version 1.0+
- **Node.js 18.10+** (for self-hosted installations)
- **Semble API credentials** from your practice management system
- **Basic knowledge** of n8n workflows

## Installation Methods

### Method 1: n8n Community Nodes (Recommended)

The easiest way to install the Semble node is through n8n's community nodes feature.

#### For n8n Cloud Users:
1. Open your n8n instance
2. Go to **Settings** → **Community Nodes**
3. Click **Install a community node**
4. Enter the package name: `n8n-nodes-semble`
5. Click **Install**
6. Wait for the installation to complete
7. Restart your n8n instance if prompted

#### For Self-Hosted n8n:
```bash
# Navigate to your n8n installation directory
cd ~/.n8n

# Install the community node
npm install n8n-nodes-semble

# Restart n8n
n8n start
```

### Method 2: Manual Installation

For advanced users or custom setups:

```bash
# Clone the repository
```bash
# Clone the repository
git clone https://github.com/mikehatcher/n8n-nodes-semble.git

# Navigate to the project directory
cd n8n-nodes-semble

# Install dependencies (using pnpm - required)
pnpm install

# Build the project
pnpm build

# Link to your n8n instance
npm link
cd ~/.n8n
npm link n8n-nodes-semble
```

## Migration from v1.x

!!! danger "Breaking Changes in v2.0"
    If you're upgrading from v1.x, please note these breaking changes:

### Resource Name Changes
- `appointment` resource is now called `booking`
- `staff` resource has been removed
- New `products` resource added with full CRUD support

### Workflow Updates Required
Update your existing workflows to use the new resource names:
```javascript
// v1.x
{
  "resource": "appointment",
  "operation": "create"
}

// v2.0
{
  "resource": "booking", 
  "operation": "create"
}
```

### Enhanced Credentials
v2.0 includes enhanced credential validation - you may need to reconfigure your Semble API credentials.

## Verification

After installation, verify the node is available:

1. **Create a new workflow** in n8n
2. **Add a new node** by clicking the "+" button  
3. **Search for "Semble"** in the node library
4. **Confirm you see**:
    - **Semble** (for CRUD operations on patients, bookings, products)
    - **Semble Trigger** (for monitoring changes and triggering workflows)

## Troubleshooting

### Node Not Appearing
- **Restart n8n** completely - this is often required after community node installation
- **Check installation logs** for errors during the installation process
- **Verify Node.js version** (18.10+ required for v2.0)
- **Clear browser cache** and refresh the n8n interface

### Installation Errors
```bash
# Check n8n logs for detailed error information
tail -f ~/.n8n/logs/n8n.log

# Verify pnpm is available (required for v2.0)
pnpm --version

# If pnpm not installed:
npm install -g pnpm

# Verify npm/pnpm permissions
sudo chown -R $(whoami) ~/.npm
```

### Permission Issues
For self-hosted installations with permission errors:
```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH

# Alternative: use sudo for global installation (not recommended)
sudo npm install -g n8n-nodes-semble
```

### Version Conflicts
If you have v1.x installed:
```bash
# Uninstall previous version first
npm uninstall -g n8n-nodes-semble

# Clear npm cache
npm cache clean --force

# Install v2.0
npm install -g n8n-nodes-semble@2.0.0
```

## Next Steps

Once installed, proceed to:
- [Configuration Guide](configuration.md) - Set up your Semble API credentials
- [Node Reference](../nodes/overview.md) - Explore available operations
- [Workflow Examples](../examples/common-workflows.md) - See practical use cases

## Support

If you encounter issues:
- Check the [Troubleshooting Guide](../examples/troubleshooting.md)
- Review [GitHub Issues](https://github.com/mikehatcher/n8n-nodes-semble/issues)
- Join the [n8n Community Forum](https://community.n8n.io/)

---

**Next**: [Configure your Semble API credentials →](configuration.md)
