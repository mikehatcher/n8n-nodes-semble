# Product Operations

Manage your practice's service catalog, inventory, and pricing with comprehensive product operations, automated stock management, and real-time availability tracking.

## Quick Reference

### Available Operations

| Operation | Action Node | Trigger Node | Description |
|-----------|-------------|--------------|-------------|
| **Get Product** | ✅ | ❌ | Retrieve single product by ID |
| **Get All Products** | ✅ | ❌ | Fetch multiple products with filtering |
| **Create Product** | ✅ | ❌ | Add new service/product |
| **Update Product** | ✅ | ❌ | Modify existing product |
| **Delete Product** | ✅ | ❌ | Remove product from catalog |
| **Monitor New Products** | ❌ | ✅ | Trigger on new products added |
| **Monitor Product Updates** | ❌ | ✅ | Trigger on product modifications |
| **Monitor All Product Activity** | ❌ | ✅ | Trigger on any product changes |

## Product Data Structure

### Core Fields
```yaml
# Primary Identification
id: "string"                    # Unique product identifier
name: "string"                  # Product/service name
code: "string"                  # Product code/SKU
barcode: "string"               # Barcode for physical items

# Classification
category: "string"              # Product category
type: "Service|Product|Package" # Product type
status: "Active|Inactive"       # Availability status
```

### Pricing Information
```yaml
# Basic Pricing
price: "number"                 # Base price
cost: "number"                  # Cost price
currency: "string"              # Currency code (GBP, EUR, USD)
taxRate: "number"               # Tax rate percentage
taxIncluded: "boolean"          # Whether tax is included in price

# Advanced Pricing
priceList: [
  {
    priceType: "Standard|Concession|Private"
    amount: "number"
    validFrom: "ISO 8601 date"
    validTo: "ISO 8601 date"
  }
]

# Billing Configuration
billingFrequency: "Once|Weekly|Monthly|Yearly"
subscriptionBased: "boolean"
autoRenewal: "boolean"
```

### Service Configuration
```yaml
# Service Details (for service-type products)
duration: "number"              # Service duration in minutes
preparation: "number"           # Preparation time required
cleanup: "number"               # Cleanup time after service
bufferTime: "number"            # Buffer time between services

# Booking Configuration
bookable: "boolean"             # Can be booked online
requiresAppointment: "boolean"  # Appointment mandatory
maxAdvanceBooking: "number"     # Days in advance for booking
cancellationWindow: "number"    # Hours before appointment

# Staff Requirements
staffRequired: "boolean"        # Requires staff assignment
specificStaff: ["staff_id"]     # Specific staff members
minimumStaffLevel: "string"     # Minimum qualification required
```

### Inventory Management
```yaml
# Stock Information (for physical products)
trackStock: "boolean"           # Enable stock tracking
currentStock: "number"          # Current stock level
minimumStock: "number"          # Reorder level
maximumStock: "number"          # Maximum stock level
unitOfMeasure: "string"         # Unit (each, kg, ml, etc.)

# Supplier Information
suppliers: [
  {
    id: "string"                # Supplier identifier
    name: "string"              # Supplier name
    productCode: "string"       # Supplier's product code
    leadTime: "number"          # Delivery lead time (days)
    minimumOrder: "number"      # Minimum order quantity
    cost: "number"              # Supplier cost
  }
]

# Stock Movements
stockMovements: [
  {
    id: "string"                # Movement identifier
    type: "In|Out|Adjustment"   # Movement type
    quantity: "number"          # Quantity changed
    reason: "string"            # Reason for movement
    date: "ISO 8601 datetime"   # Movement timestamp
    reference: "string"         # Reference (order, appointment)
  }
]
```

### Clinical Information
```yaml
# Clinical Details (for medical products/services)
clinicalCategory: "string"      # Clinical classification
prescription: "boolean"         # Prescription required
controlled: "boolean"           # Controlled substance
dosage: "string"               # Dosage information
contraindications: "string"     # Contraindications
sideEffects: "string"          # Known side effects

# Regulatory Information
licenseRequired: "boolean"      # License required to provide
regulatoryCode: "string"        # Regulatory classification code
expiryTracking: "boolean"       # Track expiry dates
batchTracking: "boolean"        # Track batch numbers
```

