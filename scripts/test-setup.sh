#!/bin/bash

# Simple test script to verify the full setup works
set -e

echo "🧪 Testing n8n development environment..."

# Load environment utilities
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/../../n8n-local-test/env-utils.sh" 2>/dev/null || {
    echo "❌ Cannot load environment utilities. Run this from the n8n-local-test directory or ensure env-utils.sh exists."
    exit 1
}

# Load environment variables
load_env

# Test 1: Check if n8n is running
echo "1. Testing n8n health..."
if curl -s http://localhost:5678/healthz > /dev/null; then
    echo "   ✅ n8n is running"
else
    echo "   ❌ n8n is not running"
    exit 1
fi

# Test 2: Check if Semble node is available
echo "2. Testing Semble node availability..."
if curl -s http://localhost:5678/types/nodes.json | grep -q "n8n-nodes-semble"; then
    echo "   ✅ Semble node is available"
else
    echo "   ❌ Semble node is not available"
    exit 1
fi

# Test 3: Check login works  
echo "3. Testing owner account..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5678/rest/login \
  -H "Content-Type: application/json" \
  -d "{\"emailOrLdapLoginId\":\"$N8N_LOCAL_ADMIN_EMAIL\",\"password\":\"$N8N_LOCAL_ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "sessionId\|\"data\""; then
    echo "   ✅ Owner account login works"
else
    echo "   ❌ Owner account login failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed! Setup is working correctly."
echo ""
echo "🌐 Access n8n at: http://localhost:5678"
echo "📧 Login: $N8N_LOCAL_ADMIN_EMAIL / [CONFIGURED]"
echo "🔍 Search for 'Semble' to find both the regular node and trigger"
echo ""
echo "✨ Available Semble nodes:"
echo "   • Semble - Regular operations (patients, staff, appointments)"
echo "   • Semble Trigger - Polling trigger for new/updated records"
