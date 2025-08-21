# Trigger Workflows

Master automated workflows with Semble Trigger nodes for real-time monitoring, event-driven automation, and intelligent data synchronization across your practice management systems.

## Quick Reference

### Available Triggers

| Resource | Events | Common Use Cases |
|----------|--------|------------------|
| **👤 Patients** | New, Updates, All | Welcome automation, CRM sync, compliance tracking |
| **📅 Bookings** | New, Updates, All | Confirmations, reminders, staff notifications |
| **🛍️ Products** | New, Updates, All | Catalog sync, pricing updates, inventory alerts |

### Event Types

| Event Type | Description | Data Provided |
|------------|-------------|---------------|
| **New Only** | Monitor for newly created records | Complete new record data |
| **Updates Only** | Track modifications to existing records | Changed fields + metadata |
| **New and Updates** | Capture all activity on resources | Full records + change information |

## Trigger Architecture

### Polling Mechanism
```yaml
# How triggers work
1. Scheduled Polling
    - n8n polls Semble API at set intervals
    - Checks for new/modified records
    - Triggers workflow execution
   
2. Change Detection
    - Compares timestamps (dateCreated, dateUpdated)
    - Identifies new records since last poll
    - Tracks modification patterns
   
3. Workflow Execution
    - Passes data to next workflow node
    - Includes metadata about changes
    - Enables conditional logic
```

### Polling Configuration
```yaml
# Interval options
Poll Intervals:
  - "Every 5 minutes"     # Real-time monitoring
  - "Every 15 minutes"    # Standard monitoring  
  - "Every 30 minutes"    # Regular checking
  - "Every 1 hour"        # Periodic updates
  - "Every 4 hours"       # Low-frequency monitoring
  - "Daily"              # Batch processing

# Performance considerations
Recommended Intervals:
  - Emergency workflows: 5-15 minutes
  - Business workflows: 15-30 minutes
  - Reporting workflows: 1-4 hours
  - Archive workflows: Daily
```

### Date Period Configuration
```yaml
# Lookback periods
Date Periods:
  - "Last 1 hour"        # Recent changes only
  - "Last 4 hours"       # Half-day monitoring
  - "Last 24 hours"      # Daily changes
  - "Last 7 days"        # Weekly review
  - "Last 30 days"       # Monthly analysis
  - "Custom range"       # Specific dates
  
# Startup behavior
First Execution:
  - Default: Last 24 hours
  - Configurable: Custom lookback
  - Safety: Prevents overwhelming with historical data
```

## Patient Triggers

### New Patient Registration Trigger

Automatically respond to new patient registrations with welcome workflows.

#### Configuration
```yaml
Resource: "Patient"
Event: "New Only"
Poll Interval: "Every 30 minutes"
Date Period: "Last 4 hours"
Limit: 25
```

#### Trigger Data Structure
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
  "dateCreated": "2024-02-20T14:30:00Z",
  "__trigger_metadata": {
    "event": "created",
    "pollTime": "2024-02-20T15:00:00Z",
    "isNew": true
  }
}
```

#### Example Workflow
```yaml
1. New Patient Trigger
   ↓
2. Send Welcome Email
    - Template: "Welcome to Our Practice"
    - Include: Practice information, contact details
    - Attach: New patient forms
   ↓
3. Create CRM Contact
    - System: HubSpot/Salesforce
    - Map: Patient data to CRM fields
    - Tag: "New Patient"
   ↓
4. Schedule Follow-up Task
    - Assign: Practice manager
    - Due: 48 hours
    - Task: "Call new patient for orientation"
   ↓
5. Add to Marketing List
    - List: "New Patient Onboarding"
    - Sequence: 6-week welcome series
```

#### Advanced Filtering
```yaml
# Filter by patient type
Patient Type: "Private"         # Private patients only
Source: "Website"               # Registration source
Age Range: "18-65"             # Adult patients

# Filter by location
Postcode Prefix: "SW1"         # Specific area
Country: "United Kingdom"       # UK patients only

# Filter by registration completeness
Complete Registration: true     # Full details provided
Email Verified: true           # Confirmed email address
```

### Patient Update Trigger

Monitor changes to patient information for compliance and synchronization.

#### Configuration
```yaml
Resource: "Patient"
Event: "Updates Only" 
Poll Interval: "Every 15 minutes"
Date Period: "Last 2 hours"
```

#### Change Detection
```yaml
Tracked Changes:
  - Contact information (email, phone, address)
  - Personal details (name, DOB)
  - Status changes (active/inactive)
  - Relationship updates
  - Custom field modifications
  
