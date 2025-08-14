// Simple test to verify frontend can connect to backend
const API_BASE_URL = 'http://localhost:3000/api';

async function testConnection() {
  console.log('🔍 Testing Backend Connection...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing API health...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`).catch(() => null);
    
    if (!healthResponse) {
      console.log('   ❌ Backend is not running');
      console.log('   💡 Run: cd leave-management-backend && npm run start:dev');
      return;
    }
    console.log('   ✅ Backend is running');

    // Test 2: Try admin login
    console.log('\n2. Testing admin login...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@company.com',
        password: 'Admin@123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('   ✅ Admin login successful');
      console.log(`   👤 User: ${loginData.user.email} (${loginData.user.role})`);
      
      // Test 3: Test authenticated endpoint
      console.log('\n3. Testing authenticated endpoint...');
      const dashboardResponse = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
        headers: { 'Authorization': `Bearer ${loginData.access_token}` }
      });
      
      if (dashboardResponse.ok) {
        console.log('   ✅ Authentication working');
      } else {
        console.log('   ❌ Authentication failed');
      }
    } else {
      const error = await loginResponse.json();
      console.log(`   ❌ Login failed: ${error.message || 'Unknown error'}`);
    }

    console.log('\n✅ Connection test completed!');
    console.log('\n📍 URLs:');
    console.log('   Frontend: http://localhost:8081');
    console.log('   Backend: http://localhost:3000');
    console.log('   API Docs: http://localhost:3000/api/docs');
    
  } catch (error) {
    console.log(`❌ Connection test failed: ${error.message}`);
    console.log('\n💡 Make sure both frontend and backend are running:');
    console.log('   Backend: cd leave-management-backend && npm run start:dev');
    console.log('   Frontend: npm run dev');
  }
}

testConnection();