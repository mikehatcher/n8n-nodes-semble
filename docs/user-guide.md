# User Guide

This guide will help you set up and use the Semble nodes in your n8n workflows.

## Prerequisites

- n8n instance (self-hosted or cloud)
- Semble practice management system with API access
- Semble API credentials

## Installation

### n8n Cloud
1. In your n8n instance, go to **Settings** > **Community Nodes**
2. Click **Install a Community Node**
3. Enter: `n8n-nodes-semble`
4. Click **Install**

### Self-Hosted n8n
```bash
# In your n8n installation directory
npm install n8n-nodes-semble
```

Then restart your n8n instance.

## Setting Up Credentials

Before using the Semble nodes, you need to configure your API credentials.

### 1. Get Your Semble API Key

1. Log into your Semble practice management system
2. Navigate to **Settings** > **API**
3. Generate or copy your API key
4. Note your practice ID (visible in the API settings)

### 2. Create Credentials in n8n

1. In n8n, go to **Credentials**
2. Click **Create New Credential**
3. Search for and select **Semble API**
4. Fill in the required fields:
   - **API Key**: Your Semble API key
   - **Practice ID**: Your Semble practice ID
   - **Base URL**: Usually `https://open.semble.io/graphql`
5. Click **Save**

## Using the Nodes

### Semble Node

The Semble node allows you to perform operations on your Semble data.

#### Available Resources
- **Booking**: Create, read, update, delete, and list bookings


### Semble Trigger

The Semble Trigger node monitors for changes in your Semble data and triggers workflows automatically.

#### How It Works
- The trigger polls the Semble API at regular intervals
- It checks for new or updated records since the last run
- When changes are found, it triggers your workflow
- Each changed record becomes a separate workflow execution

## Advanced Configuration

### Debug Mode
Enable debug mode in the trigger to see detailed logging information:
1. In the Semble Trigger node
2. Expand **Additional Options**
3. Enable **Debug Mode**
4. Check your n8n logs for detailed information

### Rate Limiting
The nodes include built-in rate limiting to respect Semble's API limits:
- Automatic retry with exponential backoff
- Respect for API rate limit headers
- Queue management for multiple requests

## Common Use Cases

### Appointment Notifications
Use the Semble Trigger to monitor new bookings and send notifications via email, SMS, or Slack.

### Data Synchronization
Sync booking data between Semble and other systems like CRM platforms or calendar applications.

### Automated Workflows
Create automated workflows for appointment confirmations, reminders, and follow-ups.

### Reporting
Extract booking data for custom reporting and analytics.

## Troubleshooting

### Common Issues

**Node not visible in n8n**
- Ensure community nodes are enabled in your n8n instance
- Restart n8n after installation
- Check n8n logs for installation errors

**Authentication errors**
- Verify your API key is correct
- Check that your practice ID matches your Semble account
- Ensure the API key has the necessary permissions

**No data returned**
- Check your date filters aren't too restrictive
- Verify the resource exists in your Semble account
- Enable debug mode to see detailed API responses

**Rate limiting errors**
- The nodes handle rate limiting automatically
- If you see persistent errors, contact Semble support about your API limits

For more detailed troubleshooting, see the [Troubleshooting Guide](troubleshooting.md).

## Support

- [GitHub Issues](https://github.com/mikehatcher/n8n-nodes-semble/issues) - Report bugs or request features
- [Semble API Documentation](https://help.semble.co.uk/en/articles/2633976-semble-api) - Official API docs
- [n8n Community Forum](https://community.n8n.io/) - General n8n support