Change Metadata:
  - Previous values
  - New values
  - Change timestamp
  - Modified fields list
  - Change source (user/system)
```

#### Example Change Workflow
```yaml
1. Patient Update Trigger
   ↓
2. Conditional Logic
   IF email changed:
     → Send email verification
   IF address changed:
     → Update postal preferences
   IF phone changed:
     → Verify new number
   ↓
3. External System Updates
    - CRM synchronization
    - Insurance notification
    - Postal service updates
   ↓
4. Compliance Recording
    - Log data changes
    - Generate audit trail
    - Update consent records
```

## Booking Triggers

### New Appointment Trigger

Automate appointment confirmation and preparation workflows.

#### Configuration
```yaml
Resource: "Booking"
Event: "New Only"
Poll Interval: "Every 10 minutes"
Date Period: "Next 7 days"      # Future appointments
Limit: 15
```

#### Trigger Data Structure
```json
{
  "id": "bkg_123456789",
  "appointmentNumber": "A240220010",
  "status": "Pending",
  "appointmentDate": "2024-02-25",
  "appointmentTime": "14:30",
  "duration": 30,
  "patient": {
    "id": "pat_987654321",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@email.com",
    "phone": "+44 7700 900123"
  },
  "staff": {
    "id": "staff_111",
    "firstName": "Dr. Sarah",
    "lastName": "Wilson"
  },
  "appointmentType": {
    "name": "General Consultation",
    "duration": 30
  },
  "__trigger_metadata": {
    "event": "created",
    "pollTime": "2024-02-20T15:15:00Z",
    "daysUntilAppointment": 5
  }
}
```

#### Appointment Confirmation Workflow
```yaml
1. New Booking Trigger
   ↓
2. Send Confirmation Email
    - Template: Appointment confirmation
    - Include: Date, time, location, preparation
    - Attach: Directions, forms if needed
   ↓
3. SMS Confirmation (Optional)
    - Message: "Appointment confirmed for {{date}} at {{time}}"
    - Include: Cancellation link
   ↓
4. Add to Staff Calendar
    - System: Google Calendar/Outlook
    - Include: Patient details, appointment type
    - Set: Reminder 15 minutes before
   ↓
5. Schedule Reminders
    - 24 hours before: Email reminder
    - 2 hours before: SMS reminder
    - 30 minutes before: Final reminder
```

#### Filtering Options
```yaml
# Appointment type filtering
Appointment Type: "Consultation"  # Specific types only
Category: "Clinical"              # Clinical appointments
Duration: "30-60"                 # Time range

# Status filtering
Status: "Confirmed"               # Confirmed only
Exclude: ["Cancelled", "No Show"] # Skip certain statuses

# Time-based filtering
Days Ahead: 1-30                  # Appointment range
Time Range: "09:00-17:00"        # Business hours only
Exclude Weekends: true            # Weekdays only
```

### Appointment Status Change Trigger

Monitor booking modifications for automated responses.

#### Configuration
```yaml
Resource: "Booking"
Event: "Updates Only"
Poll Interval: "Every 5 minutes"  # Frequent checking
Date Period: "Next 14 days"
```

#### Status Change Workflows

##### Appointment Confirmed
```yaml
Trigger: status changed to "Confirmed"
↓
Actions:
1. Send confirmation acknowledgment
2. Update calendar systems
3. Cancel "pending confirmation" reminders
4. Add to daily schedule reports
5. Notify relevant staff
```

##### Appointment Cancelled
```yaml
Trigger: status changed to "Cancelled"
↓
Actions:
1. Send cancellation confirmation
2. Remove from calendars
3. Offer slot to waiting list
4. Process refund if applicable
5. Update capacity planning
6. Log cancellation reason
```

##### Patient Arrived
```yaml
Trigger: status changed to "Arrived"
↓
Actions:
1. Notify practitioner
2. Update waiting room display
3. Start consultation timer
4. Mark as "in progress"
5. Update appointment analytics
```

##### Appointment Rescheduled
```yaml
Trigger: appointmentDate or appointmentTime changed
↓
Actions:
1. Send rescheduling confirmation
2. Update all calendar systems
3. Reschedule reminders
4. Notify staff of changes
5. Update room bookings
6. Manage waiting list impacts
```

## Product Triggers

### New Product/Service Trigger

Automate catalog updates and marketing when new services are added.

#### Configuration
```yaml
Resource: "Product"
Event: "New Only"
Poll Interval: "Every 1 hour"
Date Period: "Last 24 hours"
```

#### New Service Workflow
```yaml
1. New Product Trigger
   ↓
