/**
 * @fileoverview Integration test demonstrating the pagination limit fix
 * @description Verifies that the booking getMany operation respects the limit field
 * @author Mike Hatcher
 * @website https://progenious.com
 * @namespace N8nNodesSemble.Test.Integration
 */

import { buildPaginationConfig } from '../../nodes/Semble/shared/PaginationHelpers';

describe('Booking Pagination Fix', () => {
  it('should respect limit field from booking UI', () => {
    // Simulate what the BookingDescription UI sends
    const bookingUIOptions = {
      limit: 100,        // Default from BookingDescription UI
      returnAll: false,  // Default from BookingDescription UI
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    };

    const paginationConfig = buildPaginationConfig(bookingUIOptions);

    // Before fix: would have been pageSize: 50 (default)
    // After fix: should be pageSize: 100 (from limit field)
    expect(paginationConfig.pageSize).toBe(100);
    expect(paginationConfig.returnAll).toBe(false);
  });

  it('should handle returnAll: true correctly', () => {
    // Simulate user setting returnAll to true
    const returnAllOptions = {
      limit: 75,         // Should be ignored when returnAll is true
      returnAll: true,   // User wants all results
      search: 'test'
    };

    const paginationConfig = buildPaginationConfig(returnAllOptions);

    // When returnAll is true, the system should still get the pageSize
    // but will auto-paginate through all results
    expect(paginationConfig.pageSize).toBe(75);  // Uses limit field
    expect(paginationConfig.returnAll).toBe(true);
    expect(paginationConfig.search).toBe('test');
  });

  it('should demonstrate the fix for the 50-result issue', () => {
    // This is what was happening before the fix
    const problematicOptions = {
      limit: 100,        // UI field that was being ignored
      returnAll: false,  // User wants limited results
      // No pageSize field from UI
    };

    const config = buildPaginationConfig(problematicOptions);

    // Before fix: pageSize would be 50 (default), causing exactly 50 results
    // After fix: pageSize is 100 (from limit), allowing up to 100 results
    expect(config.pageSize).toBe(100);
    expect(config.returnAll).toBe(false);
    
    console.log('✅ Fix verified: limit field now properly maps to pageSize');
    console.log(`   - User sets limit: ${problematicOptions.limit}`);
    console.log(`   - System uses pageSize: ${config.pageSize}`);
    console.log(`   - Will return up to ${config.pageSize} results instead of 50`);
  });
});
