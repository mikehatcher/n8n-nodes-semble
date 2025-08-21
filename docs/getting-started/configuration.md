# Configuration Guide

Learn how to configure your Semble API credentials and customize the node settings for optimal performance.

## Semble API Credentials

### Obtaining API Credentials

1. **Log into your Semble practice management system**
2. **Navigate to Settings** → **API Access** (or contact your administrator)
3. **Generate a new API token** with appropriate permissions
4. **Copy the token** - you'll need this for n8n configuration

!!! warning "API Token Security"
    Keep your API token secure and never share it publicly. Treat it like a password.

### Adding Credentials in n8n

1. **Open n8n** and go to **Credentials**
2. **Click "Create New Credential"**
3. **Search for "Semble"** and select **"Semble API"**
4. **Fill in the credential details**:

#### Credential Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Friendly name for this credential | `My Practice Semble API` |
| **API Token** | Your Semble API token | `eyJhbGciOiJIUzI1NiIsInR5c...` |
| **Base URL** | Semble API endpoint | `https://open.semble.io/graphql` |

#### Complete Configuration Example:
```yaml
Name: "Primary Practice API"
API Token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
Base URL: "https://open.semble.io/graphql"
```

### Testing Your Connection

1. **Save your credentials**
2. **Click "Test"** to verify the connection
3. **Successful test** should show: ✅ "Connection successful"
4. 3. Click **"Test"** to verify connectivity
4. **Failed test** might indicate:
    - Invalid API token
    - Network connectivity issues
    - Incorrect base URL

## System Configuration

### Caching Settings

The node uses intelligent caching to improve performance:

| Cache Type | TTL | Purpose |
|------------|-----|---------|
| **Default Cache** | 1 hour | General API responses and data |
| **Permissions** | 15 minutes | Field access permissions |
| **Field Discovery** | 1 hour | Available fields and types |
| **Introspection** | 24 hours | GraphQL schema data |

!!! note "Credential Caching"
    Credential validation results may be cached, but specific TTL depends on implementation. The system is designed to cache valid credentials for performance while maintaining security.

### Logging and Debugging

The node provides comprehensive logging capabilities for troubleshooting issues:

#### Activating Debug Logging

**Method 1: n8n Environment Variable**
Set the n8n log level to see detailed node execution logs:
```bash
# Set environment variable before starting n8n
export N8N_LOG_LEVEL=debug

# Then start n8n
n8n start
```

**Method 2: Node Configuration**

Some nodes have individual debug options:

1. **Open a Semble node** in your workflow
2. **Look for "Debug Mode"** or "Enable Logging" in Options section
3. **Enable the option** to see detailed execution logs
4. **Check the execution logs** in n8n's execution view

#### Available Logging Levels

| Log Level | What Gets Logged | When to Use |
|-----------|------------------|-------------|
| **Error** | Errors and failures only | Production environments |
| **Warn** | Warnings and errors | Production with monitoring |
| **Info** | General information, errors, warnings | Development and staging |
| **Debug** | Detailed execution information | Troubleshooting issues |
| **Verbose** | Complete request/response data | Deep debugging |

#### Where to Find Logs

**In n8n Interface:**

1. **Workflow Execution View** → Click on any node to see its execution log
2. **Executions List** → View detailed logs for each workflow run
3. **Node Output** → Inspect data flowing between nodes

**In n8n Server Logs:**

- **Docker users**: `docker logs n8n-container-name`
- **PM2 users**: Check PM2 logs or `/var/log/n8n/`
- **Direct installation**: Check console output or configured log files

**What Gets Logged:**
- API request URLs and parameters (without sensitive data)
- Response status codes and execution times
- GraphQL query details (in debug mode)
- Permission check results
- Cache hit/miss information
- Error messages with stack traces

#### Debugging Common Issues

**Enable verbose logging for specific problems:**

```bash
# For API connectivity issues
export N8N_LOG_LEVEL=debug
export N8N_LOG_OUTPUT=console

# Start n8n and watch the console
n8n start
```

**Log Analysis Tips:**
- Look for HTTP status codes (200=success, 401=auth error, 429=rate limit)
- Check for `MISSING_PERMISSION` messages in debug logs
- Monitor request timing for performance issues
- Search for error stack traces for technical failures

!!! warning "Log Security"
    Debug logging may include API responses in logs. Ensure logs are secure and not accessible to unauthorized users. API tokens are never logged regardless of log level.

## Advanced Configuration

### Timeout Settings

The node handles timeouts at two levels:

