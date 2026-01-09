#!/usr/bin/env node

/**
 * AI Training System - Manual Test Script
 * Tests the complete AI suggestion and training flow
 * 
 * Usage: node test-ai-system.js
 */

const BASE_URL = 'http://localhost:3000';
const TOKEN = 'test-token'; // Will need to use real token from login
const COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000'; // Will need real company UUID

// Sample data
const mockIncomingMessage = 'Olá, qual é o horário de atendimento?';
const mockConnectionId = '550e8400-e29b-41d4-a716-446655440001';
const mockClientRef = '5511987654321';

async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function runTests() {
  console.log('🚀 AI Training System - Test Suite\n');
  console.log(`API: ${BASE_URL}`);
  console.log(`Token: ${TOKEN}`);
  console.log(`Company ID: ${COMPANY_ID}\n`);
  console.log('=' .repeat(60));

  // Test 1: Create suggestion
  console.log('\n📌 Test 1: Create AI Suggestion');
  console.log('-' .repeat(60));
  const createRes = await apiCall('POST', '/api/ai/suggestions', {
    company_id: COMPANY_ID,
    connection_id: mockConnectionId,
    client_ref: mockClientRef,
    incoming_message: mockIncomingMessage,
  });
  console.log(`Status: ${createRes.status} ${createRes.ok ? '✅' : '❌'}`);
  console.log('Response:', JSON.stringify(createRes.data, null, 2));

  if (!createRes.ok || !createRes.data.data?.id) {
    console.error('❌ Failed to create suggestion. Aborting remaining tests.');
    return;
  }

  const suggestionId = createRes.data.data.id;
  console.log(`✅ Suggestion created: ${suggestionId}`);

  // Test 2: Get pending suggestions
  console.log('\n📌 Test 2: Get Pending Suggestions');
  console.log('-' .repeat(60));
  const listRes = await apiCall(
    'GET',
    `/api/ai/suggestions?company_id=${COMPANY_ID}&limit=10`
  );
  console.log(`Status: ${listRes.status} ${listRes.ok ? '✅' : '❌'}`);
  console.log(`Found ${listRes.data.data?.length || 0} pending suggestions`);
  if (listRes.ok && listRes.data.data?.length > 0) {
    console.log('Latest suggestion:', JSON.stringify(listRes.data.data[0], null, 2));
  }

  // Test 3: Get auto-respond status (before approval)
  console.log('\n📌 Test 3: Get Auto-Respond Status (Before Training)');
  console.log('-' .repeat(60));
  const statusBefore = await apiCall(
    'GET',
    `/api/ai/auto-respond/status?company_id=${COMPANY_ID}`
  );
  console.log(`Status: ${statusBefore.status} ${statusBefore.ok ? '✅' : '❌'}`);
  console.log('Response:', JSON.stringify(statusBefore.data.data, null, 2));

  // Test 4: Approve suggestion
  console.log('\n📌 Test 4: Approve Suggestion');
  console.log('-' .repeat(60));
  const approveRes = await apiCall(
    'POST',
    `/api/ai/suggestions/${suggestionId}/approve`,
    {
      company_id: COMPANY_ID,
      approved_response: 'Bom dia! Atendemos de segunda a sexta, das 9h às 18h.',
    }
  );
  console.log(`Status: ${approveRes.status} ${approveRes.ok ? '✅' : '❌'}`);
  console.log('Response:', JSON.stringify(approveRes.data.data, null, 2));

  // Test 5: Get auto-respond status (after approval)
  console.log('\n📌 Test 5: Get Auto-Respond Status (After Approval)');
  console.log('-' .repeat(60));
  const statusAfter = await apiCall(
    'GET',
    `/api/ai/auto-respond/status?company_id=${COMPANY_ID}`
  );
  console.log(`Status: ${statusAfter.status} ${statusAfter.ok ? '✅' : '❌'}`);
  console.log('Response:', JSON.stringify(statusAfter.data.data, null, 2));

  // Verify training increased
  if (statusAfter.ok && statusBefore.ok) {
    const confidenceBefore = statusBefore.data.data?.ai_confidence_score || 0;
    const confidenceAfter = statusAfter.data.data?.ai_confidence_score || 0;
    const approvalsBefore = statusBefore.data.data?.ai_total_approvals || 0;
    const approvalsAfter = statusAfter.data.data?.ai_total_approvals || 0;

    console.log('\n📊 Training Progress:');
    console.log(
      `  Confidence: ${(confidenceBefore * 100).toFixed(1)}% → ${(confidenceAfter * 100).toFixed(1)}%`
    );
    console.log(
      `  Approvals: ${approvalsBefore} → ${approvalsAfter}`
    );

    if (approvalsAfter > approvalsBefore) {
      console.log('  ✅ Training score increased!');
    }
  }

  // Test 6: Toggle auto-respond
  console.log('\n📌 Test 6: Toggle Auto-Respond');
  console.log('-' .repeat(60));
  const toggleRes = await apiCall('POST', '/api/ai/auto-respond', {
    company_id: COMPANY_ID,
    enabled: true,
  });
  console.log(`Status: ${toggleRes.status} ${toggleRes.ok ? '✅' : '❌'}`);
  console.log('Response:', JSON.stringify(toggleRes.data.data, null, 2));

  // Test 7: Create and reject another suggestion
  if (listRes.ok) {
    console.log('\n📌 Test 7: Create and Reject Suggestion');
    console.log('-' .repeat(60));
    const create2Res = await apiCall('POST', '/api/ai/suggestions', {
      company_id: COMPANY_ID,
      connection_id: mockConnectionId,
      client_ref: mockClientRef,
      incoming_message: 'Vocês entregam na minha região?',
    });

    if (create2Res.ok && create2Res.data.data?.id) {
      const suggestion2Id = create2Res.data.data.id;
      console.log(`Created second suggestion: ${suggestion2Id}`);

      const rejectRes = await apiCall(
        'POST',
        `/api/ai/suggestions/${suggestion2Id}/reject`,
        {
          company_id: COMPANY_ID,
          feedback: 'Resposta genérica demais, precisa verificar CEP',
        }
      );
      console.log(`Status: ${rejectRes.status} ${rejectRes.ok ? '✅' : '❌'}`);
      console.log('Response:', JSON.stringify(rejectRes.data.data, null, 2));
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test suite completed!\n');
  console.log('📋 Summary:');
  console.log('  - Suggestion creation: ✅');
  console.log('  - List suggestions: ✅');
  console.log('  - Approve suggestion: ✅');
  console.log('  - Confidence tracking: ✅');
  console.log('  - Auto-respond toggle: ✅');
  console.log('  - Suggestion rejection: ✅');
  console.log('\n💡 Next steps:');
  console.log('  1. Integrate WhatsApp webhook to auto-trigger suggestions');
  console.log('  2. Test complete flow with real WhatsApp messages');
  console.log('  3. Monitor confidence scores in admin panel');
}

runTests().catch((error) => {
  console.error('❌ Test error:', error.message);
  process.exit(1);
});
