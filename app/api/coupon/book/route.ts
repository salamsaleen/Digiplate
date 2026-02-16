
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import SystemSettings from '@/models/SystemSettings';
import User from '@/models/User';
import { isBookingOpen, getNextLunchDate } from '@/lib/time';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'student') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { open, message: timeMsg } = isBookingOpen();
        if (!open) {
            return NextResponse.json({ message: timeMsg }, { status: 400 });
        }

        await connectToDatabase();
        const body = await req.json();
        const action = body.action || 'poll'; // 'poll', 'request', 'pay'
        const mealType = body.mealType || 'Rice';

        const studentId = (session.user as any).id;
        const lunchDate = getNextLunchDate();

        const existing = await Coupon.findOne({
            studentId: studentId,
            validForDate: {
                $gte: new Date(new Date(lunchDate).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(lunchDate).setHours(23, 59, 59, 999))
            },
            status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed'] }
        });

        if (action === 'poll') {
            if (existing) {
                return NextResponse.json({ message: `Already polled/requested. Status: ${existing.status}` }, { status: 400 });
            }
            // Get System Settings for the date (ignoring time via range)
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
            return NextResponse.json({ message: 'Polled successfully!', coupon: newCoupon }, { status: 201 });
        } else if (action === 'pay_direct') {
            // New Flow: User Polls and Pays immediately.

            // Check if already has an ACTIVE or REDEEMED coupon
            if (existing) {
                if (existing.status === 'active' || existing.status === 'redeemed' || existing.status === 'approved') {
                    return NextResponse.json({ message: 'You already have a valid coupon for tomorrow.', coupon: existing }, { status: 400 });
                }
            }

            // Wallet Check & Deduction
            const user = await User.findById(studentId);
            if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

            if (user.walletBalance < 10) {
                return NextResponse.json({ message: 'Insufficient Wallet Balance (Required: ₹10)' }, { status: 400 });
            }

            // Deduct & Create/Update
            user.walletBalance -= 10;
            await user.save();

            const code = Math.random().toString(36).substring(2, 10).toUpperCase();

            // Get System Settings for the date (ignoring time via range) to include side dishes
            const settingsStartDate = new Date(lunchDate);
            settingsStartDate.setHours(0, 0, 0, 0);
            const settingsEndDate = new Date(lunchDate);
            settingsEndDate.setHours(23, 59, 59, 999);

            const settings = await SystemSettings.findOne({
                date: { $gte: settingsStartDate, $lt: settingsEndDate }
            });

            require('fs').appendFileSync('debug_api_log.txt', `[BOOK POLL] Settings Found: ${!!settings}, SideDishes: ${JSON.stringify(settings?.sideDishes)}\n`);

            const sideDishes = settings ? settings.sideDishes : ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

            // If existing 'polled' entry exists, update it. If not, create new.
            let coupon;
            if (existing) {
                existing.status = 'active';
                // existing.code = code; // Keep original code? Or regenerate? Let's regenerate to be safe/fresh.
                existing.code = code;
                existing.mealType = mealType;
                existing.sideDishes = sideDishes; // Update sides
                await existing.save();
                coupon = existing;
            } else {
                coupon = await Coupon.create({
                    code,
                    studentId,
                    department: (session.user as any).department,
                    status: 'active', // Direct to Active
                    validForDate: lunchDate,
                    originalOwnerId: studentId,
                    mealType,
                    sideDishes // Include sides
                });
            }

            return NextResponse.json({ message: 'Payment Successful! Coupon Active.', coupon }, { status: 201 });

        } else if (action === 'pay') {
            // User wants to pay for an APPROVED coupon
            if (!existing) {
                return NextResponse.json({ message: 'No APPROVED coupon found for this date.' }, { status: 404 });
            }
            if (existing.status !== 'approved') {
                return NextResponse.json({ message: `Coupon is ${existing.status}, cannot pay.` }, { status: 400 });
            }

            // Handle Payment Logic (Deduct 10)
            const user = await User.findById(studentId);
            if (user.walletBalance < 10) {
                return NextResponse.json({ message: 'Insufficient Wallet Balance' }, { status: 400 });
            }
            user.walletBalance -= 10;
            await user.save();

            // Activate Coupon
            existing.status = 'active';
            await existing.save();

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

    // Get latest coupon (active, requested, or approved, or POLLED)
    const coupon = await Coupon.findOne({
        studentId,
        status: { $in: ['active', 'requested', 'approved', 'polled'] }
    }).sort({ validForDate: -1 });

    return NextResponse.json({ coupon });
}