2. Website Catalog Update
    - System: WordPress/Shopify
    - Action: Add new service page
    - Include: Description, pricing, booking links
   ↓
3. Staff Notification
    - Email: All clinical staff
    - Content: New service details, protocols
    - Attach: Training materials
   ↓
4. Marketing Automation
    - Create: Social media posts
    - Schedule: Newsletter inclusion
    - Update: Service brochures
   ↓
5. System Integration
    - Update: Booking systems
    - Sync: Price lists
    - Configure: Appointment types
```

### Product Update Trigger

Monitor service changes for pricing, availability, and compliance updates.

#### Configuration
```yaml
Resource: "Product"
Event: "Updates Only"
Poll Interval: "Every 30 minutes"
Date Period: "Last 4 hours"
```

#### Price Change Workflow
```yaml
1. Product Update Trigger (price changed)
   ↓
2. Stakeholder Notifications
    - Email: Finance team
    - Alert: Reception staff
    - Update: Price display systems
   ↓
3. Patient Communications
    - Template: Price change notification
    - Schedule: Before effective date
    - Include: Grandfathering policies
   ↓
4. System Updates
    - Booking system: New pricing
    - Website: Updated price lists
    - Billing: Rate schedule updates
```

## Advanced Trigger Patterns

### Multi-Resource Monitoring

#### Combined Patient and Booking Workflow
```yaml
# Monitor related events across resources
Trigger 1: New Patient Registration
Trigger 2: New Booking for New Patients
↓
Combined Logic:
- If new patient registers
- AND books appointment within 24 hours
- THEN apply "new patient package" discount
- AND send enhanced welcome sequence
```

#### Cross-System Synchronization
```yaml
# Keep multiple systems in sync
Semble Changes → Update External Systems

Patient Triggers:
  → Update CRM (HubSpot/Salesforce)
  → Sync email marketing (Mailchimp)
  → Update billing system

Booking Triggers:
  → Sync calendars (Google/Outlook)
  → Update practice management
  → Notify staff applications

Product Triggers:
  → Update website catalog
  → Sync e-commerce platforms
  → Update mobile apps
```

### Conditional Trigger Logic

#### Time-Based Conditions
```yaml
Business Hours Logic:
  IF trigger_time BETWEEN 09:00 AND 17:00:
    → Process immediately
  ELSE:
    → Queue for next business day
    
Weekend Logic:
  IF day_of_week IN ['Saturday', 'Sunday']:
    → Emergency notifications only
  ELSE:
    → Full workflow processing
    
Holiday Logic:
  IF date IN holiday_calendar:
    → Reduced automation
    → Emergency workflows only
```

#### Priority-Based Processing
```yaml
High Priority Triggers:
  - Emergency appointments
  - VIP patient changes
  - Critical system alerts
  → Process: Immediately
  → Notification: SMS + Email
  
Standard Priority:
  - Regular appointments
  - Normal patient updates
  - Routine product changes
  → Process: Within poll interval
  → Notification: Email only
  
Low Priority:
  - Bulk updates
  - Historical corrections
  - Archive operations
  → Process: During off-hours
  → Notification: Daily summary
```

### Error Handling and Recovery

#### Retry Logic
```yaml
Failed Trigger Processing:
  Attempt 1: Immediate retry
  Attempt 2: 5-minute delay
  Attempt 3: 15-minute delay
  Attempt 4: 1-hour delay
  Attempt 5: Manual intervention
  
Error Categories:
  Temporary Network: Auto-retry
  API Rate Limit: Exponential backoff
  Data Validation: Manual review
  System Maintenance: Pause until available
```

#### Failure Notifications
```yaml
Critical Failures:
  - Patient safety related
  - Financial transactions
  - Legal compliance
  → Immediate escalation
  → Phone + SMS alerts
  
Standard Failures:
  - Routine automation
  - Non-critical sync
  - Marketing workflows
  → Email notification
  → Daily failure summary
