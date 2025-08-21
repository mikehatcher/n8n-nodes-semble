# Patient Operations

Master patient data management with comprehensive CRUD operations, automated workflows, and real-time synchronization capabilities.

## Quick Reference

### Available Operations

| Operation | Action Node | Trigger Node | Description |
|-----------|-------------|--------------|-------------|
| **Get Patient** | ✅ | ❌ | Retrieve single patient by ID |
| **Get All Patients** | ✅ | ❌ | Fetch multiple patients with filtering |
| **Create Patient** | ✅ | ❌ | Register new patient |
| **Update Patient** | ✅ | ❌ | Modify existing patient data |
| **Delete Patient** | ✅ | ❌ | Remove patient record |
| **Monitor New Patients** | ❌ | ✅ | Trigger on new registrations |
| **Monitor Patient Updates** | ❌ | ✅ | Trigger on patient modifications |
| **Monitor All Patient Changes** | ❌ | ✅ | Trigger on any patient activity |

## Patient Data Structure

### Core Fields
```yaml
# Primary Identification
id: "string"                    # Unique patient identifier
firstName: "string"             # First name
lastName: "string"              # Surname  
title: "string"                 # Mr, Mrs, Ms, Dr, etc.
gender: "Male|Female|Other"     # Gender identity

# Contact Information  
email: "string"                 # Primary email address
phone: "string"                 # Primary phone number
mobile: "string"                # Mobile phone number

# Address Information
address: "string"               # Full address
postcode: "string"              # Postal code
city: "string"                  # City/town
country: "string"               # Country

# Demographics
dateOfBirth: "ISO 8601 date"    # Birth date
age: "number"                   # Calculated age
```

### Extended Fields
```yaml
# Registration Details
dateCreated: "ISO 8601 datetime"     # Registration timestamp
dateUpdated: "ISO 8601 datetime"     # Last modification
status: "Active|Inactive|Deceased"   # Patient status

# Clinical Information
nhsNumber: "string"                  # NHS number (UK)
medicalRecordNumber: "string"        # Practice MRN
allergies: "string"                  # Known allergies
medications: "string"                # Current medications

# Administrative
notes: "string"                      # Administrative notes
tags: ["string"]                     # Classification tags
customAttributes: [object]          # Custom field data
```

### Relationship Fields
```yaml
# Family Relationships
relationships: [
  {
    relationshipId: "string"         # Related patient ID
    relationshipType: "string"       # Parent, Child, Spouse, etc.
    relationshipLabel: "string"      # Display label
    deleted: "boolean"               # Soft delete flag
    contactDetails: {object}         # Contact information
  }
]

# Emergency Contacts
emergencyContacts: [
  {
    name: "string"                   # Contact name
    relationship: "string"           # Relationship to patient
    phone: "string"                  # Contact phone
    email: "string"                  # Contact email
  }
]
```

## Action Node Operations

### Get Single Patient

Retrieve detailed information for a specific patient.

#### Configuration
```yaml
Resource: "Patient"
Action: "Get"
Patient ID: "patient_id_here"
```

#### Example Output
```json
{
  "id": "pat_123456789",
  "firstName": "Sarah",
  "lastName": "Johnson", 
  "email": "sarah.johnson@email.com",
  "phone": "+44 20 7946 0958",
  "dateOfBirth": "1985-03-15",
  "address": "123 High Street, London, SW1A 1AA",
  "status": "Active",
  "dateCreated": "2024-01-15T09:30:00Z"
}
```

#### Use Cases
- Patient lookup for appointments
- Verifying patient details before treatment
- Populating forms with existing data
- Cross-system data validation

### Get Multiple Patients

Retrieve patient lists with powerful filtering options.

#### Configuration
```yaml
Resource: "Patient"
Action: "Get All"
Limit: 50                        # Number of records
Return All: false                # Pagination control
```

