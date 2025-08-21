#!/usr/bin/env node

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
const exampleRequest = `
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
`;

console.log("\n📝 Example request for Copilot:");
console.log(exampleRequest);
