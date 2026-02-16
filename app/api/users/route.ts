import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { hashPassword, generateRandomPassword } from '@/lib/password';
import { sendSMS, sendEmail } from '@/lib/notify';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role === 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, phone, role, department, program } = body;

        if ((session.user as any).role === 'dept_admin' && department !== (session.user as any).department) {
            return NextResponse.json({ message: 'You can only register students for your department' }, { status: 403 });
        }

        await connectToDatabase();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User already exists' }, { status: 400 });
        }

        const rawPassword = generateRandomPassword(8);
        const hashedPassword = await hashPassword(rawPassword);

        const newUser = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || 'student',
            department,
            program: program || 'ug',
        });

        const credentialMsg = `Welcome to DigiPlate! Your login: Email: ${email}, Password: ${rawPassword}`;
        await sendSMS(phone, credentialMsg);
        await sendEmail(email, 'Your DigiPlate Account Credentials', credentialMsg);

        return NextResponse.json({ message: 'User created successfully', user: newUser }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        let query: any = {};
        if ((session.user as any).role === 'dept_admin') {
            query = { department: (session.user as any).department, role: 'student' };
        } else if ((session.user as any).role === 'student') {
            return NextResponse.json({ message: 'Access Denied' }, { status: 403 });
        }

        const users = await User.find(query).select('-password');
        return NextResponse.json(users);
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !((session.user as any).role === 'dept_admin' || (session.user as any).role === 'super_admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

        await connectToDatabase();

        // If Dept Admin, ensure user belongs to their dept
        if ((session.user as any).role === 'dept_admin') {
            const userToDelete = await User.findById(id);
            if (!userToDelete) return NextResponse.json({ message: 'User not found' }, { status: 404 });
            if (userToDelete.department !== (session.user as any).department) {
                return NextResponse.json({ message: 'Cannot delete student from another department' }, { status: 403 });
            }
        }

        await User.findByIdAndDelete(id);
        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
