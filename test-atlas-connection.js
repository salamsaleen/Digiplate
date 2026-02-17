const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔍 Testing MongoDB Atlas Connection...\n');

async function testConnection() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log('✅ Successfully connected to MongoDB Atlas!');
        console.log('📊 Connection Details:');
        console.log('   - Database:', mongoose.connection.db.databaseName);
        console.log('   - Host:', mongoose.connection.host);
        console.log('   - Connection State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');

        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n📁 Available Collections:');
        if (collections.length === 0) {
            console.log('   (No collections found - database is empty)');
        } else {
            collections.forEach(col => {
                console.log(`   - ${col.name}`);
            });
        }

        // Test a simple query
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model('User', UserSchema);
        const userCount = await User.countDocuments();
        console.log(`\n👥 Total Users: ${userCount}`);

        await mongoose.disconnect();
        console.log('\n✅ Connection test completed successfully!');
        console.log('🎉 Your MongoDB Atlas connection is working properly!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Connection failed!');
        console.error('Error:', error.message);

        if (error.message.includes('authentication failed')) {
            console.error('\n💡 Tip: Check your username and password in MongoDB Atlas');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('\n💡 Tip: Check your cluster hostname and internet connection');
        } else if (error.message.includes('IP')) {
            console.error('\n💡 Tip: Add your IP address to MongoDB Atlas Network Access');
        }

        process.exit(1);
    }
}

testConnection();
