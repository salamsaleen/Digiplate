const { MongoClient } = require('mongodb');
const URI = 'mongodb+srv://digiplatenmsm:A4NlnSrO8cE4PszN@cluster0.bup3rof.mongodb.net/digiplate?retryWrites=true&w=majority&appName=Cluster0';

async function run() {
    const client = new MongoClient(URI);
    await client.connect();
    const r = await client.db('digiplate').collection('users').updateMany(
        { role: 'student' },
        { $set: { walletBalance: 0 } }
    );
    console.log('✅ Wallet reset to ₹0 for all students. Updated:', r.modifiedCount);
    await client.close();
}
run().catch(console.error);
