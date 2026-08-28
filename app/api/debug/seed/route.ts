
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/password';

export async function GET() {
    try {
        await connectToDatabase();

        // Clear existing users to avoid duplicates/conflicts during development
        await User.deleteMany({});

        const password = await hashPassword('digiplate123');
        const users = [];

        // 1. Super Admin
        users.push({
            name: 'Super Admin',
            email: 'admin@digiplate.com',
            phone: '9999999999',
            password,
            role: 'super_admin',
            department: 'admin'
        });

        // 2. Canteen Staff
        users.push({
            name: 'Canteen Staff',
            email: 'canteen@digiplate.com',
            phone: '8888888888',
            password,
            role: 'canteen_staff',
            department: 'canteen'
        });

        // 3. Department Admins
        const depts = [
            { code: 'cs', email: 'hod.cs@digiplate.com', name: 'CS HOD' },
            { code: 'chemistry', email: 'hod.chem@digiplate.com', name: 'Chemistry HOD' },
            { code: 'history', email: 'hod.history@digiplate.com', name: 'History HOD' },
            { code: 'economics', email: 'hod.eco@digiplate.com', name: 'Economics HOD' },
            { code: 'jmc', email: 'hod.jmc@digiplate.com', name: 'JMC HOD' },
            { code: 'commerce', email: 'hod.commerce@digiplate.com', name: 'Commerce HOD' },
        ];

        depts.forEach(d => {
            users.push({
                name: d.name,
                email: d.email,
                phone: `70000000${users.length}`,
                password,
                role: 'dept_admin',
                department: d.code
            });
        });

        // 4. Sample Students
        // CS Student (UG default)
        users.push({
            name: 'Rahul CS',
            email: 'student.cs@digiplate.com',
            phone: '6000000001',
            password,
            role: 'student',
            department: 'cs',
            program: 'ug'
        });

        // History BA Student
        users.push({
            name: 'Anjali History (BA)',
            email: 'student.balhis@digiplate.com',
            phone: '6000000002',
            password,
            role: 'student',
            department: 'history',
            program: 'ug'
        });

        // History MA Student
        users.push({
            name: 'Vishnu History (MA)',
            email: 'student.mahis@digiplate.com',
            phone: '6000000003',
            password,
            role: 'student',
            department: 'history',
            program: 'pg'
        });

        // 5. Generate 10 Random Students
        const programs = ['ug', 'pg'];
        const studentDepts = ['cs', 'chemistry', 'history', 'economics', 'jmc', 'commerce'];

        for (let i = 1; i <= 10; i++) {
            const dept = studentDepts[Math.floor(Math.random() * studentDepts.length)];
            const prog = programs[Math.floor(Math.random() * programs.length)];

            users.push({
                name: `Student ${i} (${dept.toUpperCase()} ${prog.toUpperCase()})`,
                email: `student${i}@digiplate.com`,
                phone: `90000000${i.toString().padStart(2, '0')}`,
                password,
                role: 'student',
                department: dept,
                program: prog
            });
        }

        let createdCount = 0;
        for (const u of users) {
            const exists = await User.findOne({ email: u.email });
            if (!exists) {
                await User.create(u);
                createdCount++;
            } else {
                // Optional: Update password if needed
                // exists.password = password;
                // await exists.save();
            }
        }

        return NextResponse.json({ message: `Seeded ${createdCount} new users.`, users: users.map(u => ({ email: u.email, role: u.role, dept: u.department })) });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
