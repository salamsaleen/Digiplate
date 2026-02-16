const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiplate';

async function checkUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const users = await User.find({}).lean();

        const output = users.map(u => ({
            email: u.email,
            role: u.role,
            department: u.department,
            name: u.name
        }));

        fs.writeFileSync(path.resolve(__dirname, '../users_dump.json'), JSON.stringify(output, null, 2));
        console.log('Done writing users_dump.json');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUsers();