### Administrative Fields
```yaml
# Documentation
description: "string"           # Full product description
shortDescription: "string"      # Brief summary
instructions: "string"          # Usage instructions
notes: "string"                 # Internal notes

# Metadata
dateCreated: "ISO 8601 datetime"     # Creation timestamp
dateUpdated: "ISO 8601 datetime"     # Last modification
createdBy: "string"                  # Creator identifier
updatedBy: "string"                  # Last modifier

# Organization
tags: ["string"]                     # Classification tags
keywords: ["string"]                 # Search keywords
displayOrder: "number"               # Display ordering
featured: "boolean"                  # Featured product flag
```

## Action Node Operations

### Get Single Product

Retrieve detailed information for a specific product or service.

#### Configuration
```yaml
Resource: "Product"
Action: "Get"
Product ID: "prod_id_here"
```

#### Example Output
```json
{
  "id": "prod_123456789",
  "name": "General Consultation",
  "code": "CONS-GEN-30",
  "category": "Consultations",
  "type": "Service",
  "status": "Active",
  "price": 85.00,
  "currency": "GBP",
  "duration": 30,
  "bookable": true,
  "description": "30-minute general practice consultation",
  "staffRequired": true,
  "minimumStaffLevel": "GP",
  "dateCreated": "2024-01-10T09:00:00Z"
}
```

#### Use Cases
- Appointment booking systems
- Invoice generation
- Service catalog displays
- Price verification workflows

### Get Multiple Products

Retrieve product catalogs with filtering and categorization options.

#### Configuration
```yaml
Resource: "Product"
Action: "Get All"
Limit: 50                       # Number of records
Return All: false               # Pagination control
```

#### Category-Based Filtering
```yaml
# Service categories
Category: "Consultations"       # Specific category
Type: "Service"                 # Service vs Product
Status: "Active"                # Active products only

# Price range filtering
Minimum Price: 50.00
Maximum Price: 200.00
Currency: "GBP"

# Availability filtering
Bookable Only: true             # Online bookable services
Staff Required: false           # No staff requirement
In Stock: true                  # Available inventory
```

#### Advanced Filtering
```yaml
# Clinical filtering
Prescription Required: false    # Over-counter only
Clinical Category: "Diagnostics"
Regulatory Code: "NHS-001"

# Business filtering
Featured Products: true         # Featured in catalog
Recently Added: "Last 30 days"
Updated Since: "2024-01-01"
Tags: ["wellness", "preventive"]
```

#### Example Filtered Query
```yaml
# Active consultation services under £100
Filters:
  category: "Consultations"
  type: "Service"
  status: "Active"
  price: { "lte": 100.00 }
  bookable: true
  
Order By: "price ASC"
Limit: 25
```

#### Use Cases
- Service catalog generation
- Price list creation
- Inventory management reports
- Online booking system integration

### Create New Product

Add new products or services to your practice catalog.

#### Required Fields
```yaml
Resource: "Product"
Action: "Create"

# Minimum required data
name: "Blood Pressure Check"
code: "BP-CHECK-001"
category: "Health Checks"
type: "Service"
price: 25.00
```

#### Complete Service Creation
```yaml
# Basic Information
name: "Comprehensive Health Assessment"
code: "HEALTH-ASSESS-COMP"
category: "Health Assessments"
type: "Service"
status: "Active"

# Pricing
price: 150.00
currency: "GBP"
taxRate: 20.0
taxIncluded: true

# Service Configuration
duration: 60
preparation: 10
bufferTime: 15
bookable: true
requiresAppointment: true

# Staff Requirements
staffRequired: true
minimumStaffLevel: "Practice Nurse"
specificStaff: ["staff_nurse_001", "staff_nurse_002"]

# Documentation
description: "Comprehensive health assessment including vital signs, health history review, and wellness planning"
instructions: "Patient should fast for 12 hours before appointment"
```

#### Physical Product Creation
```yaml
# Basic Information
name: "Blood Glucose Test Strips"
code: "BGT-STRIPS-50"
category: "Diabetic Supplies"
type: "Product"
status: "Active"

# Pricing
price: 15.99
cost: 8.50
currency: "GBP"

# Inventory Management
trackStock: true
currentStock: 120
minimumStock: 20
maximumStock: 500
unitOfMeasure: "box"

# Supplier Information
suppliers: [
  {
    name: "Medical Supplies Ltd",
    productCode: "MS-BGT-50",
    leadTime: 3,
    minimumOrder: 10,
    cost: 8.00
  }
]

# Clinical Information
prescription: false
expiryTracking: true
batchTracking: true
```

