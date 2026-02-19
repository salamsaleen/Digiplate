
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const keysToCheck = ['NEXT_PUBLIC_RAZORPAY_KEY_ID', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'];
    const foundKeys = {};

    lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && keysToCheck.includes(key.trim())) {
            foundKeys[key.trim()] = value ? 'Present' : 'Empty';
        }
    });

    console.log('Environment Variables Check:');
    keysToCheck.forEach(key => {
        console.log(`${key}: ${foundKeys[key] || 'MISSING'}`);
    });
} else {
    console.log('.env.local not found!');
}
