
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, sendSMS } from '@/lib/notify';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { userId, email, phone, password, name } = await req.json();

        // 1. Send Email if both email and password are provided
        if (email && password) {
            const subject = 'Welcome to DigiPlate - Your Login Credentials';
            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Welcome to DigiPlate!</h2>
                    <p>Hello ${name || 'Student'},</p>
                    <p>Your account has been created. Here are your login details:</p>
                    <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Password:</strong> ${password}</p>
                    </div>
                    <p>Please login and change your password immediately.</p>
                    <p><a href="${process.env.NEXTAUTH_URL}/login">Click here to Login</a></p>
                </div>
            `;
            await sendEmail(email, subject, html);
        }

        // 2. Send SMS if phone and password provided
        if (phone && password) {
            const message = `Welcome to DigiPlate, ${name || 'Student'}! Your login: Email: ${email}, Password: ${password}. Login at: ${process.env.NEXTAUTH_URL}`;
            await sendSMS(phone, message);
        }

        return NextResponse.json({ message: 'Credentials sent successfully' });

    } catch (error: any) {
        console.error('Send Credentials Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