#### Advanced Filtering
```yaml
# Date-based filtering
Date Field: "dateCreated"
Date Period: "Last 30 days"
Custom Start Date: "2024-01-01"
Custom End Date: "2024-01-31"

# Status filtering  
Status Filter: "Active"
Include Inactive: false

# Search criteria
Search Term: "johnson"           # Search names, emails
Email Domain: "@gmail.com"       # Filter by email domain
Age Range: "18-65"              # Age-based filtering
```

#### Example Filtered Query
```json
{
  "filters": {
    "dateCreated": {
      "gte": "2024-01-01T00:00:00Z",
      "lte": "2024-01-31T23:59:59Z"
    },
    "status": "Active",
    "age": {
      "gte": 18,
      "lte": 65
    }
  },
  "limit": 100,
  "orderBy": "dateCreated_DESC"
}
```

#### Use Cases
- Daily patient registration reports
- Marketing list generation
- Data synchronization with external systems
- Bulk patient analysis and reporting

### Create New Patient

Register new patients with comprehensive data validation.

#### Required Fields
```yaml
Resource: "Patient"
Action: "Create"

# Minimum required data
firstName: "John"
lastName: "Smith"
email: "john.smith@email.com"    # Must be unique
```

#### Complete Registration
```yaml
# Personal Information
title: "Mr"
firstName: "John"
lastName: "Smith"
gender: "Male"
dateOfBirth: "1980-05-20"

# Contact Details
email: "john.smith@email.com"
phone: "+44 20 7946 0123"
mobile: "+44 7700 900123"

# Address Information
address: "456 Oak Avenue"
city: "Manchester"
postcode: "M1 1AA"
country: "United Kingdom"

# Additional Information
nhsNumber: "123 456 7890"
notes: "New patient registration from website"
```

#### Validation Rules
```yaml
Email: 
  - Must be unique across all patients
  - Valid email format required
  - Cannot be empty

Phone Numbers:
  - International format recommended
  - Automatic formatting applied
  - Duplicates allowed but warned

Date of Birth:
  - Must be valid date
  - Cannot be future date
  - Age calculated automatically

NHS Number:
  - UK format validation
  - Check digit verification
  - Uniqueness enforced
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": "pat_987654321",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@email.com",
    "status": "Active",
    "dateCreated": "2024-02-15T14:30:00Z",
    "age": 43
  }
}
```

#### Use Cases
- Website registration forms
- Walk-in patient registration
- Bulk patient imports
- Integration with external registration systems

### Update Patient Data

Modify existing patient information with change tracking.

#### Configuration
```yaml
Resource: "Patient"
Action: "Update"
Patient ID: "pat_123456789"

# Fields to update
email: "new.email@example.com"
phone: "+44 20 7946 0999"
address: "789 New Street, London, E1 6AN"
```

#### Partial Updates
```yaml
# Update only specific fields
Updates:
  email: "updated.email@example.com"
  mobile: "+44 7700 900999"
  notes: "Updated contact information - Feb 2024"
```

#### Bulk Updates
```yaml
# Update multiple patients (use with care)
Patient IDs: ["pat_001", "pat_002", "pat_003"]
Updates:
  status: "Inactive"
  notes: "Bulk status update - practice closure"
```

#### Change Tracking
```yaml
Automatic Tracking:
  - dateUpdated: Updated to current timestamp
  - modifiedBy: User/system making change
  - changeHistory: Previous values stored
  - auditLog: Complete change record
```

#### Use Cases
- Contact information updates
- Status changes (active/inactive)
- Bulk data corrections
- Integration with external data sources

### Delete Patient

Remove patient records with proper safeguards.

#### Configuration
```yaml
Resource: "Patient"  
Action: "Delete"
Patient ID: "pat_123456789"
```

#### Safety Features
```yaml
Soft Delete: true                # Default behavior
Permanent Delete: false          # Requires special permission
Reason Required: true            # Must provide deletion reason
Confirmation: true               # Double confirmation required
```

