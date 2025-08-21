# Configuration Guide

Learn how to configure your Semble API credentials and customize the node settings for optimal performance.

## Semble API Credentials

### Obtaining API Credentials

## Managing Multiple Practices

The node supports connecting to different practices through separate credential configurations:

### Separate Credentials Approach
Create individual credentials for each practice you need to connect to:

```yaml
Credential 1: "Practice A - London"
  - API Token: your-london-practice-token
  - Base URL: https://open.semble.io/graphql
  - Environment: Production

Credential 2: "Practice B - Manchester" 
  - API Token: your-manchester-practice-token
  - Base URL: https://open.semble.io/graphql
  - Environment: Production
```

### Usage in Workflows
Select the appropriate credential in each node to connect to the desired practice:

1. **Different workflows per practice** - Recommended for completely separate operations
2. **Conditional credential selection** - Use n8n's credential switching for dynamic practice selection
3. **Practice-specific nodes** - Configure different nodes with different credentials within the same workflow

!!! note "Practice Isolation"
    Each API token is tied to a specific Semble practice. There's no cross-practice access or shared tokens, so you must obtain separate API tokens from each practice administrator. Semble practice management system**
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

Basic logging is available for troubleshooting:

**Available Logging:**
- Console logging for debug information during development
- n8n logger integration (when `debugMode` parameter is used in API calls)
- Error logging with stack traces for failed operations
- Basic request/response logging in debug mode

**Implementation Details:**
- The `sembleApiRequest` function accepts a `debugMode` parameter
- When enabled, logs API request details via `this.logger?.info()`
- Console logs are used for integration testing and development
- Error details are captured and logged during API failures

!!! note "Debug Mode Usage"
    Debug mode is enabled programmatically by setting the `debugMode` parameter when calling `sembleApiRequest()`. This is primarily used for development and testing rather than end-user configuration.

## Advanced Configuration

### Timeout Settings

Default timeout configurations (used by internal services):

| Timeout Type | Default Value | Description |
|--------------|---------------|-------------|
| **Request Timeout** | 30 seconds | Service-level API request timeout |
| **Connection Timeout** | 10 seconds | Service connection establishment timeout |
| **Operation Timeout** | 45 seconds | Complex operation timeout |
| **Batch Operations** | 2 minutes | Large batch operation timeout |

!!! note "Implementation Details"
    These timeouts are defined in `SEMBLE_CONSTANTS.TIMEOUTS` and used by internal services like `SembleQueryService`. The main `sembleApiRequest` function relies on n8n's default HTTP timeout behavior.

### Test Environment Detection

The nodes automatically detect test environments and adjust behavior accordingly:

| Detection Method | Description |
|------------------|-------------|
| **NODE_ENV=test** | Environment variable set to 'test' |
| **Jest Detection** | Jest test runner (`global.__jest__`) |
| **Development Indicators** | Other development environment signals |

#### Test Environment Adjustments

| Adjustment | Normal Environment | Test Environment | Purpose |
|------------|-------------------|------------------|---------|
| **Pagination Limit** | No limit | Maximum 5 pages | Prevent timeouts during automated testing |
| **Timeouts** | Standard values | Reduced timeouts | Faster failure detection |
| **Cache TTL** | Full duration | Shorter lifetimes | Test isolation |

!!! note "User Impact"
    If you're running n8n in a test environment (e.g., `NODE_ENV=test`), you may notice different pagination behavior in trigger nodes. This is intentional to prevent long-running tests.

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
| **Staff** | ✅ Required | ❌ Not needed | ❌ Not needed | Read-only access sufficient |
| **Doctors** | ✅ Required | ❌ Not needed | ❌ Not needed | Practitioner information |
| **Locations** | ✅ Required | ❌ Not needed | ❌ Not needed | Practice locations |

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
- [Create your first workflow →](first-workflow.md)
- [Explore available nodes →](../nodes/overview.md)
- [Browse workflow examples →](../examples/common-workflows.md)

---

**Previous**: [← Installation Guide](installation.md) | **Next**: [First Workflow →](first-workflow.md)
