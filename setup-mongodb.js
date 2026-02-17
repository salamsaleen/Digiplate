#!/usr/bin/env node

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                   MONGODB ATLAS SETUP GUIDE                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📋 STEP-BY-STEP INSTRUCTIONS:\n');

console.log('1️⃣  Open MongoDB Atlas');
console.log('   → Go to: https://cloud.mongodb.com/');
console.log('   → Log in to your account\n');

console.log('2️⃣  Select Your Project');
console.log('   → Look for the project containing: cluster0.2dj5wzx');
console.log('   → Click on it to open\n');

console.log('3️⃣  Navigate to Network Access');
console.log('   → On the LEFT SIDEBAR, under "Security"');
console.log('   → Click "Network Access"\n');

console.log('4️⃣  Add Your IP Address');
console.log('   → Click the green "ADD IP ADDRESS" button');
console.log('   → Choose ONE of these options:\n');

console.log('   ┌─────────────────────────────────────────────────────┐');
console.log('   │ OPTION A: Add Current IP (Recommended)              │');
console.log('   ├─────────────────────────────────────────────────────┤');
console.log('   │ • Click "ADD CURRENT IP ADDRESS"                    │');
console.log('   │ • MongoDB auto-detects your IP                      │');
console.log('   │ • Add description: "Development Machine"            │');
console.log('   │ • Click "Confirm"                                   │');
console.log('   └─────────────────────────────────────────────────────┘\n');

console.log('   ┌─────────────────────────────────────────────────────┐');
console.log('   │ OPTION B: Allow All IPs (Testing Only)              │');
console.log('   ├─────────────────────────────────────────────────────┤');
console.log('   │ • Click "ALLOW ACCESS FROM ANYWHERE"                │');
console.log('   │ • This adds: 0.0.0.0/0                              │');
console.log('   │ • ⚠️  Less secure - for testing only!               │');
console.log('   │ • Click "Confirm"                                   │');
console.log('   └─────────────────────────────────────────────────────┘\n');

console.log('5️⃣  Wait for Changes');
console.log('   → Wait 1-2 minutes for changes to propagate\n');

console.log('6️⃣  Test the Connection');
console.log('   → Run: node test-atlas-connection.js');
console.log('   → You should see: "✅ Successfully connected!"\n');

console.log('7️⃣  Try Logging In');
console.log('   → Go to: http://localhost:3000');
console.log('   → Email: admin@digiplate.com');
console.log('   → Password: admin123\n');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                     CURRENT STATUS CHECK                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function quickTest() {
    try {
        console.log('Testing MongoDB connection...');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ SUCCESS! MongoDB is connected!');
        console.log('   You can now log in to your application.\n');
        await mongoose.disconnect();
    } catch (error) {
        console.log('❌ FAILED! MongoDB connection blocked.');
        console.log('   Reason: Your IP is not whitelisted yet.');
        console.log('   👆 Follow the steps above to fix this!\n');
    }
}

quickTest();
