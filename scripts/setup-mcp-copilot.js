#!/usr/bin/env node

/**
 * Setup MCP for GitHub Copilot Chat in VS Code
 * This script dynamically reads from .env and updates VS Code settings
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const N8N_API_KEY = process.env.N8N_LOCAL_API_KEY;
const N8N_API_URL = process.env.N8N_LOCAL_HOST || 'http://localhost:5678';

if (!N8N_API_KEY) {
  console.error('❌ N8N_LOCAL_API_KEY not found in .env file');
  console.log('💡 Please add your n8n API key to the .env file:');
  console.log('   N8N_LOCAL_API_KEY=your_api_key_here');
  console.log('   Get it from: http://localhost:5678/settings/api');
  process.exit(1);
}

console.log('🔧 Setting up MCP for GitHub Copilot Chat...');
console.log(`🔗 Using n8n API URL: ${N8N_API_URL}`);
console.log(`🔑 Using API key: ${N8N_API_KEY.substring(0, 20)}...`);

// Create or update VS Code settings directory
const vscodeDir = path.join(__dirname, '../../.vscode');
const settingsPath = path.join(vscodeDir, 'settings.json');
const mcpPath = path.join(vscodeDir, 'mcp.json');

// Ensure .vscode directory exists
if (!fs.existsSync(vscodeDir)) {
  fs.mkdirSync(vscodeDir, { recursive: true });
}

// Create/update mcp.json (repository-specific configuration)
const mcpConfig = {
  "inputs": [
    {
      "id": "api-prompt",
      "type": "promptString", 
      "description": "Enter any additional context for n8n workflow operations"
    }
  ],
  "servers": {
    "n8n-workflow-manager": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "N8N_API_URL": `${N8N_API_URL}/api/v1`,
        "N8N_API_KEY": N8N_API_KEY,
        "LOG_LEVEL": "info"
      }
    }
  }
};

fs.writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
console.log('✅ Created .vscode/mcp.json configuration');

// Update settings.json for fallback compatibility
let settings = {};
if (fs.existsSync(settingsPath)) {
  try {
    const content = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(content);
    console.log('📝 Found existing settings.json, updating MCP configuration...');
  } catch (e) {
    console.log('⚠️  Could not parse existing settings.json, creating new MCP configuration');
  }
}

// Add/Update MCP configuration for Copilot Chat with current .env values
settings.mcpServers = {
  ...settings.mcpServers,
  "n8n-workflow-manager": {
    "command": "npx",
    "args": ["n8n-mcp"],
    "env": {
      "N8N_API_URL": `${N8N_API_URL}/api/v1`,
      "N8N_API_KEY": N8N_API_KEY,
      "LOG_LEVEL": "info"
    }
  }
};

// Write settings back with proper formatting
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('✅ Updated .vscode/settings.json configuration');

// Verify the configuration
console.log('\\n🔍 MCP Configuration:');
console.log(`   Server: n8n-workflow-manager`);
console.log(`   Command: npx n8n-mcp`);
console.log(`   API URL: ${N8N_API_URL}/api/v1`);
console.log(`   API Key: ${N8N_API_KEY.substring(0, 20)}...${N8N_API_KEY.substring(N8N_API_KEY.length - 4)}`);

console.log('\\n🎉 MCP setup complete with current .env values!');
console.log('\\nNext steps:');
console.log('1. � Restart VS Code to load the new MCP configuration');
console.log('2. 💬 Open GitHub Copilot Chat (Ctrl+Shift+I / Cmd+Shift+I)');
console.log('3. 🧪 Test: "Using the n8n MCP, list my workflows"');
console.log('4. 🚀 Modify: "Use MCP to get workflow vZTAEcAZ56Y6vRj2 and add domain extraction"');
console.log('\\n💡 Run "npm run setup:mcp" again if your API key changes!');

// Create a test script for MCP functionality
const testMcpPath = path.join(__dirname, 'test-mcp-copilot.js');
const testMcpContent = `#!/usr/bin/env node

/**
 * Test MCP functionality with GitHub Copilot Chat
 * You can ask Copilot to use this as a reference for MCP commands
 */

// Available MCP tools for n8n workflow management:
const availableTools = [
  {
    name: "n8n_get_workflow",
    description: "Get a specific workflow by ID",
    parameters: { id: "workflow_id" }
  },
  {
    name: "n8n_list_workflows", 
    description: "List all workflows",
    parameters: {}
  },
  {
    name: "n8n_update_full_workflow",
    description: "Update a complete workflow",
    parameters: { id: "workflow_id", workflow: "workflow_object" }
  },
  {
    name: "n8n_create_workflow",
    description: "Create a new workflow", 
    parameters: { workflow: "workflow_object" }
  },
  {
    name: "n8n_get_executions",
    description: "Get workflow executions",
    parameters: { workflowId: "workflow_id" }
  }
];

console.log("🤖 MCP Tools available for GitHub Copilot Chat:");
console.log(JSON.stringify(availableTools, null, 2));

// Example workflow modification request:
const exampleRequest = \`
Hey Copilot, using the n8n MCP server, can you:

1. Get my workflow with ID "vZTAEcAZ56Y6vRj2" 
2. Add a domain extraction node that processes email addresses
3. Add conditional logic to skip personal email domains
4. Add a Zoho account creation node for business domains
5. Update the workflow with these changes

The domain extraction should:
- Extract domain from email field
- Skip domains like gmail.com, yahoo.com, etc.
- Create account data with company name, website, industry
- Pass data to conditional node

The conditional node should:
- Check if skipAccountCreation is false
- Route to account creation if true
- Skip to contact creation if false

The account creation node should:
- Use Zoho CRM API
- Upsert accounts with duplicate check on Website field
- Set Account_Type to "Customer" and Industry to "Healthcare Services"
\`;

console.log("\\n📝 Example request for Copilot:");
console.log(exampleRequest);
`;

fs.writeFileSync(testMcpPath, testMcpContent);
fs.chmodSync(testMcpPath, '755');

console.log('✅ Test script created for MCP functionality');
console.log(`📍 Test script saved to: ${testMcpPath}`);

console.log('\\n🎉 MCP setup complete!');
console.log('\\nNext steps:');
console.log('1. Restart VS Code to load the new MCP configuration');
console.log('2. Open GitHub Copilot Chat');
console.log('3. Try asking: "Using the n8n MCP, list my workflows"');
console.log('4. Or ask: "Use MCP to get workflow vZTAEcAZ56Y6vRj2 and show me its structure"');
console.log('\\n💡 The MCP server gives Copilot direct access to your n8n instance!');
