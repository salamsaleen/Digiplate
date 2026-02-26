
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isBookingOpen, getNextLunchDate } from '@/lib/time';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';

export async function POST(req: NextRequest) {
    try {
        console.log('[VERIFIED_QR_CREATE_START]');
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;

        // Check if user has an existing polled/approved coupon for tomorrow
        await connectToDatabase();
        const lunchDate = getNextLunchDate();
        const start = new Date(lunchDate); start.setHours(0, 0, 0, 0);
        const end = new Date(lunchDate); end.setHours(23, 59, 59, 999);

        const existing = await Coupon.findOne({
            studentId: user.id,
            validForDate: { $gte: start, $lt: end },
            status: { $in: ['polled', 'approved'] }
        });

        // If no existing coupon that can be paid for, check if polling is open
        if (!existing) {
            const { open, message: timeMsg } = isBookingOpen(user.email);
            if (!open) {
                return NextResponse.json({ message: timeMsg }, { status: 400 });
            }
        }

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return NextResponse.json({ message: 'Razorpay API Keys missing' }, { status: 500 });
        }

        console.log('[VERIFIED_QR_CREATE_BEFORE_RAZORPAY]');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        // Payment Link expires in 30 minutes
        const expireBy = Math.floor(Date.now() / 1000) + 30 * 60;

        // Base URL for callback — works both locally and on Vercel
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

        // Create a Razorpay Payment Link — Razorpay tracks all payments via this link
        const paymentLink = await (razorpay as any).paymentLink.create({
            amount: 1000, // ₹10 in paise
            currency: 'INR',
            description: 'DigiPlate Meal Coupon – ₹10',
            customer: {
                name: user.name || 'Student',
                email: user.email || '',
            },
            notify: { sms: false, email: false },
            reminder_enable: false,
            expire_by: expireBy,
            // After payment, Razorpay redirects here with ?razorpay_payment_link_status=paid
            callback_url: `${baseUrl}/dashboard`,
            callback_method: 'get',
        });

        return NextResponse.json({
            paymentLinkId: paymentLink.id,
            shortUrl: paymentLink.short_url,  // e.g. https://rzp.io/l/abc123
            amount: paymentLink.amount,
        });

    } catch (error: any) {
        console.error('[QR CREATE ERROR]', error);
        return NextResponse.json({ message: error.error?.description || error.message }, { status: 500 });
    }
}
