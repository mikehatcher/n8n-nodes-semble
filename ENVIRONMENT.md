# Semble API Environment Configuration
# This file helps distinguish between different Semble environments

# ENVIRONMENT DETECTION
# ===================
# development - Local testing environment (default)
# staging     - Staging/pre-production environment  
# production  - Live production environment

# SAFETY GUARDRAILS
# =================
# 1. Environment Selection: Credentials require explicit environment selection
# 2. Safety Mode: Blocks data modifications in non-production environments by default
# 3. Production Confirmation: Requires explicit confirmation for production access
# 4. Operation Validation: Validates operations against environment policies

# RECOMMENDED SETUP
# =================
# Development/Testing:
#   - Environment: "Development" 
#   - Enable Safety Mode: ✅ (blocks create/update/delete operations)
#   - Use for: Testing triggers, reading data, workflow development

# Staging:
#   - Environment: "Staging"
#   - Enable Safety Mode: ⚠️ (optional, based on staging data sensitivity)
#   - Use for: Pre-production testing with safe data

# Production:
#   - Environment: "Production"
#   - Production Confirmation: ✅ (required)
#   - Enable Safety Mode: ❌ (not available - all operations allowed)
#   - Use for: Live operations only

# API ENDPOINTS BY ENVIRONMENT
# ============================
# All environments currently use: https://open.semble.io/graphql
# Different API tokens should be used for different environments

# WEBHOOK & REAL-TIME SUPPORT
# ==========================
# ❌ Semble API does NOT support webhooks or real-time events
# ❌ No GraphQL subscriptions available  
# ❌ Only polling-based triggers are possible
# ⚠️ Staff triggers are not possible due to API limitations:
#    - No 'staff' query field available
#    - 'users' query requires additional permissions
#    - User type lacks timestamp fields (createdAt/updatedAt)

# SUPPORTED TRIGGERS (Polling Only)
# ===============================
# ✅ Patients: newPatient, updatedPatient
# ✅ Appointments: newAppointment, updatedAppointment  
# ✅ Products: newProduct, updatedProduct
# ❌ Staff: Not supported due to API limitations

# BLOCKED OPERATIONS IN SAFETY MODE
# =================================
# - create* mutations (createAppointment, createPatient, etc.)
# - update* mutations (updateAppointment, updatePatient, etc.) 
# - delete* mutations (deleteAppointment, deletePatient, etc.)
# - Any operation containing "create", "update", "delete", or "mutation"

# ALLOWED OPERATIONS IN SAFETY MODE
# =================================
# - All query operations (read-only)
# - Polling triggers (read-only monitoring)
# - Schema introspection
# - Connection testing
