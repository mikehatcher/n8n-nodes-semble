/**
 * @fileoverview Unit tests for SembleApi credentials configuration
 * @description Tests credential field structure, validation rules, and UI property definitions
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Tests.Credentials
 */

import { SembleApi } from '../../credentials/SembleApi.credentials';
import { ICredentialType, INodeProperties } from 'n8n-workflow';

describe('SembleApi Credentials', () => {
  let credentials: SembleApi;

  beforeEach(() => {
    credentials = new SembleApi();
  });

  describe('Basic Configuration', () => {
    test('should have correct name and display name', () => {
      expect(credentials.name).toBe('sembleApi');
      expect(credentials.displayName).toBe('Semble API');
    });

    test('should have documentation URL', () => {
      expect(credentials.documentationUrl).toBe('https://docs.semble.io/');
    });

    test('should have properties defined', () => {
      expect(credentials.properties).toBeDefined();
      expect(Array.isArray(credentials.properties)).toBe(true);
      expect(credentials.properties.length).toBeGreaterThan(0);
    });
  });

  describe('Properties Configuration', () => {
    test('should define API token property', () => {
      const tokenProp = credentials.properties.find(p => p.name === 'apiToken');
      
      expect(tokenProp).toBeDefined();
      expect(tokenProp?.type).toBe('string');
      expect(tokenProp?.required).toBe(true);
      expect(tokenProp?.typeOptions?.password).toBe(true);
    });

    test('should define base URL property', () => {
      const urlProp = credentials.properties.find(p => p.name === 'baseUrl');
      
      expect(urlProp).toBeDefined();
      expect(urlProp?.type).toBe('string');
      expect(urlProp?.required).toBe(true);
      expect(urlProp?.default).toBe('https://open.semble.io/graphql');
    });
  });

  describe('Property Validation', () => {
    test('should have required properties marked correctly', () => {
      const requiredProps = credentials.properties.filter(p => p.required === true);
      
      expect(requiredProps).toHaveLength(2);
      expect(requiredProps.map(p => p.name)).toEqual(['apiToken', 'baseUrl']);
    });

    test('should have password field secured', () => {
      const passwordProps = credentials.properties.filter(p => p.typeOptions?.password === true);
      
      expect(passwordProps).toHaveLength(1);
      expect(passwordProps[0].name).toBe('apiToken');
    });
  });

  describe('Authentication Configuration', () => {
    test('should implement ICredentialType interface', () => {
      expect(credentials).toBeInstanceOf(SembleApi);
      expect(typeof credentials.name).toBe('string');
      expect(typeof credentials.displayName).toBe('string');
      expect(Array.isArray(credentials.properties)).toBe(true);
    });
  });

  describe('Default Values', () => {
    test('should have appropriate default values', () => {
      const urlProp = credentials.properties.find(p => p.name === 'baseUrl');
      
      expect(urlProp?.default).toBe('https://open.semble.io/graphql');
    });

    test('should not have defaults for sensitive fields', () => {
      const tokenProp = credentials.properties.find(p => p.name === 'apiToken');
      
      expect(tokenProp?.default).toBeFalsy();
    });
  });

  describe('Field Descriptions', () => {
    test('should have meaningful descriptions for all fields', () => {
      credentials.properties.forEach(prop => {
        expect(prop.description).toBeDefined();
        expect(typeof prop.description).toBe('string');
        if (prop.description) {
          expect(prop.description.length).toBeGreaterThan(10);
        }
      });
    });
  });
});
