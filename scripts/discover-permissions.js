#!/usr/bin/env node

/**
 * Semble API Permission Discovery Script
 * 
 * This script queries the Semble GraphQL API to discover all available permissions
 * and generates comprehensive documentation about what each permission controls.
 */

const https = require('https');

// API Configuration from wp-config.php
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOm51bGwsInByYWN0aWNlIjoiNjJlMmI3Y2YyOGVjNGIwMDEzMTc5ZDQ3IiwiY3JlZGVudGlhbCI6IjY4NTk1NTBhMDljNDdmOGJjNGFlMzE5ZiIsImlhdCI6MTc1MDY4NDkzOCwiYXVkIjoicHVibGljLWFwaSJ9.WsYClq4_5-rFnJksArhuWd4QzF6JgMjB7eG7v-te5tY';
const API_ENDPOINT = 'https://open.semble.io/graphql';

/**
 * Makes a GraphQL request to the Semble API using native Node.js https
 */
async function makeGraphQLRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    
    const options = {
      hostname: 'open.semble.io',
      port: 443,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-token': API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Discovers permissions by testing various API endpoints and analyzing error messages
 */
async function discoverPermissions() {
  console.log('🔍 Discovering Semble API Permissions');
  console.log('====================================\n');

  const permissions = new Map();

  // Test queries for different resources to discover permission requirements
  const testQueries = [
    {
      name: 'Patients',
      query: `query { 
        patients { 
          data { 
            id firstName lastName email phoneNumber dateOfBirth 
            customAttributes { id title text response }
            relationships { relationshipId relationshipType }
          } 
        } 
      }`,
      description: 'Patient data access and management'
    },
    {
      name: 'Bookings',
      query: `query { 
        bookings { 
          data { 
            id patient { id firstName } 
            doctor { id firstName lastName email }
            location { id name }
            patientMessagesSent { confirmation reminder }
          } 
        } 
      }`,
      description: 'Booking data access and management'
    },
    {
      name: 'Doctors/Users',
      query: `query { 
        users { 
          data { 
            id firstName lastName email phoneNumber 
            role permissions 
          } 
        } 
      }`,
      description: 'User/doctor data access and management'
    },
    {
      name: 'Locations',
      query: `query { 
        locations { 
          data { 
            id name address { address city postcode }
            settings { allowOnlineBooking }
          } 
        } 
      }`,
      description: 'Location data access and management'
    },
    {
      name: 'Treatments',
      query: `query { 
        treatments { 
          data { 
            id title description price duration
            categories { id name }
          } 
        } 
      }`,
      description: 'Treatment/service data access'
    },
    {
      name: 'Settings',
      query: `query { 
        settings { 
          practice { name address phone email }
          integrations { sms email calendar }
          billing { currency taxRate }
        } 
      }`,
      description: 'Practice settings and configuration'
    },
    {
      name: 'Invoices',
      query: `query { 
        invoices { 
          data { 
            id number amount status
            patient { id firstName lastName }
            items { description amount }
          } 
        } 
      }`,
      description: 'Invoice and billing data access'
    },
    {
      name: 'Reports',
      query: `query { 
        reports { 
          bookingStats { total completed cancelled }
          revenueStats { total thisMonth lastMonth }
        } 
      }`,
      description: 'Analytics and reporting data'
    }
  ];

  // Test each query to discover permission requirements
  for (const test of testQueries) {
    console.log(`📋 Testing ${test.name}...`);
    
    const result = await makeGraphQLRequest(test.query);
    
    if (result && result.errors) {
      // Extract permission errors
      result.errors.forEach(error => {
        if (error.message && error.message.includes('permission')) {
          const permissionMatch = error.message.match(/Missing permission (\w+)/i);
          if (permissionMatch) {
            const permission = permissionMatch[1];
            
            if (!permissions.has(permission)) {
              permissions.set(permission, {
                name: permission,
                description: `Required for ${test.description}`,
                resources: [test.name],
                fields: [],
                errorMessages: [error.message]
              });
            } else {
              const existing = permissions.get(permission);
              if (!existing.resources.includes(test.name)) {
                existing.resources.push(test.name);
              }
              if (!existing.errorMessages.includes(error.message)) {
                existing.errorMessages.push(error.message);
              }
            }
          }
        }
      });
    }
    
    if (result && result.data) {
      console.log(`  ✅ ${test.name} - Accessible`);
    } else if (result && result.errors) {
      console.log(`  ⚠️  ${test.name} - Permission restrictions found`);
    } else {
      console.log(`  ❌ ${test.name} - Query failed`);
    }
  }

  return permissions;
}

/**
 * Tests specific field-level permissions by querying individual fields
 */
async function discoverFieldPermissions() {
  console.log('\n🔬 Discovering Field-Level Permissions');
  console.log('=====================================\n');

  const fieldPermissions = new Map();

  // Test specific field combinations that commonly have permission restrictions
  const fieldTests = [
    {
      resource: 'Patient',
      query: `query { patients(pagination: {page: 1, pageSize: 1}) { data { id firstName lastName email phoneNumber dateOfBirth } } }`,
      fields: ['firstName', 'lastName', 'email', 'phoneNumber', 'dateOfBirth']
    },
    {
      resource: 'Booking',
      query: `query { bookings(pagination: {page: 1, pageSize: 1}) { data { id doctor { id firstName lastName email } patient { id firstName } } } }`,
      fields: ['doctor.id', 'doctor.firstName', 'doctor.lastName', 'doctor.email', 'patient.id', 'patient.firstName']
    },
    {
      resource: 'User',
      query: `query { users(pagination: {page: 1, pageSize: 1}) { data { id firstName lastName email role permissions } } }`,
      fields: ['firstName', 'lastName', 'email', 'role', 'permissions']
    }
  ];

  for (const test of fieldTests) {
    console.log(`📊 Testing ${test.resource} fields...`);
    
    const result = await makeGraphQLRequest(test.query);
    
    if (result && result.errors) {
      result.errors.forEach(error => {
        if (error.path && error.message && error.message.includes('permission')) {
          const fieldPath = error.path.join('.');
          const permissionMatch = error.message.match(/Missing permission (\w+)/i);
          
          if (permissionMatch) {
            const permission = permissionMatch[1];
            const key = `${permission}:${fieldPath}`;
            
            fieldPermissions.set(key, {
              permission,
              resource: test.resource,
              fieldPath,
              errorMessage: error.message,
              description: `Controls access to ${fieldPath} in ${test.resource}`
            });
          }
        }
      });
    }
  }

  return fieldPermissions;
}

/**
 * Attempts to discover available permissions through introspection
 */
async function discoverThroughIntrospection() {
  console.log('\n🔍 Attempting Schema Introspection');
  console.log('=================================\n');

  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        types {
          name
          description
          fields {
            name
            description
            type {
              name
              description
            }
          }
        }
      }
    }
  `;

  const result = await makeGraphQLRequest(introspectionQuery);
  
  if (result && result.data) {
    console.log('✅ Schema introspection successful');
    
    // Look for permission-related types
    const permissionTypes = result.data.__schema.types.filter(type => 
      type.name && (
        type.name.toLowerCase().includes('permission') ||
        type.name.toLowerCase().includes('auth') ||
        type.name.toLowerCase().includes('access')
      )
    );

    return permissionTypes;
  } else {
    console.log('❌ Schema introspection not available');
    return [];
  }
}

/**
 * Generates a brief permission documentation with tree structure
 */
function generatePermissionDocs(permissions, fieldPermissions, schemaTypes) {
  console.log('\n📚 Generated Permission Documentation');
  console.log('===================================\n');

  // Group permissions by category
  const categories = {
    'User Management': [],
    'Patient Management': [],
    'Booking Management': [],
    'Practice Settings': [],
    'Financial': [],
    'Reports': [],
    'System': []
  };

  // Categorize permissions
  permissions.forEach((permission, key) => {
    const name = permission.name.toLowerCase();
    
    if (name.includes('user') || name.includes('doctor') || name.includes('staff') || name.includes('seeusers')) {
      categories['User Management'].push(permission);
    } else if (name.includes('patient')) {
      categories['Patient Management'].push(permission);
    } else if (name.includes('booking') || name.includes('appointment')) {
      categories['Booking Management'].push(permission);
    } else if (name.includes('setting') || name.includes('practice')) {
      categories['Practice Settings'].push(permission);
    } else if (name.includes('invoice') || name.includes('payment') || name.includes('billing')) {
      categories['Financial'].push(permission);
    } else if (name.includes('report') || name.includes('analytics')) {
      categories['Reports'].push(permission);
    } else {
      categories['System'].push(permission);
    }
  });

  // Generate brief documentation with tree structure
  let documentation = `# Semble API Permissions\n\n`;
  documentation += `Generated: ${new Date().toLocaleDateString()}\n\n`;
  
  documentation += `## Permission Tree\n\n`;
  documentation += `\`\`\`\n`;
  documentation += `Semble API Permissions\n`;
  
  // Build actual tree based on discovered permissions
  Object.entries(categories).forEach(([category, perms], categoryIndex, categories) => {
    const isLast = categoryIndex === categories.length - 1;
    const prefix = isLast ? '└──' : '├──';
    documentation += `${prefix} ${category}\n`;
    
    if (perms.length > 0) {
      perms.forEach((permission, permIndex) => {
        const isLastPerm = permIndex === perms.length - 1;
        const childPrefix = isLast ? '    ' : '│   ';
        const permPrefix = isLastPerm ? '└──' : '├──';
        documentation += `${childPrefix}${permPrefix} ${permission.name} - ${permission.description}\n`;
      });
    } else {
      // Show example permissions for empty categories
      const childPrefix = isLast ? '    ' : '│   ';
      if (category === 'User Management') {
        documentation += `${childPrefix}└── (settingsSeeUsers - Access user/doctor information)\n`;
      } else if (category === 'Patient Management') {
        documentation += `${childPrefix}└── (patientsRead - View patient data)\n`;
      } else if (category === 'Booking Management') {
        documentation += `${childPrefix}└── (bookingsRead - View booking data)\n`;
      } else {
        documentation += `${childPrefix}└── (permissions not discovered)\n`;
      }
    }
  });
  
  documentation += `\`\`\`\n\n`;

  // Add discovered permissions summary
  if (permissions.size > 0) {
    documentation += `## Discovered Permissions\n\n`;
    
    Object.entries(categories).forEach(([category, perms]) => {
      if (perms.length > 0) {
        documentation += `### ${category}\n\n`;
        
        perms.forEach(permission => {
          documentation += `- **${permission.name}**\n`;
          documentation += `  - ${permission.description}\n`;
          documentation += `  - Resources: ${permission.resources.join(', ')}\n\n`;
        });
      }
    });
  }

  // Add field-level permissions if any
  if (fieldPermissions.size > 0) {
    documentation += `## Field-Level Restrictions\n\n`;
    
    const fieldPermissionsByResource = new Map();
    fieldPermissions.forEach((fieldPerm, key) => {
      if (!fieldPermissionsByResource.has(fieldPerm.resource)) {
        fieldPermissionsByResource.set(fieldPerm.resource, []);
      }
      fieldPermissionsByResource.get(fieldPerm.resource).push(fieldPerm);
    });

    fieldPermissionsByResource.forEach((fields, resource) => {
      documentation += `### ${resource}\n\n`;
      fields.forEach(field => {
        documentation += `- \`${field.fieldPath}\` → requires \`${field.permission}\`\n`;
      });
      documentation += `\n`;
    });
  }

  return documentation;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Semble API Permission Discovery Tool');
  console.log('=======================================\n');

  try {
    // Discover permissions through different methods
    const permissions = await discoverPermissions();
    const fieldPermissions = await discoverFieldPermissions();
    const schemaTypes = await discoverThroughIntrospection();

    // Generate documentation
    const documentation = generatePermissionDocs(permissions, fieldPermissions, schemaTypes);

    // Create docs directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const docsDir = path.join(__dirname, '..', 'docs');
    
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Save documentation to docs folder
    const filename = path.join(docsDir, 'semble-api-permissions.md');
    fs.writeFileSync(filename, documentation);

    console.log(`\n✅ Permission documentation generated successfully!`);
    console.log(`📄 Documentation saved to: ${filename}`);
    console.log(`\n📊 Summary:`);
    console.log(`- Permissions discovered: ${permissions.size}`);
    console.log(`- Field-level permissions: ${fieldPermissions.size}`);
    console.log(`- Schema types found: ${schemaTypes.length}`);

    // Display quick overview
    if (permissions.size > 0) {
      console.log(`\n🔑 Discovered Permissions:`);
      permissions.forEach((permission, key) => {
        console.log(`- ${permission.name}: ${permission.description}`);
      });
    }

  } catch (error) {
    console.error('❌ Error during permission discovery:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  discoverPermissions,
  discoverFieldPermissions,
  discoverThroughIntrospection,
  generatePermissionDocs
};
