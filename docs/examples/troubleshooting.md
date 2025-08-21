# Troubleshooting Guide

Comprehensive troubleshooting guide for resolving common issues with Semble n8n integration, from basic connectivity problems to complex workflow debugging.

## 🚨 Quick Diagnosis

### First Steps Checklist
```yaml
1. ✅ Check API Credentials
    - Verify token is correct
    - Confirm base URL
    - Test with simple query

2. ✅ Verify Connectivity  
    - Internet connection stable
    - Firewall/proxy settings
    - DNS resolution working

3. ✅ Review Recent Changes
    - Workflow modifications
    - Credential updates
    - System updates

4. ✅ Check Semble Status
    - API service availability
    - Maintenance notifications
    - Rate limit status
```

### Error Severity Classification
```yaml
🔴 Critical: Patient safety, data loss, system down
🟡 High: Core functionality impacted
🟠 Medium: Reduced functionality
🟢 Low: Minor issues, workarounds available
```

---

## 🔧 Authentication & Connection Issues

### Invalid Credentials Error

#### Symptoms
```yaml
Error Messages:
  - "Authentication failed"
  - "401 Unauthorized" 
  - "Invalid API token"
  - "Access denied"

Common Causes:
  - Incorrect API token
  - Token expired
  - Wrong base URL
  - Insufficient permissions
```

#### Diagnosis Steps
```yaml
1. Test Credentials Manually
   Command: |
     curl -X POST https://open.semble.io/graphql \
       -H "Content-Type: application/json" \
       -H "x-token: YOUR_TOKEN_HERE" \
       -d '{"query": "query { patients(first: 1) { data { id } } }"}'
   
   Expected: Valid JSON response
   Actual: Error details

2. Verify Token in n8n
    - Navigate to Credentials
    - Test connection
    - Check for special characters
    - Verify no extra spaces

3. Check Semble Admin Panel
    - Token status (active/expired)
    - Permission assignments
    - User account status
```

#### Solutions
```yaml
✅ Regenerate API Token:
   1. Login to Semble admin
   2. Navigate to API settings
   3. Revoke old token
   4. Generate new token
   5. Update n8n credentials
   6. Test connection

✅ Verify Base URL:
   Production: https://open.semble.io/graphql
   Sandbox: Contact Semble for URL
   
✅ Check Permissions:
    - Ensure read/write access as needed
    - Verify resource-specific permissions
    - Contact admin for permission updates
```

### Network Connection Issues

#### Symptoms
```yaml
Error Messages:
  - "Connection timeout"
  - "ECONNREFUSED"
  - "DNS resolution failed"
  - "Network error"

Indicators:
  - Intermittent failures
  - Slow response times
  - Regional connectivity issues
```

#### Diagnosis
```yaml
1. Basic Connectivity Test
   Command: ping open.semble.io
   Expected: Successful ping responses
   
2. DNS Resolution Test  
   Command: nslookup open.semble.io
   Expected: Valid IP address
   
3. Port Connectivity Test
   Command: telnet open.semble.io 443
   Expected: Connection established
   
4. SSL Certificate Test
   Command: openssl s_client -connect open.semble.io:443
   Expected: Valid certificate chain
```

#### Solutions
```yaml
✅ Network Configuration:
    - Check proxy settings
    - Verify firewall rules
    - Update DNS servers
    - Try alternative network

✅ SSL/TLS Issues:
    - Update certificate store
    - Check TLS version support
    - Verify cipher compatibility
    - Contact IT support if needed
```

---

## 📊 Data & Query Issues

### GraphQL Validation Errors

#### Symptoms
```yaml
Error Messages:
  - "GRAPHQL_VALIDATION_FAILED"
  - "Field not found"
  - "Invalid field selection"
  - "Cannot query field X on type Y"

Common Causes:
  - Field name typos
  - Outdated API schema
  - Invalid nested queries
  - Wrong resource type
```

