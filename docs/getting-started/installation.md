# Installation Guide

This guide will help you install and set up the n8n Semble community node in your n8n instance.

## Prerequisites

Before installing the Semble node, ensure you have:

- **n8n instance** (self-hosted or cloud)
- **Node.js 18+** (for self-hosted installations)
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
git clone https://github.com/mikehatcher/n8n-nodes-semble.git

# Navigate to the project directory
cd n8n-nodes-semble

# Install dependencies
pnpm install

# Build the project
pnpm build

# Link to your n8n instance
npm link
cd ~/.n8n
npm link n8n-nodes-semble
```

## Verification

After installation, verify the node is available:

1. **Create a new workflow** in n8n
2. **Add a new node** by clicking the "+" button
3. **Search for "Semble"** in the node library
4. **Confirm you see**:
    - Semble (for CRUD operations)
    - Semble Trigger (for monitoring changes)

## Troubleshooting

### Node Not Appearing
- **Restart n8n** completely
- **Check installation logs** for errors
- **Verify Node.js version** (18+ required)
- **Clear browser cache** and refresh

### Installation Errors
```bash
# Check n8n logs
tail -f ~/.n8n/logs/n8n.log

# Verify npm/pnpm permissions
sudo chown -R $(whoami) ~/.npm
```

### Permission Issues
For self-hosted installations with permission errors:
```bash
# Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

## Next Steps

Once installed, proceed to:
- [Configuration Guide](configuration.md) - Set up your Semble API credentials
- [First Workflow](first-workflow.md) - Create your first Semble automation
- [Node Reference](../nodes/overview.md) - Explore available operations

## Support

If you encounter issues:
- Check the [Troubleshooting Guide](../examples/troubleshooting.md)
- Review [GitHub Issues](https://github.com/mikehatcher/n8n-nodes-semble/issues)
- Join the [n8n Community Forum](https://community.n8n.io/)

---

**Next**: [Configure your Semble API credentials →](configuration.md)