```

### Performance Optimization

#### Efficient Polling Strategies

##### Smart Polling Intervals
```yaml
Dynamic Intervals:
  High Activity Periods:
    - Monday mornings: Every 5 minutes
    - Lunch hours: Every 15 minutes
    - Afternoon peak: Every 10 minutes
    
  Low Activity Periods:
    - Early mornings: Every 30 minutes
    - Evenings: Every 1 hour
    - Weekends: Every 4 hours
    - Holidays: Daily
```

##### Conditional Polling
```yaml
Activity-Based Polling:
  IF recent_changes > threshold:
    → Increase polling frequency
  IF no_changes for 2 hours:
    → Decrease polling frequency
  IF system_maintenance:
    → Pause polling
  IF emergency_mode:
    → Maximum frequency
```

#### Batch Processing
```yaml
Large Volume Handling:
  - Process triggers in batches of 10-25
  - Use parallel processing where possible
  - Implement circuit breakers for failures
  - Queue overflow for later processing
  
Memory Management:
  - Limit data retention in memory
  - Clean up processed records
  - Use streaming for large datasets
  - Monitor memory usage patterns
```

## Integration Workflows

### CRM Integration Patterns

#### HubSpot Integration
```yaml
Patient Triggers → HubSpot Contacts:
  New Patient:
    → Create HubSpot contact
    → Set lifecycle stage: "Customer"
    → Add to "New Patient" list
    
  Patient Update:
    → Update HubSpot contact
    → Sync changed fields
    → Update interaction timeline
    
  Booking Events:
    → Create HubSpot deal
    → Log appointment activities
    → Track service utilization
```

#### Salesforce Integration
```yaml
Healthcare Cloud Integration:
  Patient Events:
    → Person Account creation/update
    → Care Plan associations
    → Health Timeline updates
    
  Appointment Events:
    → Care Plan Tasks
    → Appointment History
    → Provider scheduling
```

### Email Marketing Integration

#### Mailchimp Automation
```yaml
Patient Lifecycle Marketing:
  New Patient:
    → Add to "Welcome Series" audience
    → Tag with registration source
    → Set preferences based on services
    
  Appointment Patterns:
    → Regular patients: "Loyalty" audience
    → Infrequent patients: "Re-engagement" 
    → Missed appointments: "Win-back"
```

#### Campaign Automation
```yaml
Triggered Campaigns:
  Appointment Reminders:
    - 7 days before: Preparation instructions
    - 24 hours before: Confirmation reminder
    - 2 hours before: Final reminder
    
  Follow-up Sequences:
    - 1 day after: Thank you + feedback
    - 1 week after: Health tips
    - 1 month after: Next appointment booking
```

### Calendar System Integration

#### Google Calendar Sync
```yaml
Bi-directional Sync:
  Semble → Google:
    - New appointments → Calendar events
    - Appointment changes → Event updates
    - Cancellations → Event deletion
    
  Google → Semble:
    - External events → Block time slots
    - Calendar changes → Availability updates
    - Recurring events → Ongoing blocks
```

#### Microsoft Outlook Integration
```yaml
Exchange Integration:
  Staff Calendars:
    - Individual practitioner calendars
    - Room/resource booking
    - Meeting coordination
    
  Patient Communications:
    - Appointment confirmations
    - Reminder emails
    - Follow-up scheduling
```

## Compliance and Auditing

### Data Protection Compliance

#### GDPR Compliance Workflows
```yaml
Patient Rights Automation:
  Data Subject Access:
    Trigger: Patient data request
    → Compile all patient data
    → Generate portable format
    → Secure delivery to patient
    
  Right to Erasure:
    Trigger: Deletion request
    → Validate request legitimacy
    → Check retention requirements
    → Execute secure deletion
    → Confirm completion
```

#### Audit Trail Generation
```yaml
Comprehensive Logging:
  Patient Triggers:
    - Who: System user/patient
    - What: Data accessed/modified
    - When: Timestamp with timezone
    - Where: IP address/location
    - Why: Business justification
    
  Booking Triggers:
    - Appointment lifecycle events
    - Status change reasons
    - Communication records
    - Staff assignments
