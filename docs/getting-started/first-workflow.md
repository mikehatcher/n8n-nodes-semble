# Your First Workflow

Create your first Semble automation workflow in just a few minutes. This guide walks you through building a simple patient data synchronization workflow.

## Workflow Overview

We'll create a workflow that:

1. **Monitors** for new patients in Semble
2. **Extracts** patient information
3. **Sends** a welcome email
4. **Logs** the activity

## Step 1: Create a New Workflow

1. **Open n8n** and click **"New Workflow"**
2. **Name your workflow**: "Patient Welcome Automation"
3. **Save** the workflow (Ctrl+S / Cmd+S)

## Step 2: Add the Semble Trigger

### Add the Trigger Node
1. **Click the "+" button** to add a new node
2. **Search for "Semble Trigger"**
3. **Select "Semble Trigger"** from the results

### Configure the Trigger
```yaml
Resource: "Patient"
Event: "New Only"
Poll Interval: "Every 15 minutes"
Credentials: "Your Semble API credential"
```

#### Detailed Configuration:
- **Resource**: Patient (we want to monitor patient changes)
- **Event**: New Only (only trigger for new patients, not updates)
- **Poll Interval**: 15 minutes (check every 15 minutes for new patients)
- **Date Period**: Last 1 day (look for patients created in the last day)
- **Limit**: 10 records (process up to 10 new patients per execution)

### Test the Trigger
1. **Click "Test Step"** on the trigger node
2. **Verify** you see patient data in the output
3. **If no data appears**, check your credentials and try a longer date period

## Step 3: Process Patient Data

### Add a Code Node
1. **Click the "+" button** after the trigger
2. **Search for "Code"**
3. **Select "Code"** node

### Extract Patient Information
```javascript
// Extract patient information for welcome email
const patients = $input.all();
const processedPatients = [];

for (const patient of patients) {
  const patientData = patient.json;
  
  // Extract key information
  const welcomeData = {
    id: patientData.id,
    firstName: patientData.firstName,
    lastName: patientData.lastName,
    email: patientData.email,
    fullName: `${patientData.firstName} ${patientData.lastName}`,
    welcomeMessage: `Welcome to our practice, ${patientData.firstName}!`,
    registrationDate: new Date().toISOString().split('T')[0]
  };
  
  // Only process patients with email addresses
  if (welcomeData.email) {
    processedPatients.push(welcomeData);
  }
}

// Return processed data
return processedPatients.map(data => ({ json: data }));
```

## Step 4: Send Welcome Email

### Add Email Node
1. **Add a new node** after the Code node
2. **Search for "Send Email"** (or use Gmail, Outlook, etc.)
3. **Configure your email credentials**

### Email Configuration
```yaml
To: "{{ $json.email }}"
Subject: "Welcome to [Your Practice Name]!"
Email Format: "HTML"
```

### Email Template
```html
<h2>Welcome {{ $json.firstName }}!</h2>

<p>We're delighted to welcome you to our practice. Your patient record has been created and you're all set for your upcoming appointments.</p>

<h3>What's Next?</h3>
<ul>
  <li>You'll receive appointment reminders via email and SMS</li>
  <li>Access your patient portal at: <a href="https://your-portal.com">Patient Portal</a></li>
  <li>Contact us anytime at: practice@yourpractice.com</li>
</ul>

<p>We look forward to caring for you!</p>

<p><em>The Team at [Your Practice Name]</em></p>

<hr>
<small>Patient ID: {{ $json.id }} | Registration Date: {{ $json.registrationDate }}</small>
```

## Step 5: Log Activity

### Add HTTP Request Node
1. **Add a new node** for logging
2. **Choose HTTP Request** or your preferred logging service
3. **Configure** to send activity to your logging system

