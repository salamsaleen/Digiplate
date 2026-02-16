
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyPassword } from '@/lib/password';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const { email, password } = await req.json();

        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ message: 'User not found', email });
        }

        const isValid = await verifyPassword(password, user.password);

        return NextResponse.json({
            message: isValid ? 'Credentials Valid' : 'Invalid Password',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                program: user.program
            },
            isValid
        });

    } catch (error: any) {
        console.error('Debug Check User Error:', error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 200 });
    }
}