#### Validation Rules
```yaml
Product Code:
  - Must be unique across all products
  - Alphanumeric and hyphens only
  - Maximum 20 characters
  
Name:
  - Cannot be empty
  - Maximum 100 characters
  - Must be unique within category
  
Price:
  - Must be positive number
  - Maximum 2 decimal places
  - Currency must be valid ISO code
```

#### Use Cases
- Service catalog expansion
- New treatment offerings
- Inventory addition
- Seasonal service introduction

### Update Product Information

Modify existing products with change tracking and impact analysis.

#### Configuration
```yaml
Resource: "Product"
Action: "Update"
Product ID: "prod_123456789"

# Fields to update
price: 95.00
description: "Updated consultation service with extended health review"
status: "Active"
```

#### Common Update Scenarios

##### Price Updates
```yaml
Updates:
  price: 120.00
  validFrom: "2024-03-01"
  priceChangeReason: "Annual price review"
  
Impact Analysis:
  - Check existing appointments
  - Update price lists
  - Notify patients of changes
  - Update billing templates
```

##### Service Modifications
```yaml
Updates:
  duration: 45                   # Extend consultation time
  preparation: 15                # Increase prep time
  minimumStaffLevel: "Senior GP" # Upgrade staff requirement
  
Validation:
  - Check staff availability
  - Verify schedule impacts
  - Update booking rules
  - Recalculate capacity
```

##### Inventory Adjustments
```yaml
Updates:
  currentStock: 85               # Stock adjustment
  minimumStock: 25               # Update reorder level
  cost: 9.25                     # New supplier cost
  
Automatic Actions:
  - Generate stock movement record
  - Check reorder requirements
  - Update cost calculations
  - Alert if below minimum
```

#### Bulk Updates
```yaml
# Update entire category pricing
Category Filter: "Consultations"
Updates:
  taxRate: 20.0                  # Update VAT rate
  currency: "GBP"                # Standardize currency
  
# Seasonal availability updates
Tag Filter: "seasonal"
Updates:
  status: "Inactive"             # Disable seasonal services
  notes: "Disabled for winter period"
```

#### Use Cases
- Price list maintenance
- Service capability updates
- Inventory adjustments
- Regulatory compliance updates

### Discontinue/Delete Products

Remove products from catalog with proper lifecycle management.

#### Configuration
```yaml
Resource: "Product"
Action: "Delete"
Product ID: "prod_123456789"
Discontinuation Reason: "Service no longer offered"
```

#### Discontinuation Types

##### Soft Discontinuation (Recommended)
```yaml
Updates:
  status: "Discontinued"
  discontinuedDate: "2024-03-01"
  discontinuationReason: "Replaced by new service"
  replacementProduct: "prod_new_service"
  
Effects:
  - Hidden from new bookings
  - Existing appointments preserved
  - Historical data maintained
  - Can be reactivated if needed
```

##### Hard Deletion (Restricted)
```yaml
Action: "Delete"
Permanent: true
Reason: "Duplicate entry"
Authorization: "admin_override"

Effects:
  - Complete record removal
  - Cannot be restored
  - Breaks historical references
  - Audit log entry only
```

#### Impact Assessment
```yaml
Before Discontinuation:
  1. Check active appointments
  2. Review recurring bookings
  3. Identify dependent products
  4. Plan patient communications
  5. Update marketing materials
  
Migration Planning:
  - Suggest replacement products
  - Update booking systems
  - Retrain staff if needed
  - Communicate changes to patients
```

## Trigger Node Operations

### Monitor New Products

Automatically trigger workflows when products are added to catalog.

#### Configuration
```yaml
Resource: "Product"
Event: "New Only"
Poll Interval: "Every 1 hour"
Date Period: "Last 24 hours"
Limit: 10
```

#### Trigger Conditions
```yaml
# Product type filtering
Product Type: "Service"         # Services only
Category: "Consultations"       # Specific category
Status: "Active"                # Active products only

# Pricing conditions
Minimum Price: 50.00           # Price threshold
Featured Only: true            # Featured products

# Time-based triggers
Poll Frequency: "15m|1h|4h|daily"
Lookback Period: "1h|24h|7d"
```

#### Example Workflow
```yaml
1. New Product Trigger
   ↓
2. Update Website Catalog
   ↓
3. Generate Marketing Material
   ↓
4. Train Staff on New Service
   ↓
5. Send Newsletter to Patients
```

#### Use Cases
- Catalog synchronization
- Marketing automation
- Staff training triggers
- Website updates
- Patient communications

### Monitor Product Updates

Track changes to existing products and automate business processes.