#### Deletion Types

##### Soft Delete (Recommended)
```yaml
Effect: 
  - Patient marked as deleted
  - Hidden from normal searches
  - Data preserved for audit
  - Can be restored if needed

Use Cases:
  - Patient requested removal
  - Duplicate record cleanup  
  - Practice transfer
```

##### Hard Delete (Restricted)
```yaml
Effect:
  - Complete data removal
  - Cannot be undone
  - Audit log only record
  - Requires admin permission

Use Cases:
  - GDPR compliance requests
  - Legal requirements
  - Test data cleanup
```

## Trigger Node Operations

### Monitor New Patients

Automatically trigger workflows when patients register.

#### Configuration
```yaml
Resource: "Patient"
Event: "New Only"
Poll Interval: "Every 30 minutes"
Date Period: "Last 24 hours"
Limit: 10
```

#### Trigger Conditions
```yaml
# Time-based triggers
Poll Frequency: "5m|15m|30m|1h|4h|daily"
Lookback Period: "1h|4h|24h|7d|30d"

# Status-based triggers  
Include Only: "Active"
Exclude Inactive: true
Test Mode: false

# Volume controls
Max Records: 50
Batch Processing: true
```

#### Example Workflow
```yaml
1. New Patient Trigger
   ↓
2. Send Welcome Email
   ↓  
3. Create CRM Contact
   ↓
4. Schedule Follow-up Task
```

#### Use Cases
- Welcome email automation
- CRM synchronization
- Onboarding workflows
- Marketing automation
- Staff notifications

### Monitor Patient Updates

Track changes to existing patient records.

#### Configuration
```yaml
Resource: "Patient"
Event: "Updates Only"
Poll Interval: "Every 15 minutes"
Date Period: "Last 4 hours"
```

#### Change Detection
```yaml
Tracked Changes:
  - Contact information updates
  - Address changes
  - Status modifications
  - Custom field updates
  - Relationship changes

Change Metadata:
  - Previous values
  - New values  
  - Change timestamp
  - Modified fields list
```

#### Example Change Data
```json
{
  "id": "pat_123456789",
  "changes": {
    "email": {
      "from": "old.email@example.com",
      "to": "new.email@example.com",
      "changedAt": "2024-02-15T10:30:00Z"
    },
    "address": {
      "from": "123 Old Street",
      "to": "456 New Avenue",
      "changedAt": "2024-02-15T10:30:00Z"
    }
  }
}
```

#### Use Cases
- Data synchronization alerts
- Contact update notifications
- Compliance tracking
- Change audit workflows
- External system updates

### Monitor All Patient Activity

Capture both new registrations and updates in one trigger.

#### Configuration
```yaml
Resource: "Patient"
Event: "New and Updates" 
Poll Interval: "Every 30 minutes"
Date Period: "Last 1 hour"
```

#### Activity Types
```yaml
New Patient:
  - event: "created"
  - data: Complete patient record
  - metadata: Registration source

Updated Patient:
  - event: "updated"  
  - data: Current patient record
  - metadata: Changed fields, previous values

Deleted Patient:
  - event: "deleted"
  - data: Patient ID and basic info
  - metadata: Deletion reason, timestamp
```

## Advanced Patterns

### Patient Relationship Management

#### Family Group Creation
```yaml
# Create parent patient
1. Create Patient: "Sarah Johnson" (ID: pat_001)

# Create child patient with relationship
2. Create Patient: "Emma Johnson" (ID: pat_002)
3. Update Patient: pat_002
   Relationships:
     - relationshipId: "pat_001"
       relationshipType: "Parent"
       relationshipLabel: "Mother"
```

#### Emergency Contact Management
```yaml
Update Patient: "pat_123456789"
Emergency Contacts:
  - name: "John Smith"
    relationship: "Spouse"
    phone: "+44 7700 900123"
    email: "john.smith@email.com"
    primary: true
    
  - name: "Mary Johnson"  
    relationship: "Mother"
    phone: "+44 7700 900456"
    primary: false
```