#### Node-Level Timeouts
Each Semble node includes a **"Timeout (seconds)"** field in its configuration:

| Setting | Default | Range | Purpose |
|---------|---------|-------|---------|
| **Node Timeout Field** | 60 seconds | 10-300 seconds | Maximum time to wait for a single node execution |

**How to Configure:**

1. **Open any Semble node** in your workflow
2. **Scroll to "Options"** section
3. **Set "Timeout (seconds)"** field to your desired value
4. **Recommended values**:
   - Simple operations: 30-60 seconds
   - Complex queries: 60-120 seconds
   - Bulk operations: 120-300 seconds

#### Internal Service Timeouts
The node also uses internal timeout configurations for API operations:

| Timeout Type | Default Value | Description |
|--------------|---------------|-------------|
| **API Request Timeout** | 30 seconds | Individual API call timeout |
| **Connection Timeout** | 10 seconds | Time to establish connection |
| **Complex Operations** | 45 seconds | Multi-step operations |
| **Batch Operations** | 2 minutes | Large batch processing |

!!! tip "Timeout Configuration"
    If you're experiencing timeout errors, increase the **"Timeout (seconds)"** field in your node configuration. The internal service timeouts are optimised and typically don't need adjustment.

### Test Environment Detection

The node automatically detects when it's running in test environments and adjusts behaviour to prevent issues during development and automated testing.

#### How Test Environments Are Detected

The node checks for several indicators to determine if it's in a test environment:

| Detection Method | Check | Description |
|------------------|-------|-------------|
| **NODE_ENV Variable** | `process.env.NODE_ENV === 'test'` | Standard Node.js environment indicator |
| **Jest Test Runner** | `typeof global.__jest__ !== 'undefined'` | Detects Jest testing framework |
| **Development Mode** | `process.env.NODE_ENV === 'development'` | Development environment detection |
| **CI Environment** | `process.env.CI === 'true'` | Continuous integration detection |
| **n8n Test Mode** | n8n-specific test indicators | When n8n is running in test mode |

#### Test Environment Adjustments

When a test environment is detected, the node automatically applies these changes:

| Setting | Production | Test Environment | Reason |
|---------|------------|------------------|---------|
| **Pagination Limit** | Unlimited | Maximum 5 pages | Prevents long-running tests |
| **Cache TTL** | Full duration (1 hour) | 30 seconds | Faster test isolation |
| **Request Timeouts** | 30 seconds | 10 seconds | Quicker failure detection |
| **Retry Attempts** | 3 attempts | 1 attempt | Faster test execution |
| **Debug Logging** | Disabled | Enhanced | Better test diagnostics |

#### Checking Your Environment

To verify what environment the node detects:

**Option 1: Check n8n Logs**
Look for messages like:
```
[DEBUG] Semble Node: Test environment detected, applying test configurations
[DEBUG] Environment checks: NODE_ENV=test, Jest=true, CI=false
```

**Option 2: Use a Simple Workflow**
Create a test workflow with a Semble trigger node and check the execution logs for environment detection messages.

**Option 3: Environment Variables**
Check your current environment:
```bash
echo "NODE_ENV: $NODE_ENV"
echo "CI: $CI"
echo "Jest detection: $npm_config_user_config"
```

#### Forcing Production Behaviour

If you need production behaviour in a test environment:
```bash
# Temporarily override environment detection
export SEMBLE_FORCE_PRODUCTION=true
export NODE_ENV=production

# Start n8n
n8n start
```

!!! note "User Impact"
    Most users won't notice these adjustments unless running n8n in development/test setups. The changes are designed to make testing more reliable without affecting normal operation.

### Retry Configuration

The node has different retry implementations depending on the function used:

**Main API Function (`sembleApiRequest`):**

| Setting | Value | Description |
|---------|-------|-------------|
| **Max Retries** | 3 attempts (configurable) | Set via function parameter |
| **Backoff Strategy** | Exponential (2x) | Simple: 1s, 2s, 4s, 8s... |
| **Retryable Status Codes** | ≥500 | Server errors only |
| **Jitter** | None | Fixed exponential backoff |

**Service Layer (`SembleQueryService`):**

