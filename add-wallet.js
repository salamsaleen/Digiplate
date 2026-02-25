const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://digiplatenmsm:A4NlnSrO8cE4PszN@cluster0.bup3rof.mongodb.net/digiplate?retryWrites=true&w=majority&appName=Cluster0';

async function addWallet() {
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('digiplate');
        const users = db.collection('users');

        await users.updateOne(
            { email: 'teststudent@digiplate.com' },
            { $set: { walletBalance: 100 } }
        );
        console.log('✅ Added ₹100 wallet balance to teststudent@digiplate.com');
    } finally {
        await client.close();
    }
}

addWallet();
