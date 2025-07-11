# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the n8n-nodes-semble package.

## Installation Issues

### Node Not Visible in n8n

**Symptoms:**
- Semble nodes don't appear in the node list
- Search for "Semble" returns no results

**Solutions:**

1. **Check Community Packages are Enabled**
   ```bash
   # For self-hosted n8n, ensure this environment variable is set:
   N8N_COMMUNITY_PACKAGES_ENABLED=true
   ```

2. **Verify Installation Location**
   ```bash
   # The package must be in the user's n8n directory, not global
   # Check installation:
   docker exec your-n8n-container ls -la /home/node/.n8n/nodes/node_modules/
   
   # Should show a symlink to n8n-nodes-semble
   ```

3. **Restart n8n**
   ```bash
   # Restart the n8n container/service
   docker restart your-n8n-container
   ```

4. **Clear Browser Cache**
   - Hard refresh your browser (Ctrl+F5 or Cmd+Shift+R)
   - Clear browser cache and cookies for your n8n instance

### Installation Errors

**Error: "Package not found"**
- Verify the package name is correct: `n8n-nodes-semble`
- Check that community nodes are enabled in your n8n instance

**Error: "Permission denied"**
- Ensure you have admin access to install community nodes
- For self-hosted instances, check Docker container permissions

**Error: "pnpm not allowed"**
- This is expected in production - the deployment script removes pnpm restrictions
- Use the deployment scripts rather than manual installation

## Authentication Issues

### API Authentication Failures

**Symptoms:**
- "Unauthorized" or "Invalid API key" errors
- 401 HTTP status codes

**Solutions:**

1. **Verify API Credentials**
   ```bash
   # Test API key directly
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        "https://api.semble.co.uk/v1/practice/info"
   ```

2. **Check Practice ID**
   - Ensure the practice ID matches your Semble account
   - Find it in Semble: Settings > API

3. **API Key Permissions**
   - Verify the API key has the necessary permissions
   - Some operations require specific scopes

4. **Base URL**
   - Confirm you're using the correct API base URL
   - Default: `https://api.semble.co.uk`

### Credential Configuration

**Symptoms:**
- Can't save credentials
- Credentials appear but don't work

**Solutions:**

1. **Test Connection**
   - Use the "Test" button in the credential configuration
   - Check the error message for specific issues

2. **Re-create Credentials**
   - Delete and recreate the Semble API credentials
   - Ensure all fields are filled correctly

## Node Operation Issues

### No Data Returned

**Symptoms:**
- Nodes execute successfully but return empty results
- "No items to process" messages

**Solutions:**

1. **Check Date Filters**
   ```json
   // Example: Too restrictive date range
   {
     "dateFrom": "2024-01-01",
     "dateTo": "2024-01-02"  // Very narrow range
   }
   ```

2. **Verify Resource Exists**
   - Confirm the data exists in your Semble account
   - Check filter parameters aren't too restrictive

3. **Enable Debug Mode**
   - Turn on debug mode in trigger nodes
   - Check n8n logs for detailed API responses

### Rate Limiting

**Symptoms:**
- "Rate limit exceeded" errors
- 429 HTTP status codes
- Slow or failed requests

**Solutions:**

1. **Built-in Handling**
   - The nodes include automatic rate limiting
   - Retry logic with exponential backoff is implemented

2. **Reduce Request Frequency**
   - Increase polling intervals for triggers
   - Process data in smaller batches

3. **Contact Semble Support**
   - If rate limits are too restrictive for your use case
   - Request increased API limits

### Data Synchronization Issues

**Symptoms:**
- Trigger doesn't fire for new data
- Missing recent changes
- Duplicate processing

**Solutions:**

1. **Check Polling Configuration**
   ```json
   {
     "datePeriod": "1 Day",  // Increase if missing data
     "event": "New or Updated"  // vs "New Only"
   }
   ```

2. **Verify Time Zones**
   - Ensure your server and Semble times are synchronized
   - Check for daylight saving time issues

3. **Debug Polling**
   - Enable debug mode to see what data is being retrieved
   - Check the last execution time stored by n8n

## Performance Issues

### Slow Execution

**Symptoms:**
- Nodes take a long time to execute
- Timeouts during execution

**Solutions:**

1. **Optimize Queries**
   - Use specific date ranges instead of "all data"
   - Filter by status or other criteria to reduce dataset size

2. **Batch Processing**
   - Process large datasets in smaller chunks
   - Use pagination for large result sets

3. **Monitor Resource Usage**
   - Check n8n server CPU and memory usage
   - Scale up resources if needed

### Memory Issues

**Symptoms:**
- n8n container running out of memory
- "Out of memory" errors

**Solutions:**

