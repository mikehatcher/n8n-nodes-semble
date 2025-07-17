# n8n-nodes-semble Refactoring Plan

## Project Overview
Complete refactoring of n8n-nodes-semble from resource-based to action/trigger-based architecture with comprehensive testing, modular design, and extensible field management.

**Version**: 2.0.0  
**Branch**: v2.0.0-refactor  
**Architecture**: Class-based, Service-oriented, TypeScript  
**Testing**: Jest with comprehensive unit and integration tests  

---

## PHASE 1: FOUNDATION LAYER ⚡
**Priority: Critical - Everything depends on this**

### 1.1 TypeScript Type Definitions
- [ ] Create `types/SembleTypes.ts` - All Semble API object interfaces
  - Patient, Booking, Doctor, Location, BookingType interfaces
  - GraphQL response types
  - API error types
- [ ] Create `types/NodeTypes.ts` - n8n-specific type definitions  
  - Extended IExecuteFunctions interfaces
  - Custom property types
  - Component configuration types
- [ ] Create `types/ConfigTypes.ts` - Configuration and options interfaces
  - Cache configuration
  - Service configuration
  - Field registry types
- [ ] **Test**: Type validation tests

**Files to create:**
- `types/SembleTypes.ts`
- `types/NodeTypes.ts` 
- `types/ConfigTypes.ts`
- `test/types/TypeDefinitions.test.ts`

---

### 1.2 Base Configuration
- [ ] Create `core/BaseConfig.ts` - Extensible for future API config management
  - Default values and constants
  - Environment-based configuration
  - Extensible config structure
- [ ] Create `core/Constants.ts` - All static values (endpoints, defaults, etc.)
  - API endpoints
  - Default polling intervals
  - Field types and validation rules
- [ ] **Test**: Configuration loading and validation

**Files to create:**
- `core/BaseConfig.ts`
- `core/Constants.ts`
- `test/core/BaseConfig.test.ts`

---

### 1.3 Error Management System
- [ ] Create `core/ErrorMapper.ts` - Semble API → user-friendly error translation
  - GraphQL error parsing
  - Permission error mapping
  - User-friendly message generation
- [ ] Create `core/SembleError.ts` - Custom error classes
  - SembleApiError, PermissionError, ValidationError
  - Error context and debugging info
- [ ] Implement field-level permission error display strategy
  - Replace field values with permission messages
  - Maintain schema structure
- [ ] **Test**: Error mapping and display scenarios

**Files to create:**
- `core/ErrorMapper.ts`
- `core/SembleError.ts`
- `test/core/ErrorManagement.test.ts`

---

## PHASE 2: CORE SERVICES LAYER 🔧
**Priority: High - Required for all operations**

### 2.1 Credentials & Authentication
- [ ] Create `services/CredentialService.ts` - Credential validation and management
  - Credential format validation
  - Environment safety checks
  - Token validation
- [ ] Create API connection testing functionality
  - Basic connectivity test
  - Permission level detection
  - Error handling for connection issues
- [ ] **Test**: Credential validation (both format and API connectivity)

**Files to create:**
- `services/CredentialService.ts`
- `test/services/CredentialService.test.ts`

---

### 2.2 Cache Management System  
- [ ] Create `services/CacheService.ts` - Schema and permission caching
  - In-memory cache with TTL
  - Cache key generation strategies
  - Thread-safe cache operations
- [ ] Implement daily auto-refresh mechanism
  - Scheduled cache refresh
  - Background refresh without blocking
- [ ] Add manual refresh capability option
  - Force refresh API
  - Cache invalidation
- [ ] **Test**: Cache operations, expiry, and refresh logic

**Files to create:**
- `services/CacheService.ts`
- `test/services/CacheService.test.ts`

---

### 2.3 Semble API Integration
- [ ] Create `services/SembleQueryService.ts` - GraphQL query execution
  - Query building and execution
  - Response parsing and validation
  - Rate limiting and retry logic
- [ ] Create `services/FieldDiscoveryService.ts` - Dynamic field schema lookup
  - GraphQL introspection queries
  - Field type detection
  - Schema caching integration
- [ ] Create `services/PermissionCheckService.ts` - Field-level permission validation
  - Permission testing queries
  - Field-level permission mapping
  - Permission cache management
- [ ] **Test**: API integration, field discovery, permission checking

**Files to create:**
- `services/SembleQueryService.ts`
- `services/FieldDiscoveryService.ts`
- `services/PermissionCheckService.ts`
- `test/services/SembleApiIntegration.test.ts`

