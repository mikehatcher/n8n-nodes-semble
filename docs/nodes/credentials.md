# Credentials Configuration

Setting up secure authentication with the Semble API is essential for all workflows. This guide walks you through the complete credential setup process.

## Quick Setup

### 1. Obtain API Token
Contact your Semble administrator or follow these steps:

1. **Log into Semble** with an admin account
2. **Navigate to** API settings (usually under System → API Management)
3. **Generate new token** with appropriate permissions
4. **Copy the token** - you won't see it again!

### 2. Add Credentials in n8n

1. **Open any Semble node** in your workflow
2. **Click the credential dropdown** → "Create new credential"
3. **Enter your details**:
    - **Name**: `Semble Production API` (or similar)
    - **API Token**: Paste your token
    - **Base URL**: `https://open.semble.io/graphql`
4. **Test the connection**
5. **Save**

!!! success "Ready to go!"
    Your credentials are now configured and ready for use across all Semble nodes.

## Detailed Configuration

### Credential Fields

#### API Token (Required)
```yaml
Field: apiToken
Type: string (password)
Description: Your Semble API authentication token
Example: "ab12cd34ef56gh78ij90kl12mn34op56"
```

**Important**: The Semble API uses `x-token` header authentication, not Bearer tokens.

#### Base URL (Required)
```yaml
Field: baseUrl  
Type: string
Default: "https://open.semble.io/graphql"
Description: Semble GraphQL API endpoint
```

**Standard URLs**:
- **Production**: `https://open.semble.io/graphql`
- **Sandbox/Testing**: Contact Semble for test environment URLs

## Permission Requirements

### Token-Based Access Control

Semble uses flexible token-based permissions where each API token can be configured with specific access levels. When generating your token in the Semble application:

1. **Navigate to Settings** → **API Management** (or similar section)
2. **Generate a new token** with the permissions you need
3. **Configure access levels** for the resources your workflows require

!!! info "Flexible Permissions"
    Semble tokens are highly configurable. You can create tokens that only access specific resources (e.g., patients only) or tokens with broader access. The exact permission names depend on your Semble configuration.

### Resource Access Levels

The nodes support these Semble resources:

| Resource | Read Operations | Write Operations | Notes |
|----------|----------------|------------------|-------|
| **Patients** | Patient lookup, list | Patient creation, updates | Core functionality |
| **Bookings** | Appointment viewing, search | Booking creation, updates | Scheduling workflows |
| **Products** | Service/product catalog | Product management | Inventory integration |

### Permission Validation

Test your token permissions with this GraphQL query:
```graphql
query TestPermissions {
  patients(pagination: { first: 1 }) {
    data {
      id
      firstName
      email
    }
  }
  bookings(pagination: { first: 1 }) {
    data {
      id
      status
      appointmentType
    }
  }
  products(pagination: { first: 1 }) {
    data {
      id
      name
      category
    }
  }
}
```

If any field returns an object with `__MISSING_PERMISSION__`, your token lacks access to that specific field. The response structure will look like:
```json
{
  "__MISSING_PERMISSION__": "patients.read_email",
  "__FIELD_NAME__": "email",
  "__ERROR_MESSAGE__": "Access denied for field 'email' - missing permission 'patients.read_email'"
}
```

## Security Best Practices

### Token Management

#### ✅ Secure Practices
```yaml
✅ Store tokens in n8n credential manager only
✅ Use environment-specific tokens  
✅ Rotate tokens quarterly or as needed
✅ Monitor token usage and failed requests
✅ Revoke unused or compromised tokens immediately
✅ Limit token permissions to minimum required
```

#### ❌ Security Risks
```yaml
❌ Never hardcode tokens in workflows
❌ Don't share tokens between environments
❌ Avoid using admin tokens for routine operations
❌ Don't log or expose tokens in debug output
❌ Never commit tokens to version control
❌ Don't use the same token across multiple integrations
```

### Network Security

#### SSL/TLS Verification
```yaml
Requirement: All connections use HTTPS
Certificate: Automatically validated
Security: TLS 1.2 or higher required
```

