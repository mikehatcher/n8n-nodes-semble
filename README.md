# n8n-nodes-semble

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

This is an n8n community node for **Semble**, a practice management system for healthcare providers.

## 🚀 Current Status: Fully Functional

**All features are now tested and working:**
- ✅ **GraphQL API Integration** - Complete migration from REST to GraphQL
- ✅ **CRUD Operations** - Patients, Appointments, Products  
- ✅ **Polling Triggers** - All 6 trigger types (patients, appointments, products)
- ✅ **Authentication** - x-token header authentication working
- ✅ **Rate Limiting** - Built-in protection for 120 requests/minute limit
- ✅ **Development Environment** - Automated Docker setup and testing
- ✅ **Comprehensive Documentation** - Setup, usage, and troubleshooting guides

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Usage](#usage)  
[Resources](#resources)  

## Development

### Quick Start

1. **Setup development environment:**
   ```bash
   npm run setup:test-env
   npm run pack:local
   ```

2. **Start n8n with the node:**
   ```bash
   npm run start:n8n
   npm run setup:owner
   npm run install:node
   ```

3. **Open n8n:** http://localhost:5678
   - Use the credentials you configured in step 2

**Note:** The setup script will prompt you to configure your n8n admin credentials on first run. These are stored in a centralized `.env` file at the workspace root (created from `.env.example`) and shared across all Health Suite projects.

### Development Commands

**Core Building & Packaging:**
- `npm run build` - Build the node package
- `npm run pack:local` - Build and create package in ../n8n-local-test/
- `npm run dev` - Watch mode for development

**Node Installation & Updates:**
- `npm run install:node` - Install the Semble node in n8n
- `npm run update:node` - Build, package, and install in one command
- `npm run dev:full` - Complete development cycle (build → install → restart)

**Environment Management:**
- `npm run setup:test-env` - Create the complete test environment
- `npm run start:n8n` - Start n8n Docker container
- `npm run stop:n8n` - Stop n8n Docker container  
- `npm run restart:n8n` - Restart n8n Docker container
- `npm run logs:n8n` - View n8n container logs
- `npm run setup:owner` - Set up n8n owner account

**Testing & Quality:**
- `npm run test:env` - Test the complete environment setup
- `npm run format` - Format code with Prettier

### Development Workflow

**Quick Development Cycle:**
1. Make changes to the source code
2. Run `npm run update:node` to build, package, and install
3. Test your changes in n8n at http://localhost:5678
4. Repeat as needed

**Alternative Manual Steps:**
1. Make changes to the source code
2. Run `npm run pack:local` to build and create updated package
3. Run `npm run install:node` to install the updated node
4. Run `npm run restart:n8n` if needed
5. Test your changes in n8n at http://localhost:5678

**Complete Development Reset:**
1. Run `npm run dev:full` - rebuilds, installs, and restarts everything

### Local Testing Environment

This package uses the separate `n8n-local-test` directory (located at `../n8n-local-test/`) for local development and testing. This environment provides:

- Docker-based n8n instance on port 5678
- Automated owner account setup
- Easy node installation and updates
- Persistent data storage for testing
- Complete isolation from production environments

### Architecture & Features

- **GraphQL API Integration**: Uses Semble's GraphQL API with x-token authentication
- **Rate Limiting**: Built-in 120 requests/minute rate limiting with automatic retry logic
- **Full CRUD Operations**: Complete create, read, update, delete support for appointments and patients
- **Polling Triggers**: Automated workflow triggers for new/updated patients, appointments, and products
- **Type Safety**: Built with TypeScript for robust development experience
- **Error Handling**: Comprehensive error handling with descriptive messages
- **Environment Configuration**: Uses centralized `.env` file created from `.env.example` template

### Environment Setup

The project includes a `.env.example` file that serves as a template for environment configuration:

- **Location**: Located in this project directory and version controlled
- **Usage**: Automatically copied to workspace root as `.env` during setup
- **Configuration**: Contains n8n admin credentials and other environment variables
- **Security**: The actual `.env` file is excluded from version control

### Troubleshooting Development Issues

If you encounter issues during development:

1. **Build Issues**: Run `npm run lint` to check for code issues
2. **Container Issues**: Use `docker compose logs -f` in the n8n-local-test directory
3. **Node Not Available**: Ensure the package was built and installed correctly
4. **Authentication Issues**: Test credentials with the regular Semble node first
5. **Rate Limiting**: Check polling intervals aren't too aggressive

For complete testing environment documentation, see `../n8n-local-test/README.md`.

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

### Products
- **Get**: Retrieve a specific product by ID
- **Get Many**: Retrieve multiple products with search/filtering

## Trigger Node

The **Semble Trigger** node provides polling triggers that automatically start workflows when Semble data changes:

### Supported Events
- **New Patient**: Triggers when a new patient is created
- **Updated Patient**: Triggers when a patient record is updated  
- **New Appointment**: Triggers when a new appointment is created
- **Updated Appointment**: Triggers when an appointment is updated
- **New Product**: Triggers when a new product is created
- **Updated Product**: Triggers when a product is updated

⚠️ **Staff Triggers Not Supported**: Staff triggers are not available because the Semble API doesn't provide `createdAt` or `updatedAt` timestamp fields for staff records, making it impossible to detect new or updated staff members reliably.

### Configuration
- **Event Type**: Choose what type of change to monitor
- **Poll Interval**: How often to check for changes (minimum 30 seconds, default 5 minutes)
- **Credentials**: Same Semble API credentials as the regular node

⚠️ **Rate Limiting**: Semble API has a rate limit of 120 requests per minute. The node automatically handles rate limiting, but consider:
- Use longer poll intervals (5+ minutes) for production workflows
- Avoid running multiple polling triggers simultaneously
- Monitor for rate limit errors in workflow execution logs

### How It Works
1. **Initial Setup**: Records the current timestamp when first activated
2. **Regular Polling**: Queries the Semble API at the specified interval
3. **Change Detection**: Compares record timestamps against the last poll time  
4. **Workflow Execution**: Triggers the workflow for each new/changed record

### Example Trigger Configuration
```json
{
  "event": "newProduct",
  "pollInterval": 300
}
```

This will check for new products every 5 minutes and trigger the workflow for each new product found.

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

## Rate Limiting

Semble API has a rate limit of **120 requests per minute**. This node includes built-in rate limiting protection:

### Automatic Rate Limiting Features
- **Request Throttling**: Automatically spaces requests to stay within limits
- **Exponential Backoff**: Retries failed requests with increasing delays
- **Queue Management**: Tracks request timestamps across all node instances
- **Graceful Degradation**: Provides clear error messages when limits are exceeded

### Best Practices
- **Polling Intervals**: Use 5+ minutes for production triggers
- **Batch Operations**: Use "Get Many" operations instead of multiple single requests
- **Monitor Usage**: Watch for rate limit warnings in workflow execution logs
- **Avoid Simultaneous Triggers**: Don't run multiple polling triggers with short intervals

### Rate Limit Configuration
The rate limiting is configured for future-proofing:
```javascript
MAX_REQUESTS_PER_MINUTE: 120  // Conservative limit
MIN_REQUEST_INTERVAL: 500ms   // ~500ms between requests
```

### Error Handling
If rate limits are exceeded:
- Requests are automatically retried with exponential backoff
- Clear error messages indicate rate limiting issues
- Workflows continue after temporary delays
- Persistent rate limit violations throw descriptive errors

### Technical Implementation

The rate limiting system includes:

1. **Global Request Queue**: Tracks all API requests across node instances
2. **Sliding Window**: 60-second time window for rate limit calculations  
3. **Pre-emptive Throttling**: Delays requests before they hit the API
4. **Automatic Retry Logic**: Exponential backoff for rate-limited requests
5. **Error Recovery**: Graceful handling of rate limit violations

This ensures reliable operation even with multiple workflows using Semble nodes simultaneously.

## Rate Limiting & Best Practices

**Semble API Rate Limits**: 120 requests per minute (reduced from 240)

This node includes built-in rate limiting protection:
- **Automatic throttling**: Requests are automatically spaced to stay within limits
- **Retry logic**: Rate-limited requests are retried with exponential backoff  
- **Global coordination**: Multiple nodes share rate limiting state
- **Intelligent spacing**: Minimum 500ms between requests

### Recommended Settings
- **Production triggers**: Use 5+ minute poll intervals
- **Development/testing**: Minimum 30-second intervals
- **Multiple triggers**: Avoid running many triggers simultaneously
- **Bulk operations**: Consider using "Get Many" operations instead of multiple individual requests

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

This node is maintained by **Mike Hatcher** (mike.hatcher@progenious.com, [progenious.com](https://progenious.com)). Issues and feature requests can be submitted via [GitHub Issues](https://github.com/mikehatcher/n8n-nodes-semble/issues).

## Version History

### 1.0.0
- Initial release with GraphQL API support
- Support for Appointments, Patients, Staff, and Products resources
- Full CRUD operations for appointments and patients
- Read operations for staff and products
- Polling triggers for new/updated patients, appointments, and products
- **Built-in rate limiting** (120 requests/minute) with automatic retry logic
- Comprehensive filtering and pagination support
- Uses Semble's GraphQL API for efficient data operations
- Automated development environment with Docker

## Testing and Development

### Automated Test Environment Setup

A complete n8n test environment can be set up automatically:

```bash
# 1. Create the test environment
npm run setup:test-env

# 2. Build and package the node
npm run pack:local

# 3. Start the test environment
cd ../n8n-local-test
docker compose up -d

# 4. Set up the owner account
./setup-owner-account.sh

# 5. Install the Semble node
./install-semble-node.sh

# 6. Test the installation
cd ../n8n-nodes-semble  
npm run test:env
```

The test environment includes:
- **Docker Compose** setup for n8n
- **Automated scripts** for node installation and owner setup
- **Test validation** script to verify everything works
- **Complete documentation** for the development workflow

### Available Scripts

- `npm run setup:test-env` - Create the complete test environment
- `npm run pack:local` - Build and package for local testing
- `npm run test:env` - Validate the test environment is working
- `npm run build` - Build the TypeScript code
- `npm run dev` - Watch mode for development
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🛡️ Safety Guardrails

This node includes multiple layers of protection to prevent accidental data modifications in production:

### Environment-Based Protection
- **Development Mode**: Default setting, enables safety mode by default
- **Staging Mode**: Optional safety mode for pre-production testing
- **Production Mode**: Requires explicit confirmation, all operations allowed

### Safety Mode Features
- **Blocks Destructive Operations**: Prevents create/update/delete operations in non-production environments
- **Environment Validation**: Requires explicit environment selection in credentials
- **Production Confirmation**: Extra confirmation required for production access
- **Operation Detection**: Automatically detects and blocks potentially harmful operations

### Recommended Configuration

**For Local Testing (Default):**
```
Environment: Development
Enable Safety Mode: ✅ (recommended)
Use for: Testing triggers, reading data, workflow development
```

**For Production:**
```
Environment: Production  
Production Confirmation: ✅ (required)
Use for: Live operations only
```

### Blocked Operations in Safety Mode
- All `create*` mutations (createAppointment, createPatient, etc.)
- All `update*` mutations (updateAppointment, updatePatient, etc.)
- All `delete*` mutations  
- Operations containing "create", "update", "delete", or "mutation"

### Allowed Operations in Safety Mode
- All query operations (read-only)
- Polling triggers (monitoring only)
- Schema introspection
- Connection testing