1. **Limit Result Sets**
   ```json
   {
     "limit": 100,  // Process smaller batches
     "maxPages": 5  // Limit pagination
   }
   ```

2. **Increase Container Memory**
   ```yaml
   # docker-compose.yml
   services:
     n8n:
       deploy:
         resources:
           limits:
             memory: 2G  # Increase from default
   ```

## Deployment Issues

### Deployment Failures

**Symptoms:**
- Deployment script fails
- Package doesn't update in production

**Solutions:**

1. **Check SSH Connectivity**
   ```bash
   # Test SSH connection
   ssh your-user@your-server.com "echo 'Connection successful'"
   ```

2. **Verify Container Status**
   ```bash
   # Check if n8n container is running
   ssh your-user@your-server.com "docker ps | grep n8n"
   ```

3. **Review Deployment Logs**
   ```bash
   # Run with verbose output
   pnpm run deploy:prod
   
   # Check production status
   pnpm run status:prod
   ```

### Version Conflicts

**Symptoms:**
- Old version still showing after deployment
- Mixed versions in production

**Solutions:**

1. **Force Clean Installation**
   ```bash
   # SSH to production and manually clean
   ssh your-user@your-server.com "
     docker exec your-n8n-container rm -rf /home/node/.n8n/nodes/node_modules/n8n-nodes-semble
     docker exec your-n8n-container npm uninstall n8n-nodes-semble --save
   "
   
   # Then redeploy
   pnpm run deploy:prod
   ```

2. **Container Restart**
   ```bash
   # Force restart the n8n container
   ssh your-user@your-server.com "docker restart your-n8n-container"
   ```

## Development Issues

### Local Development Problems

**Symptoms:**
- Local n8n environment not working
- Changes not reflected in local testing

**Solutions:**

1. **Rebuild and Restart**
   ```bash
   # Complete rebuild cycle
   pnpm run dev:full
   
   # Check logs
   pnpm run logs:n8n
   ```

2. **Check Docker Status**
   ```bash
   # Ensure local n8n is running
   pnpm run start:n8n
   
   # Verify containers
   docker ps
   ```

3. **Clear n8n Cache**
   ```bash
   # Stop n8n, clear data, restart
   pnpm run stop:n8n
   docker volume rm n8n-local-test_n8n_data 2>/dev/null || true
   pnpm run start:n8n
   pnpm run setup:owner
   ```

### Build Issues

**Symptoms:**
- TypeScript compilation errors
- Build script failures

**Solutions:**

1. **Check Dependencies**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

2. **Type Checking**
   ```bash
   # Run TypeScript compiler directly
   npx tsc --noEmit
   
   # Check for type errors
   pnpm run lint
   ```

## Debugging Tools

### Enable Debug Logging

1. **In Trigger Nodes:**
   - Expand "Additional Options"
   - Enable "Debug Mode"
   - Check n8n logs for detailed output

2. **View Logs:**
   ```bash
   # Local development
   pnpm run logs:n8n
   
   # Production
   ssh your-user@your-server.com "docker logs your-n8n-container --tail 100"
   ```

### API Testing

```bash
# Test Semble API directly
curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     "https://api.semble.co.uk/v1/bookings?from=2024-01-01"

# Test with verbose output
curl -v -H "Authorization: Bearer YOUR_API_KEY" \
     "https://api.semble.co.uk/v1/practice/info"
```

### Network Diagnostics

```bash
# Check connectivity from n8n container
docker exec your-n8n-container curl -I https://api.semble.co.uk

# Check DNS resolution
docker exec your-n8n-container nslookup api.semble.co.uk
```

## Getting Help

### Information to Provide

When seeking help, include:

1. **Environment Details:**
   - n8n version
   - Node package version
   - Hosting environment (self-hosted/cloud)

2. **Error Information:**
   - Complete error messages
   - n8n logs around the time of the error
   - Steps to reproduce the issue

3. **Configuration:**
   - Node configuration (remove sensitive data)
   - Workflow setup
   - API endpoints being used

### Support Channels

- **GitHub Issues**: [Project Issues](https://github.com/mikehatcher/n8n-nodes-semble/issues)
- **n8n Community**: [Community Forum](https://community.n8n.io/)
- **Semble Support**: For API-specific issues

### Common Fixes Checklist

Before seeking help, try these common fixes:

- [ ] Restart n8n container/service
- [ ] Clear browser cache
- [ ] Verify API credentials
- [ ] Check community packages are enabled
- [ ] Review recent n8n logs
- [ ] Test API connection directly
- [ ] Verify node installation location
- [ ] Check for rate limiting issues
- [ ] Ensure date filters aren't too restrictive
- [ ] Try with debug mode enabled
