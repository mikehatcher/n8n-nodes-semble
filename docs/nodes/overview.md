# Node Overview

The n8n Semble integration provides two powerful nodes for automating your practice management workflows. This overview helps you understand when and how to use each node effectively.

## Available Nodes

### Semble (Action Node)

- **Best for**: Manual triggers, scheduled operations, workflow actions
- **Primary function**: Perform CRUD operations on Semble resources
- **Create, Read, Update, Delete** operations
- **Batch processing** capabilities
- **Real-time data retrieval**
- **Resource management** for patients, bookings, products

### Semble Trigger (Trigger Node)

- **Best for**: Automated workflows, real-time responses, data synchronization
- **Primary function**: Monitor Semble for changes and automatically trigger workflows
- **Automated monitoring** for new/updated records
- **Configurable polling intervals**
- **Event-driven workflows**
- **Real-time synchronization**

## Supported Resources

Both nodes support operations across these Semble entities:

| Resource | Description |
|----------|-------------|
| **👤 Patients** | Patient records and demographics |
| **📅 Bookings** | Appointments and scheduling |
| **🛍️ Products** | Services and inventory |

## Resource Capabilities Matrix

| Resource | Create | Read | Update | Delete | Trigger Support |
|----------|--------|------|--------|--------|-----------------|
| **Patients** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bookings** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Products** | ✅ | ✅ | ✅ | ✅ | ✅ |

!!! note "Permission Requirements"
    Actual available operations depend on your Semble API token permissions. Some operations may be restricted based on your user role and practice configuration.

## Common Operations

### Data Retrieval Operations
```yaml
# Get single record
Action: "Get"
Resource: "Patient" 
Patient ID: "patient_id_here"

# Get multiple records
Action: "Get Many"
Resource: "Bookings"
# Note: Advanced filtering depends on implementation
```

### Data Creation Operations
```yaml
# Create new patient
Action: "Create"
Resource: "Patient"
Data:
  firstName: "John"
  lastName: "Doe"
  email: "john.doe@example.com"
  phoneNumber: "+44 7700 900123"
  phoneType: "mobile"
```

### Data Update Operations
```yaml
# Update patient information
Action: "Update"  
Resource: "Patient"
Patient ID: "patient_id_here"
Updates:
  email: "new.email@example.com"
  # Additional fields as supported
```

### Trigger Operations
```yaml
# Monitor for new patients
Resource: "Patient"
Event: "New Only" 
Date Period: "Last 1 month"
# Polling interval configured at workflow level
```

## Advanced Features

### Service Architecture

The nodes use a sophisticated service-based architecture:

- **`SembleQueryService`** for GraphQL operations and rate limiting
- **`FieldDiscoveryService`** for schema introspection (internal use)
- **`PermissionCheckService`** for access control validation
- **`CacheService`** for performance optimization

### Built-in Caching

Optimizes performance with intelligent caching:

- **Field definitions** cached for 1 hour
- **Permissions** cached for 15 minutes  
- **Credentials** cached for 30 minutes
- **Introspection data** cached for 24 hours
- **Automatic cache invalidation** on errors

### Error Handling

Comprehensive error management:

- **User-friendly error messages** with actionable guidance
- **Two-tier retry system**: Simple (main nodes) and advanced (services)
- **Rate limit handling** with exponential backoff in services
- **Permission error identification** with specific field restrictions

### Pagination Support

Handles large datasets efficiently:

- **Automatic pagination** for "Get Many" operations
- **Configurable page sizes** with 50 record default
- **Max pages limit** for test environment safety
- **Efficient batching** using 100-record pages internally

## Performance Optimization

### Best Practices

#### Polling Intervals
```yaml
High-frequency needs: "Every 5 minutes"    # Use carefully
Standard monitoring: "Every 15-30 minutes" # Recommended
Low-frequency sync: "Every 1-4 hours"
Batch processing: "Daily/Weekly"
```

!!! warning "Rate Limits"
    Semble API limit: 600 requests/minute (10/second). With 30-second minimum polling intervals recommended to stay well within limits and allow for pagination.

#### Date Range Filtering
```yaml
# Efficient: Use built-in date periods
Date Period: "Last 1 day"     # Built-in trigger option
Date Period: "Last 1 week"    # Built-in trigger option  
Date Period: "Last 1 month"   # Built-in trigger option

# Less efficient: Polling very large date ranges
Date Period: "All"            # Use carefully - can be slow
```

#### Record Limits
```yaml
Real-time processing: 10-50 records    # Default page size: 50
Batch synchronization: 100-500 records # Internal batching: 100  
Bulk operations: 500+ records          # Use max pages limit
```

!!! note "Test Detection"
    The trigger node automatically limits pages when `NODE_ENV=test` to prevent timeouts during automated testing.

## Security Considerations

### API Token Management
- ✅ Use separate credentials for different practices/purposes
- ✅ Regularly rotate credentials
- ✅ Monitor API usage
- ❌ Never hardcode tokens in workflows

### Data Handling
- ✅ Validate input data
- ✅ Sanitize output fields
- ✅ Log important operations
- ❌ Include sensitive data in logs

### Permission Management
- ✅ Use principle of least privilege
- ✅ Regular permission audits
- ✅ Monitor failed requests
- ✅ Implement proper error handling

## Error Scenarios & Solutions

### Common Issues

#### Rate Limiting
```yaml
Error: "Rate limit exceeded"
Solution: 
  - Increase poll intervals
  - Implement exponential backoff
  - Contact Semble for limit increase
```

#### Permission Errors
```yaml
Error: "Insufficient permissions"
Solution:
  - Check API token permissions
  - Contact Semble administrator
  - Use read-only operations where possible
```

#### Network Timeouts
```yaml
Error: "Request timeout"
Solution:
  - Check internet connectivity
  - Verify Semble API status
  - Implement retry logic
```

## Development & Testing

### Testing Strategies

Testing workflows requires careful consideration of data safety and API limits:

```yaml
# Recommended testing approach
Poll Interval: "Every minute" (testing only)
Record Limit: 5 (small batches)
Debug Mode: true
Test Environment: NODE_ENV=test (automatic pagination limiting)
```

### Debugging Tips
- **Check n8n execution logs** for detailed request/response information
- **Test individual operations** before building complex workflows
- **Monitor API rate limits** (600 requests/minute maximum)
- **Use test environment detection** to automatically limit pagination during testing

!!! warning "Testing Safety"
    Always use small record limits and longer polling intervals during testing to avoid overwhelming the Semble API. The nodes automatically detect test environments and apply safety limits.

## Next Steps

Explore specific node documentation:

- **[Credentials Setup](credentials.md)** - Configure your API access
- **[Patient Operations](patient-nodes.md)** - Patient management workflows
- **[Booking Operations](booking-nodes.md)** - Appointment scheduling automation
- **[Product Management](product-nodes.md)** - Service catalog operations
- **[Trigger Workflows](trigger-nodes.md)** - Automated monitoring and responses

---

**[Browse examples →](../examples/common-workflows.md)** | **[Troubleshooting →](../examples/troubleshooting.md)**
