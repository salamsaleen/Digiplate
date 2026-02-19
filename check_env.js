
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env.local
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

console.log('Checking Environment Variables...');
console.log('NEXT_PUBLIC_RAZORPAY_KEY_ID:', envConfig.NEXT_PUBLIC_RAZORPAY_KEY_ID ? 'Present' : 'MISSING');
console.log('RAZORPAY_KEY_ID:', envConfig.RAZORPAY_KEY_ID ? 'Present' : 'MISSING');
console.log('RAZORPAY_KEY_SECRET:', envConfig.RAZORPAY_KEY_SECRET ? 'Present' : 'MISSING');