#### Diagnosis Process
```yaml
1. Verify Field Names
    - Check official API documentation
    - Use GraphQL introspection
    - Compare with working queries
   
2. Test Simplified Query
   Example:
   query TestBasic {
     patients(first: 1) {
       data {
         id
         firstName
       }
     }
   }
   
3. Check API Schema Version
    - Query schema introspection
    - Compare field availability
    - Verify deprecation notices
```

#### Field Reference Quick Fix
```yaml
✅ Common Field Corrections:
   Incorrect → Correct
   patientId → id
   fullName → firstName, lastName  
   emailAddress → email
   phoneNumber → phone
   created → dateCreated
   updated → dateUpdated

✅ Nested Object Access:
   Incorrect: patient.contactDetails.email
   Correct: patient { email }
   
   Incorrect: booking.patient.details
   Correct: booking { patient { firstName lastName } }
```

### Permission & Access Errors

#### Symptoms
```yaml
Error Messages:
  - "Insufficient permissions"
  - "Access denied to resource"
  - "Operation not permitted" 
  - "Read-only access"

Permission Matrix:
  Action    | Required Permission
  ---------|------------------
  Read     | resource:read
  Create   | resource:write
  Update   | resource:write  
  Delete   | resource:delete
```

#### Solutions
```yaml
✅ Permission Audit:
   1. List current token permissions
   2. Compare with required permissions
   3. Request additional permissions
   4. Use alternative operations if available

✅ Workarounds:
    - Use read-only operations for testing
    - Implement batch operations
    - Cache frequently accessed data
    - Use alternative data sources
```

### Data Validation Errors

#### Common Validation Issues
```yaml
Email Validation:
  Error: "Email already exists"
  Solution: Check for existing patient first
  
Date Validation:
  Error: "Invalid date format"
  Solution: Use ISO 8601 format (YYYY-MM-DD)
  
Phone Validation:
  Error: "Invalid phone number"
  Solution: Use international format (+44...)
  
Required Fields:
  Error: "firstName is required"
  Solution: Ensure all mandatory fields provided
```

#### Data Quality Checks
```yaml
Node: "Data Validation"
Code: |
  const data = $input.json;
  const errors = [];
  
  // Email validation
  if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Phone validation
  if (data.phone && !/^\+?[\d\s\-\(\)]+$/.test(data.phone)) {
    errors.push('Invalid phone format');
  }
  
  // Date validation
  if (data.dateOfBirth) {
    const date = new Date(data.dateOfBirth);
    if (isNaN(date.getTime())) {
      errors.push('Invalid date of birth');
    }
  }
  
  return {
    ...data,
    validation: {
      isValid: errors.length === 0,
      errors
    }
  };
```

---

## ⚙️ Workflow Issues

### Trigger Not Firing

#### Symptoms
```yaml
Issues:
  - No workflow executions
  - Missing expected triggers
  - Delayed trigger execution
  - Inconsistent triggering

Indicators:
  - Empty execution history
  - Last execution shows old timestamp
  - Manual execution works fine
  - Data exists but trigger doesn't fire
```

#### Diagnosis Steps
```yaml
1. Check Trigger Configuration
    - Verify poll interval settings
    - Review date period selection
    - Confirm resource and event type
    - Check filter conditions

2. Test Manual Execution
    - Run workflow manually
    - Check if data is returned
    - Verify node configuration
    - Review execution logs

3. Monitor API Activity
    - Check API request logs
    - Verify polling is occurring
    - Look for rate limit errors
    - Monitor response times
```

#### Common Fixes
```yaml
✅ Configuration Issues:
   Problem: Date period too narrow
   Solution: Expand to "Last 24 hours" or wider
   
   Problem: Poll interval too long
   Solution: Reduce to 15-30 minutes
   
   Problem: Record limit too low
   Solution: Increase limit or use "Return All"

✅ Data Issues:
   Problem: No recent data changes
   Solution: Verify Semble has new/updated records
   
   Problem: Filters too restrictive
   Solution: Remove or relax filter conditions
   
   Problem: Wrong event type
   Solution: Switch between "New Only", "Updates Only", "New and Updates"
```

