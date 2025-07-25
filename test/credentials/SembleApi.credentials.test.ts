/**
 * @fileoverview Unit tests for SembleApi credentials
 * @description Tests the Semble API credential configuration
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Credentials
 */

import { SembleApi } from '../../credentials/SembleApi.credentials';

describe('SembleApi Credentials', () => {
  let credentials: SembleApi;

  beforeEach(() => {
    credentials = new SembleApi();
  });

  describe('Basic Configuration', () => {
    test('should have correct credential type name', () => {
      expect(credentials.name).toBe('sembleApi');
    });

    test('should have correct display name', () => {
      expect(credentials.displayName).toBe('Semble API');
    });

    test('should have documentation URL', () => {
      expect(credentials.documentationUrl).toBe('https://docs.semble.io/');
    });
  });

  describe('Properties Configuration', () => {
    test('should define environment property', () => {
      const environmentProp = credentials.properties.find(p => p.name === 'environment');
      
      expect(environmentProp).toBeDefined();
      expect(environmentProp?.type).toBe('options');
      expect(environmentProp?.required).toBe(true);
      expect(environmentProp?.default).toBe('development');
      
      const options = environmentProp?.options as any[];
      expect(options).toHaveLength(3);
      expect(options.map(o => o.value)).toEqual(['production', 'staging', 'development']);
    });

    test('should define API token property', () => {
      const tokenProp = credentials.properties.find(p => p.name === 'apiToken');
      
      expect(tokenProp).toBeDefined();
      expect(tokenProp?.type).toBe('string');
      expect(tokenProp?.required).toBe(true);
      expect(tokenProp?.typeOptions?.password).toBe(true);
      expect(tokenProp?.default).toBe('');
    });

    test('should define GraphQL endpoint property', () => {
      const urlProp = credentials.properties.find(p => p.name === 'baseUrl');
      
      expect(urlProp).toBeDefined();
      expect(urlProp?.type).toBe('string');
      expect(urlProp?.required).toBe(true);
      expect(urlProp?.default).toBe('https://open.semble.io/graphql');
    });

    test('should define safety mode property', () => {
      const safetyProp = credentials.properties.find(p => p.name === 'safetyMode');
      
      expect(safetyProp).toBeDefined();
      expect(safetyProp?.type).toBe('boolean');
      expect(safetyProp?.default).toBe(true);
      
      // Should only show for development/staging
      expect(safetyProp?.displayOptions?.show?.environment).toEqual(['development', 'staging']);
    });

    test('should define production confirmation property', () => {
      const confirmProp = credentials.properties.find(p => p.name === 'productionConfirmed');
      
      expect(confirmProp).toBeDefined();
      expect(confirmProp?.type).toBe('boolean');
      expect(confirmProp?.default).toBe(false);
      expect(confirmProp?.required).toBe(true);
      
      // Should only show for production
      expect(confirmProp?.displayOptions?.show?.environment).toEqual(['production']);
    });
  });

  describe('Authentication Configuration', () => {
    test('should use generic authentication', () => {
      expect(credentials.authenticate.type).toBe('generic');
    });

    test('should set correct headers', () => {
      const headers = credentials.authenticate.properties.headers;
      
      expect(headers).toBeDefined();
      expect(headers!['x-token']).toBe('={{$credentials.apiToken}}');
      expect(headers!['Content-Type']).toBe('application/json');
    });
  });

  describe('Connection Test Configuration', () => {
    test('should have correct test request configuration', () => {
      expect(credentials.test.request.baseURL).toBe('={{$credentials.baseUrl}}');
      expect(credentials.test.request.url).toBe('');
      expect(credentials.test.request.method).toBe('POST');
    });

    test('should use GraphQL introspection query for testing', () => {
      const body = credentials.test.request.body as any;
      
      expect(body).toBeDefined();
      expect(body.query).toBe('query { __schema { types { name } } }');
    });
  });

  describe('Environment-Specific Behavior', () => {
    test('should have appropriate environment options', () => {
      const environmentProp = credentials.properties.find(p => p.name === 'environment');
      const options = environmentProp?.options as any[];
      
      const prodOption = options.find(o => o.value === 'production');
      const stagingOption = options.find(o => o.value === 'staging');
      const devOption = options.find(o => o.value === 'development');
      
      expect(prodOption.description).toContain('EXTREME CAUTION');
      expect(stagingOption.description).toContain('testing');
      expect(devOption.description).toContain('recommended for testing');
    });

    test('should have conditional property display logic', () => {
      const safetyProp = credentials.properties.find(p => p.name === 'safetyMode');
      const confirmProp = credentials.properties.find(p => p.name === 'productionConfirmed');
      
      // Safety mode should only show for non-production
      expect(safetyProp?.displayOptions?.show?.environment).not.toContain('production');
      
      // Production confirmation should only show for production
      expect(confirmProp?.displayOptions?.show?.environment).toContain('production');
    });
  });

  describe('Security Considerations', () => {
    test('should mark API token as password field', () => {
      const tokenProp = credentials.properties.find(p => p.name === 'apiToken');
      
      expect(tokenProp?.typeOptions?.password).toBe(true);
    });

    test('should require production confirmation for production environment', () => {
      const confirmProp = credentials.properties.find(p => p.name === 'productionConfirmed');
      
      expect(confirmProp?.required).toBe(true);
      expect(confirmProp?.description).toContain('⚠️');
      expect(confirmProp?.description).toContain('PRODUCTION');
    });

    test('should have safety mode enabled by default', () => {
      const safetyProp = credentials.properties.find(p => p.name === 'safetyMode');
      
      expect(safetyProp?.default).toBe(true);
    });
  });

  describe('Integration Validation', () => {
    test('should have all required properties for n8n integration', () => {
      const requiredProperties = ['environment', 'apiToken', 'baseUrl'];
      
      requiredProperties.forEach(propName => {
        const prop = credentials.properties.find(p => p.name === propName);
        expect(prop).toBeDefined();
        expect(prop?.required).toBe(true);
      });
    });

    test('should have valid default GraphQL endpoint', () => {
      const urlProp = credentials.properties.find(p => p.name === 'baseUrl');
      const defaultUrl = urlProp?.default as string;
      
      expect(defaultUrl).toMatch(/^https:\/\/.+\/graphql$/);
      expect(defaultUrl).toBe('https://open.semble.io/graphql');
    });

    test('should use correct header name for token authentication', () => {
      const headers = credentials.authenticate.properties.headers;
      
      // Should use x-token header (Semble's convention)
      expect(headers).toBeDefined();
      expect(headers!['x-token']).toBeDefined();
      expect(headers!['x-token']).toBe('={{$credentials.apiToken}}');
    });
  });
});
