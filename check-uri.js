// Simple test to check MongoDB URI format
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');

for (const line of lines) {
    if (line.startsWith('MONGODB_URI=')) {
        const uri = line.substring('MONGODB_URI='.length).trim();
        console.log('Full URI:', uri);
        console.log('\n--- URI Analysis ---');

        // Parse the URI
        const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);

        if (match) {
            const [, username, password, cluster, database] = match;
            console.log('Protocol: mongodb+srv://');
            console.log('Username:', username);
            console.log('Password (raw):', password);
            console.log('Password (URL encoded):', encodeURIComponent(password));
            console.log('Cluster:', cluster);
            console.log('Database:', database);

            console.log('\n--- Issues Detected ---');

            // Check for special characters that need encoding
            const specialChars = ['#', '@', ':', '/', '?', '&', '=', '+', '$', ',', ';'];
            const foundSpecialChars = [];

            for (const char of specialChars) {
                if (password.includes(char)) {
                    foundSpecialChars.push(char);
                }
            }

            if (foundSpecialChars.length > 0) {
                console.log('⚠️  PASSWORD CONTAINS SPECIAL CHARACTERS:', foundSpecialChars.join(', '));
                console.log('These characters MUST be URL-encoded in the connection string!');
                console.log('\nCorrected URI:');
                const correctedUri = `mongodb+srv://${username}:${encodeURIComponent(password)}@${cluster}/${database}`;
                console.log(correctedUri);
            } else {
                console.log('✅ No special characters detected in password');
            }
        } else {
            console.log('❌ Could not parse MongoDB URI');
        }

        break;
    }
}
