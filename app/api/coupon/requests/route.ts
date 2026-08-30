
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import { getTodayLunchDate, getNextLunchDate } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'dept_admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();

        // Find coupons for this department with status 'requested'
        // We probably also want student details (populate)
        // Since models are separate files, we need to ensure User model is registered if we use populate
        // Or we can just manual fetch or assume User is registered by db.ts

        // Determine target date based on current IST time
        const now = new Date();
        const istHour = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).getUTCHours();
        const targetDate = istHour >= 15 ? getNextLunchDate() : getTodayLunchDate();

        const pendingCoupons = await Coupon.find({
            department: (session.user as any).department,
            status: 'requested',
            validForDate: targetDate
        }).populate('studentId', 'name email').sort({ createdAt: -1 });

        const polledCoupons = await Coupon.find({
            department: (session.user as any).department,
            status: { $in: ['polled', 'active', 'approved', 'redeemed', 'expired'] },
            validForDate: targetDate
        }).populate('studentId', 'name email').sort({ createdAt: -1 });

        const approvedCoupons = await Coupon.find({
            department: (session.user as any).department,
            status: { $in: ['approved', 'active', 'redeemed', 'expired'] },
            validForDate: targetDate
        }).populate('studentId', 'name email').sort({ createdAt: -1 });

        return NextResponse.json({ requests: pendingCoupons, polls: polledCoupons, approved: approvedCoupons });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