#### Configuration
```yaml
Resource: "Product"
Event: "Updates Only"
Poll Interval: "Every 30 minutes"
Date Period: "Last 4 hours"
```

#### Change Detection
```yaml
Tracked Changes:
  - Price modifications
  - Status changes
  - Stock level updates
  - Service configuration changes
  - Description updates

Change Metadata:
  - Previous values
  - New values
  - Change timestamp
  - Modified fields
  - Change source/reason
```

#### Example Change Data
```json
{
  "id": "prod_123456789",
  "changes": {
    "price": {
      "from": 85.00,
      "to": 95.00,
      "changedAt": "2024-02-20T14:30:00Z",
      "reason": "Annual price review"
    },
    "minimumStock": {
      "from": 15,
      "to": 25,
      "changedAt": "2024-02-20T14:30:00Z",
      "reason": "Stock optimization"
    }
  }
}
```

#### Change-Specific Triggers
```yaml
Price Changes:
  - Update booking systems
  - Notify patients of changes
  - Update invoicing templates
  - Regenerate price lists
  
Stock Level Changes:
  - Check reorder requirements
  - Alert staff of low stock
  - Update availability displays
  - Generate purchase orders
  
Status Changes:
  - Update website availability
  - Modify booking rules
  - Communicate to staff
  - Handle existing appointments
```

#### Use Cases
- Price change notifications
- Stock management automation
- System synchronization
- Compliance monitoring
- Staff communications

### Monitor All Product Activity

Capture complete product lifecycle events in one trigger.

#### Configuration
```yaml
Resource: "Product"
Event: "New and Updates"
Poll Interval: "Every 45 minutes"
Date Period: "Last 2 hours"
```

#### Activity Types
```yaml
New Product:
  - event: "created"
  - data: Complete product record
  - metadata: Creation source, initial settings
  
Updated Product:
  - event: "updated"
  - data: Current product record
  - metadata: Changed fields, change reasons
  
Discontinued Product:
  - event: "discontinued"
  - data: Final product state
  - metadata: Discontinuation reason, replacement
  
Stock Movement:
  - event: "stock_changed"
  - data: Current stock levels
  - metadata: Movement type, quantity, reason
```

## Advanced Product Management

### Service Packages and Bundles

#### Package Creation
```yaml
# Create service package
Package Product:
  name: "Annual Health Package"
  code: "HEALTH-PKG-ANNUAL"
  type: "Package"
  price: 450.00
  
Component Services:
  - productId: "prod_consultation"
    quantity: 4
    interval: "quarterly"
  - productId: "prod_health_check"
    quantity: 1
    interval: "annual"
  - productId: "prod_blood_work"
    quantity: 2
    interval: "biannual"
  
Package Rules:
  validFor: "12 months"
  transferable: false
  refundable: "partial"
  autoRenewal: true
```

#### Bundle Pricing
```yaml
# Bundled pricing strategy
Individual Prices:
  - Consultation: £85 × 4 = £340
  - Health Check: £150 × 1 = £150
  - Blood Work: £75 × 2 = £150
  Total Individual: £640
  
Bundle Price: £450
Savings: £190 (30% discount)

Dynamic Pricing:
  - Tier 1 (1-2 services): No discount
  - Tier 2 (3-4 services): 15% discount
  - Tier 3 (5+ services): 25% discount
```

### Inventory Management Workflows

#### Automated Reordering
```yaml
Reorder Trigger:
  condition: "currentStock <= minimumStock"
  
Reorder Process:
  1. Calculate order quantity
  2. Select preferred supplier
  3. Generate purchase order
  4. Send to supplier system
  5. Create delivery tracking
  6. Update stock forecasts
  
Order Calculation:
  orderQuantity = maximumStock - currentStock
  leadTimeBuffer = averageDemand × leadTimeDays
  safetyStock = leadTimeBuffer × 1.5
```

#### Stock Movement Tracking
```yaml
Incoming Stock:
  trigger: "delivery_received"
  actions:
    - Update currentStock
    - Record batch/expiry
    - Generate receipt
    - Update cost basis
    
Outgoing Stock:
  trigger: "service_delivered"
  actions:
    - Decrease currentStock
    - Record usage
    - Check reorder levels
    - Update service costs
    
Stock Adjustments:
  trigger: "manual_adjustment"
  actions:
    - Record variance
    - Investigate discrepancy
    - Update stock levels
    - Audit trail entry
```

### Pricing Management