---

### 2.4 Field Validation System
- [ ] Create `services/ValidationService.ts` - Input validation before API calls
  - Field type validation
  - Required field checks
  - Custom validation rules
- [ ] Integrate with Semble field types and constraints
  - Date/time validation
  - ID format validation
  - Enum value validation
- [ ] **Test**: Field validation scenarios (valid/invalid inputs)

**Files to create:**
- `services/ValidationService.ts`
- `test/services/ValidationService.test.ts`

---

## PHASE 3: UI COMPONENT LAYER 🎨
**Priority: Medium - User interface building blocks**

### 3.1 Field Component Classes
- [ ] Create `components/ResourceSelector.ts` - Resource dropdown (replicating old UI)
  - Dynamic resource loading
  - Conditional field display
  - Resource-specific field filtering
- [ ] Create `components/EventTriggerSelector.ts` - "New"/"New and Updated" options
  - Static option definition
  - Conditional field display based on selection
- [ ] Create `components/EventActionSelector.ts` - CRUD operation selector
  - Create, Get, Get Many, Update, Delete options
  - Operation-specific field loading
- [ ] Create `components/PollTimeSelector.ts` - Polling interval configuration
  - Predefined interval options
  - Custom interval input
  - Validation for reasonable intervals
- [ ] **Test**: Each component's UI field generation and options

**Files to create:**
- `components/ResourceSelector.ts`
- `components/EventTriggerSelector.ts`
- `components/EventActionSelector.ts`
- `components/PollTimeSelector.ts`
- `test/components/UIComponents.test.ts`

---

### 3.2 Additional Fields System
- [ ] Create `components/AdditionalFieldsRegistry.ts` - Central field definitions
  - Field registration system
  - Field type definitions
  - Dynamic field loading
- [ ] Create `components/RecordLimitField.ts` - Integer field with -1 = all logic
  - Number input with validation
  - Special handling for -1 value
  - User-friendly display
- [ ] Design extensible field addition mechanism
  - Plugin-style field registration
  - Type-safe field definitions
  - Automatic UI generation
- [ ] **Test**: Field registration, dynamic loading, record limit logic

**Files to create:**
- `components/AdditionalFieldsRegistry.ts`
- `components/RecordLimitField.ts`
- `test/components/AdditionalFields.test.ts`

---

## PHASE 4: INTEGRATION LAYER 🔗
**Priority: Medium - Brings components together**

### 4.1 Dependency Injection & Architecture
- [ ] Create `core/ServiceContainer.ts` - Dependency injection for clean architecture
  - Service registration and resolution
  - Singleton and factory patterns
  - Type-safe service injection
- [ ] Create `core/EventSystem.ts` - Decoupled component communication
  - Event emitter/listener pattern
  - Type-safe event definitions
  - Async event handling
- [ ] Create `core/SchemaRegistry.ts` - Central field definition storage
  - Schema registration and lookup
  - Version management
  - Schema validation
- [ ] **Test**: Service resolution, event communication, schema management

**Files to create:**
- `core/ServiceContainer.ts`
- `core/EventSystem.ts`
- `core/SchemaRegistry.ts`
- `test/core/Integration.test.ts`

---

### 4.2 Request/Response Pipeline
- [ ] Create `core/MiddlewarePipeline.ts` - Request/response processing chain
  - Middleware registration and execution
  - Request/response transformation
  - Error handling pipeline
- [ ] Integrate validation, permission checking, error mapping
  - Pre-request validation middleware
  - Post-response permission checking
  - Error transformation middleware
- [ ] **Test**: Pipeline execution, middleware ordering

**Files to create:**
- `core/MiddlewarePipeline.ts`
- `test/core/MiddlewarePipeline.test.ts`

---

## PHASE 5: NODE IMPLEMENTATION 🚀
**Priority: Critical - The actual n8n nodes**

### 5.1 Trigger Node Architecture
- [ ] Create `nodes/SembleTrigger.node.ts` - Main trigger node
  - Node type definition
  - Property configuration
  - Poll method implementation
- [ ] Integrate: Credentials + Resource + Event Trigger + Additional Fields
  - Service injection setup
  - Component integration
  - Dynamic field loading
- [ ] Implement polling mechanism with configurable intervals
  - Efficient polling logic
  - State management between polls
  - Error handling and retry
- [ ] **Test**: Complete trigger workflow, polling behavior

