const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://digiplatenmsm:A4NlnSrO8cE4PszN@cluster0.bup3rof.mongodb.net/digiplate?retryWrites=true&w=majority&appName=Cluster0';

async function resetPassword() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('digiplate');
        const users = db.collection('users');

        // Check if user exists
        const user = await users.findOne({ email: 'teststudent@digiplate.com' });
        if (!user) {
            console.log('❌ User teststudent@digiplate.com NOT found in database!');
            console.log('Creating the user...');
            const hashedPassword = await bcrypt.hash('test123', 10);
            await users.insertOne({
                email: 'teststudent@digiplate.com',
                name: 'Test Student (Automation)',
                role: 'student',
                department: 'cs',
                password: hashedPassword,
                createdAt: new Date(),
            });
            console.log('✅ User created with password: test123');
        } else {
            console.log('✅ User found:', user.name, '|', user.email);
            const hashedPassword = await bcrypt.hash('test123', 10);
            await users.updateOne(
                { email: 'teststudent@digiplate.com' },
                { $set: { password: hashedPassword } }
            );
            console.log('✅ Password reset to: test123');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.close();
    }
}

resetPassword();