#### Dynamic Pricing Models
```yaml
Time-Based Pricing:
  peak_hours:
    multiplier: 1.2
    times: ["09:00-12:00", "14:00-17:00"]
  off_peak:
    multiplier: 0.9
    times: ["08:00-09:00", "17:00-18:00"]
  weekend:
    multiplier: 1.5
    days: ["Saturday", "Sunday"]
```

#### Patient-Type Pricing
```yaml
Pricing Tiers:
  private_patient:
    base_rate: 1.0
    description: "Standard private rates"
    
  nhs_patient:
    base_rate: 0.0
    description: "NHS funded services"
    
  insurance_patient:
    base_rate: 0.95
    description: "Insurance contracted rates"
    
  corporate_client:
    base_rate: 0.85
    description: "Corporate package rates"
```

#### Promotional Pricing
```yaml
# Limited time promotions
Promotion:
  name: "New Patient Special"
  code: "NEWPAT50"
  discount: 50.0
  discountType: "percentage"
  validFrom: "2024-02-01"
  validTo: "2024-02-29"
  applicableProducts: ["consultation", "health_check"]
  maxUses: 100
  firstTimeOnly: true
  
Automatic Application:
  - Check patient history
  - Validate promotion code
  - Apply discount
  - Track usage
  - Generate reporting
```

## Clinical Product Management

### Prescription Product Handling

#### Prescription Requirements
```yaml
Prescription Product:
  name: "Diabetes Medication Review"
  prescription: true
  controlled: false
  clinicalCategory: "Endocrinology"
  
Requirements:
  - Valid prescription required
  - Clinical review mandatory
  - Dosage verification needed
  - Interaction checking required
  
Workflow:
  1. Verify prescription validity
  2. Check patient contraindications
  3. Review current medications
  4. Confirm dosage appropriateness
  5. Document clinical decision
  6. Dispense or recommend
```

#### Controlled Substance Management
```yaml
Controlled Product:
  name: "Pain Management Consultation"
  controlled: true
  licenseRequired: true
  specialAuthorization: "pain_management"
  
Tracking Requirements:
  - Batch number recording
  - Expiry date monitoring
  - Usage documentation
  - Disposal procedures
  - Audit trail maintenance
  
Compliance:
  - Regular stock reconciliation
  - Secure storage verification
  - Access control logging
  - Regulatory reporting
```

### Medical Device Management

#### Device Product Configuration
```yaml
Medical Device:
  name: "ECG Machine Service"
  type: "Service"
  deviceRequired: true
  deviceId: "ECG-001"
  calibrationRequired: true
  
Maintenance Schedule:
  dailyChecks: ["calibration", "consumables"]
  weeklyChecks: ["deep_clean", "function_test"]
  monthlyChecks: ["professional_service"]
  annualChecks: ["certification", "replacement"]
  
Usage Tracking:
  - Service count per device
  - Maintenance schedule compliance
  - Device downtime tracking
  - Cost per service analysis
```

## Integration Patterns

### Practice Management System Integration

#### Two-Way Product Sync
```yaml
Semble → PMS:
  Trigger: Product Updates
  Action: Update Service Catalog
  
PMS → Semble:
  Trigger: Service Modifications
  Action: Update Semble Products
  
Sync Rules:
  - Semble master for clinical products
  - PMS master for billing codes
  - Conflict resolution workflow
  - Manual review for discrepancies
```

#### Billing System Integration
```yaml
Product → Invoice Integration:
  triggers: ["service_delivered", "product_sold"]
  
Invoice Line Item:
  - Product code and description
  - Quantity and unit price
  - Tax calculations
  - Discount applications
  - Total amount
  
Automated Billing:
  - Service completion triggers invoice
  - Package services billed on schedule
  - Subscription renewals automated
  - Payment processing integration
```

### E-commerce Integration

#### Online Catalog Sync
```yaml
Website Product Sync:
  - Active products only
  - Public-facing descriptions
  - Current pricing and availability
  - Booking links where applicable
  - Category organization
  
Real-time Updates:
  - Price changes reflected immediately
  - Stock availability updates
  - Service availability modifications
  - Promotional pricing activation
```

#### Online Booking Integration
```yaml
Bookable Products:
  filter: "bookable = true AND status = 'Active'"
  
Booking Configuration:
  - Available time slots
  - Staff assignments
  - Duration and pricing
  - Preparation requirements
  - Cancellation policies
  
Customer Experience:
  - Product selection interface
  - Real-time availability
  - Pricing transparency
  - Booking confirmation
```