### Data Synchronization Patterns

#### Two-Way Sync with CRM
```yaml
Workflow 1: Semble → CRM
Trigger: Patient Updates (Semble)
Action: Update Contact (CRM)

Workflow 2: CRM → Semble  
Trigger: Contact Updates (CRM)
Action: Update Patient (Semble)

Conflict Resolution:
  - Timestamp-based priority
  - Manual review queue
  - Field-level precedence rules
```

#### Backup and Recovery
```yaml
Daily Backup:
  Schedule: "Daily at 2 AM"
  Action: Get All Patients
  Storage: Cloud storage/Database
  Retention: "30 days"

Recovery Process:
  1. Identify affected patients
  2. Retrieve backup data
  3. Compare current vs backup
  4. Apply selective restore
```

### Bulk Operations

#### Import Patient List
```yaml
1. CSV/Excel Data Preparation
    - Validate email uniqueness
    - Format phone numbers
    - Standardize addresses

2. Batch Creation Workflow
    - Process in chunks of 10-20
    - Validate each record
    - Handle errors gracefully
    - Generate import report

3. Post-Import Verification
    - Check record counts
    - Validate data integrity
    - Send confirmation report
```

#### Mass Update Operations
```yaml
# Status updates for practice closure
Patients: "All active patients"
Updates:
  status: "Transferred"
  notes: "Practice closure - transferred to Dr. Smith"
  transferDate: "2024-03-01"

# Address corrections for postal code changes
Filter: 'postcode contains "M1 1"'
Updates:
  postcode: "M1 2AA"
  notes: "Postcode correction - Royal Mail update"
```

## Validation and Error Handling

### Data Validation Rules

#### Email Validation
```yaml
Format: RFC 5322 compliant
Uniqueness: Enforced across all patients
Domain Validation: Optional DNS checking
Blocked Domains: Configurable list
```

#### Phone Number Validation
```yaml
Format: International format preferred
Country Codes: Automatic detection
Formatting: Automatic standardization
Duplicates: Allowed with warnings
```

#### Date Validation
```yaml
Date of Birth:
  - Must be valid calendar date
  - Cannot be future date
  - Reasonable age limits (0-150 years)
  - Automatic age calculation

Registration Dates:
  - Cannot be future dates
  - Must be logical sequence
  - Timezone handling
```

### Error Scenarios

#### Common Validation Errors
```yaml
Email Already Exists:
  Error: "Patient with this email already exists"
  Solution: Use different email or update existing patient
  
Invalid Date Format:
  Error: "Invalid date format"
  Solution: Use ISO 8601 format (YYYY-MM-DD)
  
Missing Required Fields:
  Error: "First name is required"
  Solution: Provide all mandatory fields
```

#### API Errors
```yaml
Rate Limit Exceeded:
  Error: "Too many requests"
  Solution: Implement backoff strategy
  Auto-retry: Built-in exponential backoff
  
Permission Denied:
  Error: "Insufficient permissions"
  Solution: Check API token permissions
  Contact: Semble administrator
  
Network Timeout:
  Error: "Request timeout"
  Solution: Check connectivity, retry request
  Timeout: 30 seconds default
```

## Performance Optimization

### Query Optimization

#### Efficient Field Selection
```yaml
# Minimal data for listings
Fields: ["id", "firstName", "lastName", "email"]

# Complete data for detailed operations  
Fields: ["*", "relationships", "customAttributes"]

# Specific use case fields
Fields: ["id", "email", "phone", "dateOfBirth"]
```

#### Pagination Strategies
```yaml
Small Batches: 10-25 records (real-time processing)
Medium Batches: 50-100 records (standard operations)
Large Batches: 100-500 records (reporting, sync)
```

