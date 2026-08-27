
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import SystemSettings from '@/models/SystemSettings';
import User from '@/models/User';
import { isBookingOpen, isPaymentOpen, getNextLunchDate, getTodayLunchDate } from '@/lib/time';
import { sendWhatsApp } from '@/lib/notify';

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
            const start = new Date(lunchDate); start.setHours(0, 0, 0, 0);
            const end = new Date(lunchDate); end.setHours(23, 59, 59, 999);

            const existing = await Coupon.findOne({
                studentId,
                validForDate: { $gte: start, $lt: end },
                status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed'] }
            });
            if (existing) {
                return NextResponse.json({ message: `Already polled. Status: ${existing.status}` }, { status: 400 });
            }

            const settingsDoc = await SystemSettings.findOne({ date: { $gte: start, $lt: end } });
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
            if (user?.phone) {
                const dateStr = new Date(lunchDate).toLocaleDateString('en-IN');
                await sendWhatsApp(user.phone, `✋ Hi ${user.name}, your poll for ${mealType} on ${dateStr} is recorded! Pay ₹10 before 10:00 AM tomorrow to confirm your meal. 🍽️`);
            }

            return NextResponse.json({ message: 'Polled! Pay before 10:00 AM tomorrow to confirm.', coupon: newCoupon }, { status: 201 });
        }

        // ─── ACTION: pay_direct ────────────────────────────────────────────────────
        // Student polls AND pays immediately. Only allowed during polling window.
        if (action === 'pay_direct') {
            const { open, message: timeMsg } = isBookingOpen(userEmail);
            if (!open) return NextResponse.json({ message: timeMsg }, { status: 400 });

            const lunchDate = getNextLunchDate();
            const start = new Date(lunchDate); start.setHours(0, 0, 0, 0);
            const end = new Date(lunchDate); end.setHours(23, 59, 59, 999);

            const existing = await Coupon.findOne({
                studentId,
                validForDate: { $gte: start, $lt: end },
                status: { $in: ['active', 'redeemed', 'approved'] }
            });
            if (existing) {
                return NextResponse.json({ message: 'You already have a valid coupon for tomorrow.', coupon: existing }, { status: 200 });
            }

            const user = await User.findById(studentId);
            if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });
            if (user.walletBalance < 10) {
                return NextResponse.json({ message: 'Insufficient Wallet Balance (Required: ₹10)' }, { status: 400 });
            }

            user.walletBalance -= 10;
            await user.save();

            const settingsDoc = await SystemSettings.findOne({ date: { $gte: start, $lt: end } });
            const sideDishes = settingsDoc?.sideDishes || ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

            const code = Math.random().toString(36).substring(2, 10).toUpperCase();

            // Upgrade existing polled coupon if present, otherwise create new
            const polledExisting = await Coupon.findOne({ studentId, validForDate: { $gte: start, $lt: end }, status: 'polled' });
            let coupon;
            if (polledExisting) {
                polledExisting.status = 'active';
                polledExisting.code = code;
                polledExisting.mealType = mealType;
                polledExisting.sideDishes = sideDishes;
                polledExisting.amountPaid = 10;
                await polledExisting.save();
                coupon = polledExisting;
            } else {
                coupon = await Coupon.create({
                    code, studentId,
                    department: (session.user as any).department,
                    status: 'active',
                    validForDate: lunchDate,
                    originalOwnerId: studentId,
                    mealType, sideDishes,
                    amountPaid: 10,
                });
            }

            if (user?.phone) {
                const dateStr = new Date(lunchDate).toLocaleDateString('en-IN');
                await sendWhatsApp(user.phone, `🎉 Coupon confirmed! ${coupon.code} for ${mealType} on ${dateStr} is ACTIVE. 🍽️`);
            }

            return NextResponse.json({ message: 'Payment Successful! Coupon Active.', coupon }, { status: 201 });
        }

        // ─── ACTION: pay ───────────────────────────────────────────────────────────
        // Student pays for a previously polled coupon on meal day morning (6–10 AM).
        if (action === 'pay') {
            const { open, message: timeMsg } = isPaymentOpen(userEmail);
            if (!open) return NextResponse.json({ message: timeMsg }, { status: 400 });

            // On meal day morning, look for TODAY's polled coupon
            const todayDate = getTodayLunchDate();
            const start = new Date(todayDate); start.setHours(0, 0, 0, 0);
            const end = new Date(todayDate); end.setHours(23, 59, 59, 999);

            const existing = await Coupon.findOne({
                studentId,
                validForDate: { $gte: start, $lt: end },
                status: { $in: ['polled', 'approved'] }
            });
            if (!existing) {
                return NextResponse.json({ message: 'No polled coupon found for today. Did you poll yesterday?' }, { status: 404 });
            }

            const user = await User.findById(studentId);
            if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });
            if (user.walletBalance < 10) {
                return NextResponse.json({ message: 'Insufficient Wallet Balance (Required: ₹10)' }, { status: 400 });
            }

            user.walletBalance -= 10;
            await user.save();

            existing.status = 'active';
            existing.amountPaid = 10; // fix: ensure revenue is recorded correctly
            await existing.save();

            if (user?.phone) {
                const dateStr = new Date(existing.validForDate).toLocaleDateString('en-IN');
                await sendWhatsApp(user.phone, `✅ Payment verified! Coupon ${existing.code} for ${existing.mealType} on ${dateStr} is now ACTIVE! 🍽️`);
            }

            return NextResponse.json({ message: 'Payment Successful! Coupon Active.', coupon: existing });
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
