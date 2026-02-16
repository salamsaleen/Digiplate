const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Helper to load env vars
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = require('dotenv').config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiplate';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'student' },
    department: { type: String, required: true },
    walletBalance: { type: Number, default: 0 },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const adminEmail = 'admin@digiplate.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    const hashedPassword = await bcrypt.hash('admin123', 10);

    if (!existingAdmin) {
        await User.create({
            name: 'Super Admin',
            email: adminEmail,
            phone: '+910000000000',
            password: hashedPassword,
            role: 'super_admin',
            department: 'admin',
        });
        console.log('Super Admin created: admin@digiplate.com / admin123');
    } else {
        console.log('Super Admin already exists');
    }

    // Create Demo Dept Admin
    const deptAdminEmail = 'cs_admin@digiplate.com';
    const existingDeptAdmin = await User.findOne({ email: deptAdminEmail });
    if (!existingDeptAdmin) {
        await User.create({
            name: 'CS HOD',
            email: deptAdminEmail,
            phone: '+919999999991',
            password: hashedPassword,
            role: 'dept_admin',
            department: 'bsc.cs',
        });
        console.log('Dept Admin created: cs_admin@digiplate.com / admin123');
    } else {
        console.log('Dept Admin already exists');
    }

    // Create Demo Student
    const studentEmail = 'student@digiplate.com';
    const existingStudent = await User.findOne({ email: studentEmail });
    if (!existingStudent) {
        const studentPass = await bcrypt.hash('student123', 10);
        await User.create({
            name: 'Arjun Student',
            email: studentEmail,
            phone: '+919999999992',
            password: studentPass,
            role: 'student',
            department: 'bsc.cs',
            walletBalance: 100,
        });
        console.log('Student created: student@digiplate.com / student123');
    } else {
        console.log('Student already exists');
    }

    // Create Canteen Staff
    const canteenEmail = 'canteen@digiplate.com';
    const existingCanteen = await User.findOne({ email: canteenEmail });
    if (!existingCanteen) {
        const canteenPass = await bcrypt.hash('canteen123', 10);
        await User.create({
            name: 'Main Canteen Staff',
            email: canteenEmail,
            phone: '+919999999900',
            password: canteenPass,
            role: 'canteen_staff',
            department: 'canteen',
        });
        console.log('Canteen Staff created: canteen@digiplate.com / canteen123');
    } else {
        console.log('Canteen Staff already exists');
    }

    // Create 10 Demo Students
    console.log('Creating 10 demo students...');
    const studentPass = await bcrypt.hash('student123', 10);

    for (let i = 1; i <= 10; i++) {
        const email = `student${i}@digiplate.com`;
        const existing = await User.findOne({ email });

        if (!existing) {
            await User.create({
                name: `Test Student ${i}`,
                email: email,
                phone: `+9190000000${i.toString().padStart(2, '0')}`,
                password: studentPass,
                role: 'student',
                department: 'bsc.cs', // Put all in CS for easy testing
                walletBalance: 100,
            });
            console.log(`Created: ${email} / student123`);
        }
    }

    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