#### Caching Strategies
```yaml
Patient Lists: Cache for 5 minutes
Individual Records: Cache for 2 minutes  
Relationship Data: Cache for 10 minutes
Custom Attributes: Cache for 15 minutes
```

### Rate Limiting Best Practices

#### Request Frequency
```yaml
Interactive Operations: Immediate execution
Background Sync: Every 15-30 minutes
Reporting: Every 1-4 hours
Bulk Operations: Daily/weekly schedules
```

#### Batch Size Guidelines
```yaml
Create Operations: 5-10 per batch
Update Operations: 10-20 per batch
Query Operations: 50-100 per batch
Delete Operations: 1-5 per batch (safety)
```

## Security and Compliance

### Data Protection

#### Personal Data Handling
```yaml
Data Minimization:
  - Request only necessary fields
  - Limit data retention periods
  - Regular cleanup procedures
  
Encryption:
  - Data in transit: TLS 1.2+
  - Data at rest: API provider encryption
  - Credential storage: n8n encrypted storage
```

#### Access Control
```yaml
API Permissions:
  - Principle of least privilege
  - Regular permission audits
  - Role-based access control
  
Workflow Security:
  - Secure credential management
  - Input validation
  - Output sanitization
```

### Compliance Requirements

#### GDPR Compliance
```yaml
Right to Access:
  - Provide patient data exports
  - Complete data portability
  
Right to Rectification:
  - Enable data corrections
  - Audit trail maintenance
  
Right to Erasure:
  - Implement data deletion
  - Retention policy compliance
  
Right to Restriction:
  - Temporary processing restrictions
  - Status flag management
```

#### Healthcare Regulations
```yaml
NHS Data Standards:
  - NHS number validation
  - Data sharing agreements
  - Clinical governance compliance
  
Information Governance:
  - Data flow documentation
  - Risk assessments
  - Staff training requirements
```

## Troubleshooting Guide

### Common Issues

#### Patient Not Found
```yaml
Symptoms: "Patient ID does not exist"
Causes:
  - Incorrect patient ID
  - Patient deleted/archived
  - Permission restrictions
  
Solutions:
  1. Verify patient ID format
  2. Check patient status
  3. Confirm API permissions
  4. Search by alternative identifiers
```

#### Duplicate Email Error
```yaml
Symptoms: "Email already exists"
Causes:
  - Email uniqueness constraint
  - Previous registration exists
  - Case sensitivity issues
  
Solutions:
  1. Search for existing patient
  2. Update existing record instead
  3. Use alternative email
  4. Merge duplicate records
```

#### Rate Limit Errors
```yaml
Symptoms: "Rate limit exceeded"
Causes:
  - Too many concurrent requests
  - Insufficient delays between calls
  - Bulk operations without throttling
  
Solutions:
  1. Implement exponential backoff
  2. Reduce batch sizes
  3. Increase polling intervals
  4. Contact Semble for limit increase
```

### Debugging Techniques

#### Enable Debug Logging
```yaml
Node Settings:
  Debug Mode: true
  Verbose Logging: true
  
Log Output:
  - Full API requests
  - Response data
  - Error details
  - Timing information
```

#### Test Individual Operations
```yaml
1. Single Patient Retrieval
    - Use known patient ID
    - Verify credentials
    - Check field availability
   
2. Simple Patient Creation
    - Minimal required fields
    - Unique email address
    - Verify response format
   
3. Incremental Complexity
    - Add optional fields
    - Test relationships
    - Validate custom attributes
```

## Next Steps

Explore related topics:

- **[Booking Operations](booking-nodes.md)** - Appointment management
- **[Product Operations](product-nodes.md)** - Service catalog management
- **[Trigger Workflows](trigger-nodes.md)** - Advanced automation patterns
- **[Common Workflows](../examples/common-workflows.md)** - Ready-to-use examples

---

**Need help?** Check our **[Troubleshooting Guide](../examples/troubleshooting.md)** or join the community discussions.