### Example Logging Configuration
```yaml
Method: "POST"
URL: "https://your-logging-service.com/api/logs"
Headers: 
  Content-Type: "application/json"
  Authorization: "Bearer YOUR_LOG_TOKEN"
Body: |
  {
    "event": "patient_welcome_sent",
    "patient_id": "{{ $json.id }}",
    "patient_name": "{{ $json.fullName }}",
    "email": "{{ $json.email }}",
    "timestamp": "{{ new Date().toISOString() }}",
    "workflow": "patient_welcome_automation"
  }
```

## Step 6: Test Your Workflow

### Complete Test Run
1. **Click "Execute Workflow"** button
2. **Monitor** each node's execution
3. **Check outputs** for expected data
4. **Verify** email was sent (check your inbox/logs)

### Debugging Tips
- **Green nodes**: Successful execution
- **Red nodes**: Errors occurred
- **Click nodes** to view input/output data
- **Check the execution log** for detailed information

## Step 7: Activate Your Workflow

### Enable Automatic Execution
1. **Toggle the workflow switch** to "Active"
2. **Confirm** the trigger is now monitoring
3. **Set up** error notifications (recommended)

### Monitor Performance
- **Check execution history** regularly
- **Monitor** for failed executions
- **Adjust polling interval** based on patient volume

## Advanced Enhancements

### Add Conditional Logic
Use an **IF node** to handle different scenarios:
```javascript
// Only send welcome emails during business hours
const currentHour = new Date().getHours();
const isBusinessHours = currentHour >= 9 && currentHour <= 17;

if (isBusinessHours) {
  // Send immediate welcome email
  return [{ json: $input.first().json }];
} else {
  // Queue for next business day
  return [null, { json: $input.first().json }];
}
```

### Add Error Handling
Include error notification:
```yaml
Node: "Send Email (Error Notification)"
To: "admin@yourpractice.com"
Subject: "Workflow Error: Patient Welcome"
Condition: "Only execute on error"
```

### Multiple Communication Channels
Expand to include:
- **SMS notifications** using Twilio
- **Slack messages** to staff channels
- **Database logging** for audit trails
- **CRM integration** with Salesforce/HubSpot

## Workflow Best Practices

### Performance
- ✅ Use appropriate polling intervals (15-60 minutes)
- ✅ Limit record processing per execution
- ✅ Implement error retry logic
- ❌ Avoid overly frequent polling

### Security
- ✅ Use environment variables for sensitive data
- ✅ Implement proper error handling
- ✅ Log important activities
- ❌ Include sensitive data in logs

### Maintenance
- ✅ Regularly review execution logs
- ✅ Monitor workflow performance
- ✅ Update email templates periodically
- ✅ Test workflows after Semble updates

## Troubleshooting

### Common Issues

#### No Patients Detected
```yaml
Problem: Trigger returns empty results
Solutions:
  - Check date period (try "Last 7 days")
  - Verify API credentials
  - Ensure patients exist in timeframe
  - Check Semble API permissions
```

#### Email Not Sending
```yaml
Problem: Email node fails
Solutions:
  - Verify email credentials
  - Check recipient email format
  - Test email service separately
  - Review email service limits
```

#### Workflow Stops Unexpectedly
```yaml
Problem: Execution halts
Solutions:
  - Check error logs
  - Verify all credentials
  - Test each node individually
  - Ensure proper data flow
```

## Next Steps

Now that you've created your first workflow:

- **Explore more nodes**: [Node Reference](../nodes/overview.md)
- **Build complex workflows**: [Integration Patterns](../examples/integration-patterns.md)
- **Learn troubleshooting**: [Troubleshooting Guide](../examples/troubleshooting.md)
- **Join the community**: [n8n Community Forum](https://community.n8n.io/)

## Workflow Templates

Download ready-made templates:
- [Patient Welcome Automation](../examples/templates/patient-welcome.json)
- [Appointment Reminders](../examples/templates/appointment-reminders.json)
- [Staff Notifications](../examples/templates/staff-notifications.json)

---

**Previous**: [← Configuration Guide](configuration.md) | **Next**: [Node Overview →](../nodes/overview.md)