## Performance and Optimization

### Catalog Performance

#### Query Optimization
```yaml
# Efficient product listing
Indexes:
  - category + status
  - type + bookable
  - price range queries
  - featured products
  
Caching Strategy:
  - Active products: 15 minutes
  - Category lists: 1 hour
  - Price lists: 30 minutes
  - Featured products: 2 hours
```

#### Large Catalog Management
```yaml
Pagination Strategy:
  - Category-based pagination
  - Price range filtering
  - Search result optimization
  - Virtual scrolling for large lists
  
Performance Limits:
  - Category listings: 50-100 products
  - Search results: 25-50 products
  - Full catalog: 500+ products (reporting only)
```

### Stock Management Performance

#### Efficient Stock Operations
```yaml
Stock Updates:
  - Batch processing for multiple updates
  - Asynchronous stock movements
  - Real-time availability checks
  - Optimistic locking for conflicts
  
Reporting Optimization:
  - Pre-calculated stock values
  - Cached movement summaries
  - Scheduled report generation
  - Historical data archiving
```

## Security and Compliance

### Product Data Security

#### Access Control
```yaml
Product Management Roles:
  catalog_admin:
    - Full product CRUD access
    - Pricing management
    - Category administration
    
clinical_staff:
    - Clinical product access
    - Service delivery recording
    - Patient-specific pricing
    
reception_staff:
    - Product lookup access
    - Basic booking information
    - Price list viewing
```

#### Data Protection
```yaml
Sensitive Information:
  - Cost prices (restricted access)
  - Supplier information (confidential)
  - Profit margins (management only)
  - Clinical protocols (licensed staff only)
  
Audit Requirements:
  - All price changes logged
  - Stock movements tracked
  - Access attempts recorded
  - Administrative changes documented
```

### Regulatory Compliance

#### Healthcare Product Regulations
```yaml
MHRA Compliance:
  - Medical device registration
  - Adverse event reporting
  - Quality management systems
  - Post-market surveillance
  
NHS Standards:
  - Service coding compliance
  - Price transparency requirements
  - Contract pricing adherence
  - Clinical governance standards
```

#### Financial Compliance
```yaml
VAT/Tax Compliance:
  - Correct tax rates applied
  - Exempt services identified
  - Cross-border service rules
  - Invoice requirements met
  
Pricing Regulations:
  - Competition law compliance
  - Price discrimination rules
  - Consumer protection standards
  - Contract terms transparency
```

## Troubleshooting Guide

### Common Product Issues

#### Pricing Discrepancies
```yaml
Symptoms: "Price mismatch in billing"
Causes:
  - Multiple price lists active
  - Tax calculation errors
  - Promotional code conflicts
  - Currency conversion issues
  
Solutions:
  1. Verify active price list
  2. Check tax configuration
  3. Review promotional rules
  4. Validate currency settings
```

#### Stock Level Problems
```yaml
Symptoms: "Negative stock levels"
Causes:
  - Concurrent usage recording
  - Missing stock receipts
  - Adjustment errors
  - System synchronization delays
  
Solutions:
  1. Reconcile physical stock
  2. Review movement history
  3. Check system integrations
  4. Implement stock alerts
```

#### Service Availability Issues
```yaml
Symptoms: "Service not bookable"
Causes:
  - Staff assignment missing
  - Calendar configuration errors
  - Service status inactive
  - Time slot conflicts
  
Solutions:
  1. Verify staff assignments
  2. Check calendar setup
  3. Confirm service status
  4. Review booking rules
```

### Debugging Techniques

#### Product Workflow Analysis
```yaml
1. Verify Product Configuration
    - Check all required fields
    - Validate pricing setup
    - Confirm staff assignments
    - Test booking availability
   
2. Test Service Delivery
    - Simulate booking process
    - Record service completion
    - Verify billing integration
    - Check stock updates
   
3. Monitor Integration Points
    - PMS synchronization
    - Website catalog updates
    - Billing system integration
    - Inventory management
```

## Next Steps

Explore related product topics:

- **[Patient Operations](patient-nodes.md)** - Patient-product relationship management
- **[Booking Operations](booking-nodes.md)** - Service booking integration
- **[Trigger Workflows](trigger-nodes.md)** - Product automation patterns
- **[Common Workflows](../examples/common-workflows.md)** - Product management examples

---

**Need help?** Check our **[Troubleshooting Guide](../examples/troubleshooting.md)** or join the community discussions.
