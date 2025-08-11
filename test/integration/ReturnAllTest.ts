/**
 * @fileoverview Integration test for returnAll functionality
 * @description Tests the returnAll UI field and pagination behavior
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Integration
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from parent directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { SemblePagination, buildPaginationConfig } from '../../nodes/Semble/shared/PaginationHelpers';

describe('Return All Functionality', () => {
  if (!process.env.SEMBLE_TOKEN || !process.env.SEMBLE_API_URL) {
    console.log('⚠️ Skipping returnAll tests - API credentials not found');
    test.skip('Integration tests require API credentials', () => {});
    return;
  }

  test('buildPaginationConfig should handle returnAll parameter', () => {
    // Test with returnAll = true
    const optionsWithReturnAll = { returnAll: true, pageSize: 25 };
    const configTrue = buildPaginationConfig(optionsWithReturnAll);
    
    expect(configTrue.returnAll).toBe(true);
    expect(configTrue.pageSize).toBe(25);
    
    // Test with returnAll = false
    const optionsWithoutReturnAll = { returnAll: false, pageSize: 50 };
    const configFalse = buildPaginationConfig(optionsWithoutReturnAll);
    
    expect(configFalse.returnAll).toBe(false);
    expect(configFalse.pageSize).toBe(50);
  });

  test('buildPaginationConfig should default returnAll to false', () => {
    const optionsDefault = { pageSize: 30 };
    const config = buildPaginationConfig(optionsDefault);
    
    expect(config.returnAll).toBe(false);
    expect(config.pageSize).toBe(30);
  });

  test('buildPaginationConfig should handle all parameters', () => {
    const fullOptions = {
      returnAll: true,
      pageSize: 100,
      search: 'test search'
    };
    
    const config = buildPaginationConfig(fullOptions);
    
    expect(config.returnAll).toBe(true);
    expect(config.pageSize).toBe(100);
    expect(config.search).toBe('test search');
  });

  console.log('✅ ReturnAll functionality tests completed');
});
