const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiplate';

async function resetPasswords() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const UserSchema = new mongoose.Schema({
            email: String,
            role: String,
            name: String
        }, { strict: false });

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const adminHash = await bcrypt.hash('admin123', 10);
        const studentHash = await bcrypt.hash('student123', 10);
        const canteenHash = await bcrypt.hash('canteen123', 10);

        // Reset Admins (Super & Dept)
        const admins = await User.updateMany(
            { role: { $in: ['super_admin', 'dept_admin'] } },
            { password: adminHash }
        );
        console.log(`Reset ${admins.modifiedCount} admins to 'admin123'`);

        // Reset Students
        const students = await User.updateMany(
            { role: 'student' },
            { password: studentHash }
        );
        console.log(`Reset ${students.modifiedCount} students to 'student123'`);

        // Reset Canteen
        const canteen = await User.updateMany(
            { role: 'canteen_staff' },
            { password: canteenHash }
        );
        console.log(`Reset ${canteen.modifiedCount} canteen staff to 'canteen123'`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

resetPasswords();
