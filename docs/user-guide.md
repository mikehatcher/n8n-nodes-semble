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
  - Includes comprehensive appointment data: patient info, doctor details, location, timing
  - Appointment pricing information (when available)
  - Journey tracking: arrival, consultation, and departure states
- **Patient**: Create, read, update, delete, and list patients
  - Comprehensive patient data: personal info, contact details, relationships
  - Patient documents, medical records, and prescriptions (excluded from triggers for performance)
  - Custom attributes and practice-specific fields
- **Product**: Read and list products/services
  - Complete product catalog data: pricing, inventory, supplier information
  - Product labels, tax information, and booking configuration
  - Recursive appointment relationships with full product details


### Semble Trigger

The Semble Trigger node monitors for changes in your Semble data and triggers workflows automatically.

#### Available Triggers
- **Booking Trigger**: Monitor new and updated bookings/appointments
- **Patient Trigger**: Monitor new and updated patient records
- **Product Trigger**: Monitor new and updated products/services

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

### Appointment Management
- **Booking Notifications**: Monitor new bookings and send notifications via email, SMS, or Slack
- **Data Synchronization**: Sync booking data between Semble and other systems like CRM platforms or calendar applications
- **Automated Workflows**: Create workflows for appointment confirmations, reminders, and follow-ups
- **Revenue Tracking**: Extract booking and pricing data for custom reporting and analytics

### Patient Management
- **Patient Onboarding**: Automatically create patient records in external systems when new patients are added
- **Contact Updates**: Sync patient contact information across multiple platforms
- **Relationship Management**: Track patient relationships and emergency contacts
- **Custom Workflows**: Use patient data to trigger personalized communication and care pathways

### Product/Service Management
- **Inventory Tracking**: Monitor product stock levels and trigger reorder workflows
- **Price Synchronization**: Sync pricing changes across multiple platforms or e-commerce systems
- **Service Catalog Updates**: Automatically update external systems when services are modified
- **Tax and Compliance**: Track tax rate changes and ensure compliance across booking systems
- **Supplier Management**: Monitor supplier information and automate vendor communication
- **Revenue Analytics**: Extract product performance data for business intelligence

## Data Field Information

### Understanding Null Values

When working with Semble data, you may notice some fields return `null` values. This is normal and expected behavior representing actual data states:

#### Booking Fields
- **`cancellationReason`**: Only populated for cancelled appointments
- **`videoUrl`**: Only present for video/telehealth consultations  
- **`onlineBookingPaymentStatus`**: Only for appointments booked through online booking system
- **`bookingJourney` subfields** (`consultation`, `dna`, etc.): Populated as appointment progresses through different states
- **`appointment.price`**: May be null if pricing hasn't been set for that appointment type

#### Patient Fields  
- **`episodes`**: Complex medical episode data (excluded from triggers for performance)
- **`consultations`**: Detailed consultation records (excluded from triggers for performance)
- **`letters`**, **`labs`**, **`prescriptions`**: Clinical data (excluded from triggers)
- **Custom attributes**: May be null if not configured for your practice

#### Product Fields
- **`tax`**: Tax information with name, rate, and code - may be null if no tax applied
- **`stockLevel`**: Current inventory level - may be null for non-inventory items
- **`supplierName`**, **`supplierDisplayName`**: Supplier information - null if not configured
- **`price`**, **`cost`**: Financial data - may be null if pricing not set
- **`appointments`**: Recursive product relationships - contains full product data for related services
- **`labels`**: Product categorization tags - array may be empty if no labels assigned
- **Booking configuration**: `isBookable`, `requiresPayment`, `requiresConfirmation` - boolean flags for service setup

### Understanding Excluded Fields

Some complex fields are excluded from n8n triggers for performance reasons but show explanatory messages:

- **Patient medical data**: Episodes, consultations, prescriptions, lab results, and letters are excluded
- **Large datasets**: Fields that could contain hundreds of records are excluded to maintain trigger performance
- **Dedicated access**: Use specific API calls or the main Semble node for accessing excluded data

These fields will show "Excluded from n8n." instead of actual data in trigger outputs.

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
