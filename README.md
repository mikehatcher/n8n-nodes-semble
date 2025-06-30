# n8n-nodes-semble

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

This is an n8n community node for **Semble**, a practice management system for healthcare providers.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Usage](#usage)  
[Resources](#resources)  

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-semble` in **Enter npm package name**.
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes: select **I understand the risks of installing unverified code from a public source**.
5. Select **Install**.

After installing the node, you can use it like any other node. n8n displays the node in search results in the **Nodes** panel.

## Operations

This node supports the following operations:

### Appointments
- **Create**: Create a new appointment
- **Get**: Retrieve a specific appointment by ID
- **Get Many**: Retrieve multiple appointments with filtering options
- **Update**: Update an existing appointment
- **Delete**: Delete an appointment

### Patients  
- **Create**: Create a new patient record
- **Get**: Retrieve a specific patient by ID
- **Get Many**: Retrieve multiple patients with search/filtering
- **Update**: Update an existing patient record

### Staff
- **Get**: Retrieve a specific staff member by ID
- **Get Many**: Retrieve all staff members

## Credentials

This node requires Semble API credentials. You'll need:

- **API Token**: Your Semble API token (x-token header)
- **GraphQL Endpoint**: The GraphQL endpoint for the Semble API (default: `https://open.semble.io/graphql`)

### How to obtain credentials:

1. Log in to your Semble account
2. Navigate to Settings > API / Integrations
3. Generate a new API token
4. Copy the API token for use in n8n

**Note**: This node uses Semble's GraphQL API for all operations, providing more efficient and flexible data querying.

## Usage

1. **Add credentials**: Create new Semble API credentials in n8n
2. **Add the node**: Search for "Semble" in the nodes panel
3. **Configure**: Select the resource (appointment, patient, staff) and operation
4. **Set parameters**: Fill in the required fields based on the operation
5. **Execute**: Run your workflow

### Example: Creating an Appointment

```json
{
  "resource": "appointment",
  "operation": "create",
  "patientId": "patient_123",
  "staffId": "staff_456", 
  "appointmentTypeId": "type_789",
  "startTime": "2025-07-01T10:00:00Z",
  "endTime": "2025-07-01T10:30:00Z",
  "additionalFields": {
    "notes": "Follow-up consultation",
    "status": "scheduled"
  }
}
```

### Example: Getting Appointments

```json
{
  "resource": "appointment", 
  "operation": "getAll",
  "returnAll": false,
  "limit": 50,
  "filters": {
    "staffId": "staff_456",
    "dateFrom": "2025-07-01T00:00:00Z",
    "dateTo": "2025-07-31T23:59:59Z",
    "status": "scheduled"
  }
}
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Semble API documentation](https://docs.semble.io/)
- [Semble website](https://semble.io/)

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)

## Contributing

This node is maintained by Mike Hatcher. Issues and feature requests can be submitted via [GitHub Issues](https://github.com/mikehatcher/n8n-nodes-semble/issues).

## Version History

### 1.0.0
- Initial release with GraphQL API support
- Support for Appointments, Patients, and Staff resources
- Full CRUD operations for appointments and patients
- Read operations for staff
- Comprehensive filtering and pagination support
- Uses Semble's GraphQL API for efficient data operations