### Slow Workflow Performance

#### Performance Issues
```yaml
Symptoms:
  - Long execution times (>30 seconds)
  - Timeout errors
  - High memory usage
  - CPU throttling

Common Causes:
  - Large data sets
  - Complex transformations
  - External API delays
  - Inefficient queries
```

#### Optimization Strategies
```yaml
✅ Data Optimization:
    - Reduce record limits
    - Use specific date ranges
    - Implement field selection
    - Add smart filtering

✅ Query Optimization:
   # Instead of this:
   query GetAllPatients {
     patients {
       data {
         *  # All fields
       }
     }
   }
   
   # Use this:
   query GetPatientBasics {
     patients(first: 50) {
       data {
         id
         firstName
         lastName
         email
       }
     }
   }

✅ Workflow Design:
    - Split long workflows
    - Use sub-workflows
    - Implement parallel processing
    - Add progress checkpoints
```

### Error Handling Failures

#### Insufficient Error Handling
```yaml
Problems:
  - Workflows stop on first error
  - No retry mechanisms
  - Lost data on failures
  - Poor error visibility

Improvements:
  - Implement try-catch blocks
  - Add retry logic
  - Create error notification
  - Log detailed error information
```

#### Robust Error Handling Pattern
```yaml
Node: "Main Operation"
Settings:
  Continue on Fail: true
  Always Return All: true

↓

Node: "Error Check"
Code: |
  const items = $input.all();
  const successful = [];
  const failed = [];
  
  items.forEach(item => {
    if (item.json.error) {
      failed.push({
        ...item.json,
        errorDetails: item.json.error,
        timestamp: new Date().toISOString()
      });
    } else {
      successful.push(item.json);
    }
  });
  
  return { successful, failed };

↓ (If failed.length > 0)

Node: "Error Notification"
Message: |
  Workflow Error Report
  
  Successful: {{$json.successful.length}}
  Failed: {{$json.failed.length}}
  
  Failed Items:
  {{#each $json.failed}}
  - ID: {{id}}, Error: {{errorDetails}}
  {{/each}}
  
  Check workflow execution for details.
```

---

## 🔄 Integration Problems

### CRM Sync Issues

#### Common CRM Problems
```yaml
Duplicate Records:
  Cause: Insufficient matching logic
  Solution: Implement better deduplication
  
Field Mapping Errors:
  Cause: Schema differences
  Solution: Update field mappings
  
Sync Delays:
  Cause: API rate limits
  Solution: Implement queuing and batching
```

#### Debugging CRM Integration
```yaml
1. Data Mapping Verification
   Semble Field → CRM Field
   firstName → first_name
   lastName → last_name
   email → email_address
   phone → phone_number

2. Test Individual Records
    - Process single patient
    - Verify field mapping
    - Check data transformation
    - Confirm CRM creation

3. Monitor Sync Status
    - Track success/failure rates
    - Identify problematic records
    - Monitor API usage
    - Review error patterns
```

### Email Delivery Problems

#### Email Issues
```yaml
Common Problems:
  - Emails not sending
  - Emails in spam folder
  - Template rendering errors
  - Delivery delays

Diagnosis:
  - Check email provider status
  - Verify SMTP settings
  - Test email templates
  - Monitor delivery reports
```

#### Email Troubleshooting
```yaml
✅ SMTP Configuration:
   Settings Check:
    - Server: smtp.gmail.com (or provider)
    - Port: 587 (TLS) or 465 (SSL)
    - Authentication: Required
    - Credentials: Valid email/password

✅ Template Issues:
   Common Fixes:
    - Escape special characters
    - Validate HTML syntax
    - Test variable substitution
    - Check character encoding

✅ Deliverability:
   Improvements:
    - Use verified sender domains
    - Implement SPF/DKIM records
    - Monitor reputation scores
    - Follow email best practices
```

### Calendar Sync Problems

