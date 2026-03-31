const axios = require('axios');
const fs = require('fs');

const API = 'http://localhost:5000/api';

async function register(role, email) {
  try {
    const res = await axios.post(`${API}/auth/register`, {
      email,
      password: 'password123',
      full_name: `Test ${role.toUpperCase()}`,
      role: role,
      phone: '1234567890'
    });
    console.log(`Registered ${role}: ${email}`);
    return res.data;
  } catch (err) {
    if (err.response?.status === 409) {
      console.log(`User ${email} already exists`);
    } else {
      console.error(`Failed to register ${role}:`, err.response?.data || err.message);
    }
  }
}

async function seed() {
  await register('student', 'student@test.com');
  await register('employer', 'employer@test.com');
  // NOTE: CDC admins must be assigned by super admin or via special onboarding.
  // For easy demo, let's also try registering them if allowed or just use the other roles.
  // But wait, in the routes, only student, alumni, employer are allowed for public register.
  
  try {
    await axios.post(`${API}/auth/bootstrap-super-admin`, {
       email: 'admin@test.com',
       password: 'password123',
       full_name: 'Test Super Admin',
       secret: 'trusthire-bootstrap'
     });
     console.log('Bootstrapped super admin');
  } catch(e) {
     if (e.response?.status === 409) {
       console.log('Super admin already bootstrapped');
     } else {
       console.error('Failed to bootstrap super admin:', e.response?.data || e.message);
     }
  }

  // Testing individual login to confirm access
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: 'student@test.com',
      password: 'password123'
    });
    console.log('Tested student login: SUCCESS');
  } catch(e) {
    console.log('Tested student login: FAILED');
  }
}

seed();