```

### Healthcare Compliance

#### NHS Data Standards
```yaml
NHS Number Validation:
  Patient Registration:
    → Validate NHS number format
    → Check against NHS database
    → Flag discrepancies
    → Generate compliance report
    
  Appointment Coding:
    → Apply correct SNOMED codes
    → Validate procedure codes
    → Ensure billing compliance
    → Generate clinical reports
```

#### Clinical Governance
```yaml
Quality Metrics:
  Appointment Outcomes:
    → Track completion rates
    → Monitor no-show patterns
    → Analyze cancellation reasons
    → Generate quality reports
    
  Patient Safety:
    → Alert for missed appointments
    → Flag high-risk patients
    → Monitor medication compliance
    → Escalate safety concerns
```

## Monitoring and Troubleshooting

### Trigger Performance Monitoring

#### Health Checks
```yaml
Automated Monitoring:
  Polling Status:
    - Last successful poll timestamp
    - Error rate over time
    - Average processing time
    - Queue depth monitoring
    
  Data Quality:
    - Duplicate detection
    - Missing field validation
    - Timestamp accuracy
    - Cross-reference integrity
```

#### Performance Metrics
```yaml
Key Performance Indicators:
  Reliability:
    - Uptime percentage
    - Error rate (< 1%)
    - Recovery time
    
  Efficiency:
    - Processing time per record
    - Throughput (records/minute)
    - Resource utilization
    
  Accuracy:
    - Data synchronization accuracy
    - Missed events (< 0.1%)
    - Duplicate processing (< 0.5%)
```

### Common Issues and Solutions

#### Polling Problems
```yaml
Issue: "Trigger not firing"
Causes:
  - Incorrect date period configuration
  - API permission restrictions
  - Network connectivity issues
  - Rate limiting activation
  
Solutions:
  1. Check trigger configuration
  2. Verify API credentials
  3. Test manual execution
  4. Review error logs
  5. Adjust polling intervals
```

#### Data Synchronization Issues
```yaml
Issue: "Missing or duplicate records"
Causes:
  - Concurrent processing conflicts
  - Network interruptions during polling
  - API response truncation
  - Timestamp synchronization problems
  
Solutions:
  1. Implement idempotency keys
  2. Add duplicate detection logic
  3. Use transactional processing
  4. Monitor network stability
  5. Implement data reconciliation
```

#### Performance Degradation
```yaml
Issue: "Slow trigger execution"
Causes:
  - Large data volumes
  - Complex workflow logic
  - External system bottlenecks
  - Resource constraints
  
Solutions:
  1. Optimize data filtering
  2. Implement batch processing
  3. Use asynchronous operations
  4. Scale infrastructure
  5. Implement caching strategies
```

## Best Practices

### Trigger Design Principles

#### Efficiency Guidelines
```yaml
Data Minimization:
  - Request only necessary fields
  - Use appropriate date periods
  - Implement smart filtering
  - Limit record quantities
  
Performance Optimization:
  - Choose appropriate poll intervals
  - Batch related operations
  - Use conditional logic
  - Implement error handling
```

#### Reliability Standards
```yaml
Error Resilience:
  - Implement retry logic
  - Handle API limitations
  - Plan for network issues
  - Design graceful degradation
  
Data Integrity:
  - Validate input data
  - Implement duplicate prevention
  - Use transactional operations
  - Maintain audit trails
```

### Security Considerations

#### Access Control
```yaml
Principle of Least Privilege:
  - Limit API token permissions
  - Use resource-specific access
  - Implement role-based security
  - Regular permission audits
  
Data Protection:
  - Encrypt data in transit
  - Secure credential storage
  - Implement access logging
  - Regular security reviews
```

#### Privacy Protection
```yaml
Patient Data Handling:
  - Minimize data collection
  - Implement consent tracking
  - Provide opt-out mechanisms
  - Ensure deletion compliance
  
Communication Privacy:
  - Secure notification channels
  - Implement consent preferences
  - Use encrypted messaging
  - Maintain communication logs
```

## Next Steps

Explore advanced trigger implementations:

- **[Patient Operations](patient-nodes.md)** - Patient-specific trigger patterns
- **[Booking Operations](booking-nodes.md)** - Appointment automation workflows
- **[Product Operations](product-nodes.md)** - Service catalog automation
- **[Common Workflows](../examples/common-workflows.md)** - Ready-to-use trigger examples

---

**Need help?** Check our **[Troubleshooting Guide](../examples/troubleshooting.md)** or join the community discussions.
