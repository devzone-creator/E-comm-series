import AuthService from '../services/authService.js';
import { pool } from '../config/database.js';

async function testAuthSystem() {
  console.log('🧪 Testing Authentication System...\n');
  
  let passed = 0;
  let failed = 0;

  const test = async (name, testFn) => {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  };

  // Test 1: User Registration
  await test('User Registration', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'Test123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890'
    };
    
    const result = await AuthService.register(userData);
    if (!result.success) throw new Error('Registration failed');
    if (!result.token) throw new Error('No token returned');
    if (!result.user.id) throw new Error('No user ID returned');
  });

  // Test 2: User Login
  await test('User Login', async () => {
    const result = await AuthService.login('test@example.com', 'Test123');
    if (!result.success) throw new Error('Login failed');
    if (!result.token) throw new Error('No token returned');
    if (result.user.email !== 'test@example.com') throw new Error('Wrong user returned');
  });

  // Test 3: Invalid Login
  await test('Invalid Login Rejection', async () => {
    try {
      await AuthService.login('test@example.com', 'wrongpassword');
      throw new Error('Should have failed with wrong password');
    } catch (error) {
      if (error.message.includes('Invalid email or password')) {
        // This is expected
      } else {
        throw error;
      }
    }
  });

  // Test 4: Admin User Login
  await test('Admin User Login', async () => {
    const result = await AuthService.login('admin@afriglam.com', 'admin123');
    if (!result.success) throw new Error('Admin login failed');
    if (result.user.role !== 'admin') throw new Error('User is not admin');
  });

  // Test 5: Get User Profile
  await test('Get User Profile', async () => {
    const loginResult = await AuthService.login('test@example.com', 'Test123');
    const profileResult = await AuthService.getProfile(loginResult.user.id);
    if (!profileResult.success) throw new Error('Get profile failed');
    if (profileResult.user.email !== 'test@example.com') throw new Error('Wrong profile returned');
  });

  // Test 6: Update User Profile
  await test('Update User Profile', async () => {
    const loginResult = await AuthService.login('test@example.com', 'Test123');
    const updateResult = await AuthService.updateProfile(loginResult.user.id, {
      firstName: 'Updated',
      lastName: 'Name',
      phone: '+9876543210'
    });
    if (!updateResult.success) throw new Error('Profile update failed');
    if (updateResult.user.first_name !== 'Updated') throw new Error('Profile not updated');
  });

  // Test 7: Change Password
  await test('Change Password', async () => {
    const loginResult = await AuthService.login('test@example.com', 'Test123');
    const changeResult = await AuthService.changePassword(loginResult.user.id, 'Test123', 'NewTest123');
    if (!changeResult.success) throw new Error('Password change failed');
    
    // Test login with new password
    const newLoginResult = await AuthService.login('test@example.com', 'NewTest123');
    if (!newLoginResult.success) throw new Error('Login with new password failed');
  });

  // Cleanup: Delete test user
  await test('Cleanup Test User', async () => {
    await pool.query('DELETE FROM users WHERE email = $1', ['test@example.com']);
  });

  console.log(`\n📊 Auth Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Some authentication tests failed');
    process.exit(1);
  } else {
    console.log('✅ All authentication tests passed!');
  }
  
  await pool.end();
}

testAuthSystem().catch(error => {
  console.error('Auth test runner error:', error);
  process.exit(1);
});