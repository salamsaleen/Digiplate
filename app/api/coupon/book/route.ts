
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import SystemSettings from '@/models/SystemSettings';
import User from '@/models/User';
import { isBookingOpen, getNextLunchDate } from '@/lib/time';
import { sendWhatsApp } from '@/lib/notify';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();
        const body = await req.json();
        const action = body.action || 'poll'; // 'poll', 'pay_direct', 'pay'
        const mealType = body.mealType || 'Rice';

        const studentId = (session.user as any).id;
        const userEmail = (session.user as any).email;
        const lunchDate = getNextLunchDate();

        const existing = await Coupon.findOne({
            studentId: studentId,
            validForDate: {
                $gte: new Date(new Date(lunchDate).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(lunchDate).setHours(23, 59, 59, 999))
            },
            status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed'] }
        });

        if (action === 'poll' || action === 'pay_direct') {
            const { open, message: timeMsg } = isBookingOpen(userEmail);
            if (!open) {
                return NextResponse.json({ message: timeMsg }, { status: 400 });
            }
        }

        if (action === 'poll') {
            if (existing) {
                return NextResponse.json({ message: `Already polled/requested. Status: ${existing.status}` }, { status: 400 });
            }
            // Get System Settings for the date
            const settingsStartDate = new Date(lunchDate);
            settingsStartDate.setHours(0, 0, 0, 0);
            const settingsEndDate = new Date(lunchDate);
            settingsEndDate.setHours(23, 59, 59, 999);

            const settings = await SystemSettings.findOne({
                date: { $gte: settingsStartDate, $lt: settingsEndDate }
            });
            const sideDishes = settings ? settings.sideDishes : ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

            // Create Poll Entry
            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const newCoupon = await Coupon.create({
                code,
                studentId,
                department: (session.user as any).department,
                status: 'polled',
                validForDate: lunchDate,
                originalOwnerId: studentId,
                mealType,
                sideDishes
            });

            // Send WhatsApp Notification for Poll
            const user = await User.findById(studentId);
            if (user && user.phone) {
                const dateStr = new Date(lunchDate).toLocaleDateString();
                await sendWhatsApp(user.phone, `Hi ${user.name}, your poll for ${mealType} on ${dateStr} has been recorded! Pay ₹10 to confirm your meal. 🍽️`);
            }

            return NextResponse.json({ message: 'Polled successfully!', coupon: newCoupon }, { status: 201 });

        } else if (action === 'pay_direct') {
            if (existing) {
                if (existing.status === 'active' || existing.status === 'redeemed' || existing.status === 'approved') {
                    return NextResponse.json({ message: 'You already have a valid coupon for tomorrow.', coupon: existing }, { status: 200 });
                }
            }

            const user = await User.findById(studentId);
            if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

            if (user.walletBalance < 10) {
                return NextResponse.json({ message: 'Insufficient Wallet Balance (Required: ₹10)' }, { status: 400 });
            }

            user.walletBalance -= 10;
            await user.save();

            const code = Math.random().toString(36).substring(2, 10).toUpperCase();
            const settingsStartDate = new Date(lunchDate);
            settingsStartDate.setHours(0, 0, 0, 0);
            const settingsEndDate = new Date(lunchDate);
            settingsEndDate.setHours(23, 59, 59, 999);

            const settings = await SystemSettings.findOne({
                date: { $gte: settingsStartDate, $lt: settingsEndDate }
            });
            const sideDishes = settings ? settings.sideDishes : ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

            let coupon;
            if (existing) {
                existing.status = 'active';
                existing.code = code;
                existing.mealType = mealType;
                existing.sideDishes = sideDishes;
                await existing.save();
                coupon = existing;
            } else {
                coupon = await Coupon.create({
                    code,
                    studentId,
                    department: (session.user as any).department,
                    status: 'active',
                    validForDate: lunchDate,
                    originalOwnerId: studentId,
                    mealType,
                    sideDishes
                });
            }

            // Send WhatsApp Notification for Payment/Coupon
            if (user && user.phone) {
                const dateStr = new Date(lunchDate).toLocaleDateString();
                await sendWhatsApp(user.phone, `Success! 🎉 Your payment is verified. Coupon ${coupon.code} for ${mealType} on ${dateStr} is now ACTIVE. Download it from your dashboard. 🍽️`);
            }

            return NextResponse.json({ message: 'Payment Successful! Coupon Active.', coupon }, { status: 201 });

        } else if (action === 'pay') {
            if (!existing) {
                return NextResponse.json({ message: 'No polled/approved coupon found for this date.' }, { status: 404 });
            }
            if (existing.status !== 'approved' && existing.status !== 'polled') {
                return NextResponse.json({ message: `Coupon is ${existing.status}, cannot pay.` }, { status: 400 });
            }

            const user = await User.findById(studentId);
            if (user.walletBalance < 10) {
                return NextResponse.json({ message: 'Insufficient Wallet Balance' }, { status: 400 });
            }
            user.walletBalance -= 10;
            await user.save();

            existing.status = 'active';
            await existing.save();

            // Send WhatsApp Notification
            if (user && user.phone) {
                const dateStr = new Date(existing.validForDate).toLocaleDateString();
                await sendWhatsApp(user.phone, `Success! 🎉 Your payment for ${existing.mealType || 'Lunch'} on ${dateStr} is verified. Coupon ${existing.code} is now ACTIVE! 🍽️`);
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