#### Calendar Integration Issues
```yaml
Bidirectional Sync Conflicts:
  Problem: Duplicate events
  Solution: Implement conflict resolution
  
Timezone Problems:
  Problem: Incorrect appointment times
  Solution: Standardize timezone handling
  
Permission Issues:
  Problem: Cannot create/modify events
  Solution: Verify calendar permissions
```

---

## 📊 Monitoring & Debugging

### Debug Mode Setup

#### Enable Comprehensive Logging
```yaml
n8n Node Settings:
  Debug Mode: true
  Verbose Logging: true
  
Monitoring Setup:
  - API request/response logging
  - Error detail capture
  - Performance metrics
  - Execution timing
```

#### Debug Information Collection
```yaml
Node: "Debug Logger"
Code: |
  const executionData = {
    timestamp: new Date().toISOString(),
    nodeData: $input.all(),
    executionId: $execution.id,
    workflowId: $workflow.id,
    nodeId: $node.id,
    environment: {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  
  console.log('Debug Info:', JSON.stringify(executionData, null, 2));
  
  return executionData;
```

### Performance Monitoring

#### Key Metrics Tracking
```yaml
Response Time Monitoring:
  - API call duration
  - Workflow execution time
  - Node processing time
  - End-to-end latency

Error Rate Tracking:
  - Failed API calls
  - Workflow failures
  - Data validation errors
  - Integration failures

Throughput Monitoring:
  - Records processed per minute
  - API requests per hour
  - Workflow executions per day
  - Data synchronization rate
```

#### Monitoring Dashboard Setup
```yaml
# Example monitoring workflow
Schedule: Every 5 minutes
↓
Collect Metrics:
  - Check n8n execution status
  - Verify Semble API health
  - Monitor integration endpoints
  - Track error rates
↓
Generate Alerts:
  - High error rate (>5%)
  - Slow response time (>10s)
  - Failed executions (>3)
  - API rate limit approaching
↓
Send Notifications:
  - Slack/Teams alerts
  - Email notifications
  - Dashboard updates
  - Log entries
```

---

## 🛠️ Advanced Troubleshooting

### Memory and Performance Issues

#### Resource Management
```yaml
Memory Issues:
  Symptoms:
    - "Out of memory" errors
    - Slow performance
    - Workflow timeouts
  
  Solutions:
    - Reduce batch sizes
    - Implement pagination
    - Clear unused variables
    - Optimize data structures

CPU Issues:
  Symptoms:
    - High CPU usage
    - Slow processing
    - System responsiveness
  
  Solutions:
    - Optimize algorithms
    - Reduce computational complexity
    - Implement caching
    - Use asynchronous processing
```

#### Resource Optimization Code
```yaml
Node: "Memory Efficient Processing"
Code: |
  // Process data in small batches to manage memory
  const batchSize = 10;
  const allData = $input.all();
  const results = [];
  
  for (let i = 0; i < allData.length; i += batchSize) {
    const batch = allData.slice(i, i + batchSize);
    
    // Process batch
    const batchResults = batch.map(item => {
      // Your processing logic here
      return processItem(item.json);
    });
    
    results.push(...batchResults);
    
    // Force garbage collection between batches
    if (global.gc) {
      global.gc();
    }
  }
  
  return results;
```

### Complex Workflow Debugging

#### Workflow Execution Analysis
```yaml
Execution Flow Mapping:
  1. Identify execution path
  2. Check node input/output
  3. Verify data transformations
  4. Monitor error propagation
  5. Validate final results

Debug Strategy:
  - Add checkpoint nodes
  - Log intermediate results
  - Test individual components
  - Use manual execution
  - Monitor resource usage
```