#### IP Restrictions
If your Semble instance uses IP restrictions:
```yaml
n8n Cloud: Contact n8n support for IP addresses
Self-hosted: Configure firewall for your n8n server IP
Local development: May need VPN or proxy setup
```

## Troubleshooting

### Connection Issues

#### Invalid Token Error
```yaml
Error: "Authentication failed" or "401 Unauthorized"
Solution:
  1. Verify token is copied correctly (no extra spaces)
  2. Check token hasn't expired
  3. Confirm token has required permissions
  4. Contact Semble administrator if needed
```

#### Network/URL Issues
```yaml
Error: "Connection timeout" or "Host not found"
Solution:
  1. Verify Base URL is correct
  2. Check internet connectivity
  3. Confirm firewall/proxy settings
  4. Test URL in browser or curl
```

#### Permission Errors
```yaml
Error: "Insufficient permissions" or "Forbidden"
Solution:
  1. Check required permissions for operation
  2. Contact Semble administrator to verify token permissions
  3. Use read-only operations for testing
  4. Review API documentation for specific requirements
```

### Testing Connectivity

#### Quick Connection Test
Create a simple workflow:
```yaml
1. Add Semble node
2. Select credentials  
3. Choose "Get Many" → "Patient"
4. Set options limit to 1
5. Execute workflow
```

#### Detailed API Test
Use this GraphQL query to test full connectivity:
```graphql
query ConnectionTest {
  patients(pagination: { first: 1 }) {
    data {
      id
      firstName
      lastName
    }
    pageInfo {
      hasMore
    }
  }
}
```

#### cURL Testing
Test outside n8n with cURL:
```bash
curl -X POST https://open.semble.io/graphql \
  -H "Content-Type: application/json" \
  -H "x-token: YOUR_TOKEN_HERE" \
  -d '{"query": "query { patients(pagination: { first: 1 }) { data { id firstName } } }"}'
```

#### n8n Credential Test
The built-in credential test uses GraphQL introspection:
```graphql
query { __schema { types { name } } }
```
This verifies basic API connectivity and authentication without accessing sensitive data.

## Advanced Configuration

### Custom Headers
For special requirements, you can add custom headers:
```yaml
Custom Headers:
  x-practice-id: "your_practice_id"  # If required
  x-client-version: "n8n-integration-v2.0.0"
```

### Timeout Settings
Configure request timeouts for your environment:
```yaml
Connection Timeout: 30 seconds (default)
Read Timeout: 60 seconds (default)
Retry Attempts: 3 (automatic)
```

### Rate Limiting
Built-in rate limit handling:
```yaml
Default Limit: 120 requests per minute
Backoff Strategy: Exponential with jitter
Retry Delay: 1s, 2s, 4s, 8s...
Max Retries: 5 attempts
```

## Monitoring & Maintenance

### Regular Maintenance Tasks

#### Monthly
- ✅ Review API usage statistics
- ✅ Check for failed authentications
- ✅ Verify all credentials still work
- ✅ Update documentation if needed

#### Quarterly  
- ✅ Rotate API tokens
- ✅ Audit permission requirements
- ✅ Review security practices
- ✅ Update team access if needed

#### Annually
- ✅ Full security audit
- ✅ Review integration architecture
- ✅ Update disaster recovery plans
- ✅ Training for new team members

### Monitoring Setup

#### API Usage Tracking
```yaml
Metrics to Monitor:
  - Request success/failure rates
  - Response times
  - Rate limit usage
  - Error frequency by type
```

#### Alert Configuration
```yaml
Critical Alerts:
  - Authentication failures
  - Extended API downtime
  - Rate limit exceeded repeatedly
  
Warning Alerts:
  - Slow response times
  - Increased error rates
  - Permission changes needed
```

## Next Steps

With credentials configured, explore:

- **[Node Overview](overview.md)** - Understanding available operations
- **[Patient Operations](patient-nodes.md)** - Working with patient data
- **[First Workflow](../getting-started/first-workflow.md)** - Build your first automation
- **[Common Workflows](../examples/common-workflows.md)** - Ready-to-use examples

---

**Need help?** Check our **[Troubleshooting Guide](../examples/troubleshooting.md)** or contact support.