| Setting | Value | Description |
|---------|-------|-------------|
| **Max Retries** | 3 attempts | From `SEMBLE_CONSTANTS.RETRY.MAX_RETRIES` |
| **Critical Operations** | 5 attempts | From `SEMBLE_CONSTANTS.RETRY.MAX_RETRIES_CRITICAL` |
| **Initial Delay** | 1 second | From `SEMBLE_CONSTANTS.RETRY.INITIAL_DELAY` |
| **Max Delay** | 10 seconds | From `SEMBLE_CONSTANTS.RETRY.MAX_DELAY` |
| **Backoff Strategy** | Exponential (2x) | With 10% jitter |
| **Retryable Status Codes** | 429, 500, 502, 503, 504 | Network and server errors |

!!! note "Implementation Differences"
    The main node operations use `sembleApiRequest` with simpler retry logic (server errors ≥500 only), while internal services use `SembleQueryService` with more comprehensive retry handling including rate limiting (429) errors.

## Permission Management

### Required Permissions

Ensure your API token has access to the resources you need:

| Resource | Read | Write | Delete | Notes |
|----------|------|-------|--------|-------|
| **Patients** | ✅ Required | ⚠️ Optional | ❌ Typically restricted | Core functionality |
| **Bookings** | ✅ Required | ⚠️ Optional | ⚠️ Optional | Appointment management |
| **Products** | ✅ Required | ⚠️ Optional | ⚠️ Optional | Service and product data |

!!! note "Permission Verification"
    The system includes built-in permission checking that will identify restricted fields during API calls. Use the permission discovery script (`scripts/discover-permissions.js`) to test your token's actual permissions.

### Built-in Permission Handling

The node includes sophisticated permission checking that handles restricted access gracefully:

**Permission Indicators:**
- Restricted fields return a `__MISSING_PERMISSION__` object instead of data
- Error messages clearly identify which permissions are required
- The system caches permission results for 15 minutes to improve performance

**Example of Permission-Restricted Response:**
```json
{
  "id": "patient123",
  "firstName": "John",
  "lastName": "Doe",
  "medicalHistory": {
    "__MISSING_PERMISSION__": {
      "message": "Access denied - requires patients.read_medical_history permission",
      "field": "medicalHistory",
      "requiredPermission": "patients.read_medical_history",
      "timestamp": "2025-08-13T10:30:00.000Z"
    }
  }
}
```

**Testing Permissions:**
```bash
# Run the permission discovery script
node scripts/discover-permissions.js

# This will test your API token against various endpoints
# and report which permissions you have access to
```

### Handling Permission Errors

When you encounter permission errors:

1. **Check the error message** for specific field restrictions
2. **Review the `__MISSING_PERMISSION__` objects** in response data
3. **Contact your Semble administrator** to adjust permissions
4. **Use read-only operations** if write access isn't available
5. **Test with the discovery script** to verify token capabilities

## Best Practices

### Security
- ✅ Use separate credentials for different practices
- ✅ Regularly rotate API tokens
- ✅ Monitor API usage logs
- ❌ Never commit tokens to version control

### Performance
- ✅ Use appropriate caching settings
- ✅ Implement appropriate polling intervals (minimum 30 seconds)
- ✅ Batch operations when possible (up to 10 items per batch)
- ✅ Monitor rate limit headers in responses
- ❌ Avoid excessive API calls (600/minute limit)

### Monitoring
- ✅ Set up error notifications
- ✅ Monitor rate limit usage
- ✅ Track successful vs failed requests
- ✅ Log important workflow executions

## Troubleshooting

### Common Configuration Issues

#### "Invalid API Token" Error
```yaml
Problem: 401 Unauthorized
Solution: 
  - Verify token hasn't expired
  - Check token permissions
  - Ensure correct base URL
```

#### "Rate Limit Exceeded" Error
```yaml
Problem: 429 Too Many Requests
Current Limits: 600 requests/minute, 10 requests/second
Solution:
  - Increase polling intervals (minimum 30 seconds recommended)
  - Implement request batching where possible
  - Contact Semble for rate limit increase if needed
```

#### "Network Timeout" Error
```yaml
Problem: Request timeout
Solution:
  - Check internet connectivity
  - Increase timeout settings
  - Verify Semble API status
```

### Diagnostic Commands

Test your configuration manually:
```bash
# Test API connectivity
curl -X POST https://open.semble.io/graphql \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_TOKEN_HERE" \
  -d '{"query": "query { patients { data { id firstName } } }"}'
```

## Next Steps

With your credentials configured:
- [Explore available nodes →](../nodes/overview.md)
- [Browse workflow examples →](../examples/common-workflows.md)
- [View workflow templates →](../examples/templates/)

---

**Previous**: [← Installation Guide](installation.md) | **Next**: [Node Overview →](../nodes/overview.md)