#### Workflow Testing Framework
```yaml
Node: "Test Framework"
Code: |
  const testResults = {
    testSuite: 'Patient Workflow',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // Test 1: Data validation
  try {
    const patient = $node['Patient Input'].json;
    testResults.tests.push({
      name: 'Patient Data Validation',
      status: patient.email && patient.firstName ? 'PASS' : 'FAIL',
      details: patient
    });
  } catch (error) {
    testResults.tests.push({
      name: 'Patient Data Validation',
      status: 'ERROR',
      error: error.message
    });
  }
  
  // Test 2: API connectivity
  try {
    const apiResponse = $node['Semble API'].json;
    testResults.tests.push({
      name: 'Semble API Connectivity',
      status: apiResponse.id ? 'PASS' : 'FAIL',
      responseTime: $node['Semble API'].executionTime
    });
  } catch (error) {
    testResults.tests.push({
      name: 'Semble API Connectivity',
      status: 'ERROR',
      error: error.message
    });
  }
  
  // Summary
  const passCount = testResults.tests.filter(t => t.status === 'PASS').length;
  const totalTests = testResults.tests.length;
  
  testResults.summary = {
    passed: passCount,
    total: totalTests,
    success: passCount === totalTests
  };
  
  return testResults;
```

---

## 📞 Getting Help

### Self-Service Resources

#### Documentation Hierarchy
```yaml
1. Quick Reference Guides
    - Common error solutions
    - Configuration examples
    - Best practices

2. Detailed Guides
    - Node documentation
    - Integration patterns
    - Workflow examples

3. API Reference
    - Endpoint documentation
    - Field definitions
    - Query examples

4. Community Resources
    - User forums
    - GitHub discussions
    - Stack Overflow tags
```

### Support Escalation Path

#### When to Escalate
```yaml
Level 1 - Self-Service (0-2 hours):
  - Check documentation
  - Review common issues
  - Test basic connectivity
  - Try suggested solutions

Level 2 - Community Support (2-24 hours):
  - Post in forums
  - Ask in community chat
  - Search existing issues
  - Collaborate with peers

Level 3 - Professional Support (24+ hours):
  - Contact support team
  - Provide detailed logs
  - Share workflow exports
  - Schedule debugging session
```

#### Information to Provide
```yaml
Essential Information:
  - Error messages (exact text)
  - Workflow configuration
  - Execution logs
  - System environment details
  - Steps to reproduce issue

Helpful Context:
  - When issue started
  - Recent changes made
  - Frequency of occurrence
  - Impact on operations
  - Attempted solutions
```

### Emergency Procedures

#### Critical Issue Response
```yaml
🚨 Patient Safety Issues:
  1. Stop affected workflows immediately
  2. Notify clinical staff
  3. Implement manual procedures
  4. Contact emergency support
  5. Document incident details

🔴 Data Loss/Corruption:
  1. Stop all write operations
  2. Isolate affected systems
  3. Assess damage scope
  4. Activate backup procedures
  5. Contact technical support

🟡 Service Degradation:
  1. Monitor system status
  2. Implement workarounds
  3. Communicate to users
  4. Scale resources if possible
  5. Schedule maintenance window
```

## 📋 Troubleshooting Checklist

### Pre-Incident Preparation
- [ ] Document workflow configurations
- [ ] Set up monitoring and alerting
- [ ] Create backup procedures
- [ ] Train staff on common issues
- [ ] Establish support contacts

### During Incident
- [ ] Assess severity and impact
- [ ] Implement immediate fixes
- [ ] Communicate status to stakeholders
- [ ] Document troubleshooting steps
- [ ] Monitor resolution progress

### Post-Incident
- [ ] Verify full resolution
- [ ] Update documentation
- [ ] Conduct lessons learned review
- [ ] Implement preventive measures
- [ ] Test backup procedures

## Next Steps

Continue improving your Semble integration:

- **[Common Workflows](common-workflows.md)** - Working examples to learn from
- **[Integration Patterns](integration-patterns.md)** - Advanced integration designs
- **[Development Guide](../development/contributing.md)** - Custom development help
- **[Node Documentation](../nodes/overview.md)** - Detailed technical reference

---

**Still need help?** Join our community forum or contact professional support for personalized assistance.