**Files to create:**
- `nodes/SembleTrigger.node.ts`
- `test/nodes/SembleTrigger.test.ts`

---

### 5.2 Action Node Architecture  
- [ ] Update `nodes/Semble/Semble.node.ts` - Main action node
  - Convert to new architecture
  - Service integration
  - Dynamic property loading
- [ ] Integrate: Credentials + Resource + Event Action + Additional Fields
  - Component composition
  - Field dependency management
  - Validation integration
- [ ] Implement all CRUD operations (Create, Get, Get Many, Update, Delete)
  - Operation-specific logic
  - Field mapping and validation
  - Response processing
- [ ] **Test**: Complete action workflow, all operations

**Files to update:**
- `nodes/Semble/Semble.node.ts`
- `test/nodes/SembleAction.test.ts`

---

## PHASE 6: TESTING & VALIDATION ✅
**Priority: High - Ensure reliability**

### 6.1 Unit Test Suite
- [ ] Individual component tests (already planned above)
- [ ] Service integration tests
- [ ] Error handling and edge case tests

### 6.2 Integration Test Suite (Jest)
- [ ] End-to-end workflow tests
  - Complete trigger workflows
  - Complete action workflows
  - Multi-step operations
- [ ] Multi-component interaction tests  
  - Service composition tests
  - Event system tests
  - Cache integration tests
- [ ] Permission and caching integration tests
  - Permission check workflows
  - Cache refresh scenarios
  - Error handling integration
- [ ] **Structure code for future performance testing**

**Files to create:**
- `test/integration/TriggerWorkflow.test.ts`
- `test/integration/ActionWorkflow.test.ts`
- `test/integration/ServiceIntegration.test.ts`

---

### 6.3 Error Scenario Testing
- [ ] API unavailability handling
  - Network timeout simulation
  - Service unavailable responses
  - Graceful degradation
- [ ] Network timeout scenarios
  - Connection timeout handling
  - Request timeout handling
  - Retry logic validation
- [ ] Invalid credential scenarios
  - Malformed credentials
  - Expired tokens
  - Insufficient permissions
- [ ] Permission denied scenarios
  - Field-level permission errors
  - Operation permission errors
  - Graceful error display

**Files to create:**
- `test/scenarios/ErrorHandling.test.ts`
- `test/scenarios/NetworkFailure.test.ts`
- `test/scenarios/PermissionErrors.test.ts`

---

## IMPLEMENTATION NOTES

### n8n Best Practices Followed:
- Class-based architecture with clear separation of concerns
- Proper TypeScript typing throughout
- n8n error handling patterns
- Reusable UI component pattern
- Service-oriented architecture

### Extensibility Points:
- Additional field registry for easy new field types
- Middleware pipeline for new processing steps
- Configuration system ready for advanced API management
- Service container for easy dependency changes

### Dependencies & Order:
1. **Phase 1 & 2 first** - Everything depends on foundation and core services
2. **Phase 3 & 4 parallel** - UI components and integration can be developed simultaneously  
3. **Phase 5** - Node implementation brings everything together
4. **Phase 6** - Comprehensive testing throughout and final validation

### Future Enhancements (Structure Ready):
- Performance testing integration
- Advanced configuration management
- Additional API integrations
- Extended field types

---

## PROGRESS TRACKING

### Phase 1: Foundation Layer
- [ ] 1.1 TypeScript Type Definitions
- [ ] 1.2 Base Configuration  
- [ ] 1.3 Error Management System

### Phase 2: Core Services Layer
- [ ] 2.1 Credentials & Authentication
- [ ] 2.2 Cache Management System
- [ ] 2.3 Semble API Integration
- [ ] 2.4 Field Validation System

### Phase 3: UI Component Layer
- [ ] 3.1 Field Component Classes
- [ ] 3.2 Additional Fields System

### Phase 4: Integration Layer
- [ ] 4.1 Dependency Injection & Architecture
- [ ] 4.2 Request/Response Pipeline

### Phase 5: Node Implementation
- [ ] 5.1 Trigger Node Architecture
- [ ] 5.2 Action Node Architecture

### Phase 6: Testing & Validation
- [ ] 6.1 Unit Test Suite
- [ ] 6.2 Integration Test Suite
- [ ] 6.3 Error Scenario Testing

---

**Status**: Ready for implementation  
**Next Step**: Begin Phase 1.1 - TypeScript Type Definitions  
**Last Updated**: 2025-07-17
