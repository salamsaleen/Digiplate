
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import SystemSettings from '@/models/SystemSettings';
import User from '@/models/User';
import { isBookingOpen, isPaymentOpen, getNextLunchDate, getTodayLunchDate } from '@/lib/time';
import { sendPushNotification } from '@/lib/notify';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();
        const body = await req.json();
        const action = body.action || 'poll'; // 'poll' | 'pay_direct' | 'pay'
        const mealType = body.mealType || 'Rice';

        const studentId = (session.user as any).id;
        const userEmail = (session.user as any).email;

        // ─── ACTION: poll ──────────────────────────────────────────────────────────
        // Student commits to eating tomorrow. No payment. Polling window only.
        if (action === 'poll') {
            const { open, message: timeMsg } = isBookingOpen(userEmail);
            if (!open) return NextResponse.json({ message: timeMsg }, { status: 400 });

            const lunchDate = getNextLunchDate();

            const existing = await Coupon.findOne({
                studentId,
                validForDate: lunchDate,
                status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed'] }
            });
            if (existing) {
                return NextResponse.json({ message: `Already polled. Status: ${existing.status}` }, { status: 400 });
            }

            const settingsDoc = await SystemSettings.findOne({ date: lunchDate });
            const sideDishes = settingsDoc?.sideDishes || ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const newCoupon = await Coupon.create({
                code,
                studentId,
                department: (session.user as any).department,
                status: 'polled',
                validForDate: lunchDate,
                originalOwnerId: studentId,
                mealType,
                sideDishes,
                amountPaid: 0, // polled only — not paid yet
            });

            const user = await User.findById(studentId);
                await sendPushNotification(user._id.toString(), '✅ Polled successfully!', 'Please pay between 6:00 AM and 10:00 AM tomorrow to confirm.');

            return NextResponse.json({ message: 'Polled! Pay before 10:00 AM tomorrow to confirm.', coupon: newCoupon }, { status: 201 });
        }

        return NextResponse.json({ message: 'Invalid Action' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();
    const studentId = (session.user as any).id;

    const coupon = await Coupon.findOne({
        studentId,
        status: { $in: ['active', 'requested', 'approved', 'polled'] }
    }).sort({ validForDate: -1 });

    return NextResponse.json({ coupon });
}
