const mongoose = require('mongoose');
const fs = require('fs');

// Read .env.local file manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
let MONGODB_URI = '';

for (const line of envLines) {
    if (line.startsWith('MONGODB_URI=')) {
        MONGODB_URI = line.substring('MONGODB_URI='.length).trim();
        break;
    }
}

console.log('Testing MongoDB Atlas Connection...');
console.log('MongoDB URI:', MONGODB_URI ? MONGODB_URI.replace(/:[^:@]+@/, ':****@') : 'NOT FOUND');

async function testConnection() {
    try {
        console.log('\nAttempting to connect...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log('✅ Successfully connected to MongoDB Atlas!');
        console.log('Connection state:', mongoose.connection.readyState);
        console.log('Database name:', mongoose.connection.db.databaseName);

        // Test a simple query
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\nAvailable collections:', collections.map(c => c.name).join(', '));

        await mongoose.disconnect();
        console.log('\n✅ Connection test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Connection failed!');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);

        if (error.message.includes('ENOTFOUND')) {
            console.error('\n🔍 DNS Resolution Error - The MongoDB Atlas cluster hostname could not be resolved.');
            console.error('Possible causes:');
            console.error('  - Check your internet connection');
            console.error('  - Verify the cluster hostname in your connection string');
        } else if (error.message.includes('authentication failed')) {
            console.error('\n🔍 Authentication Error - Username or password is incorrect.');
            console.error('Possible causes:');
            console.error('  - Verify username and password in MongoDB Atlas');
            console.error('  - Check if the database user has proper permissions');
        } else if (error.message.includes('IP') || error.message.includes('whitelist')) {
            console.error('\n🔍 IP Whitelist Error - Your IP address is not whitelisted.');
            console.error('Possible causes:');
            console.error('  - Add your current IP to MongoDB Atlas Network Access');
            console.error('  - Or allow access from anywhere (0.0.0.0/0) for testing');
        } else if (error.message.includes('timeout')) {
            console.error('\n🔍 Connection Timeout - Could not reach MongoDB Atlas.');
            console.error('Possible causes:');
            console.error('  - Firewall blocking outbound connections');
            console.error('  - Network connectivity issues');
            console.error('  - MongoDB Atlas cluster is paused or deleted');
        }

        console.error('\nFull error:', error);
        process.exit(1);
    }
}

testConnection();
