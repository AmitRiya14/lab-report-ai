// test-env.js - Create this file in your project root to test env variables
require('dotenv').config({ path: '.env.local' });

console.log('Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Found' : '❌ Missing');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? '✅ Found' : '❌ Missing');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Found' : '❌ Missing');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Found' : '❌ Missing');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Found' : '❌ Missing');

console.log('\nValues:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);