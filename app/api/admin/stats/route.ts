
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Coupon from '@/models/Coupon';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'super_admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();

        // Count Total Students
        const totalStudents = await User.countDocuments({ role: 'student' });

        // Count Redeemed Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const activeCoupons = await Coupon.countDocuments({
            status: 'active',
            validForDate: { $gte: startOfDay, $lt: endOfDay }
        });

        const redeemedToday = await Coupon.countDocuments({
            status: 'redeemed',
            redeemedAt: { $gte: startOfDay, $lt: endOfDay }
        });

        // Revenue & Paid Count Logic (Same as Canteen, but Global)
        // We can just count all active/redeemed/transferred/expired coupons created or valid for today.
        // Let's stick to validForDate = today for "Revenue for Today's Meal".

        const paidCouponsCount = await Coupon.countDocuments({
            validForDate: { $gte: startOfDay, $lt: endOfDay },
            status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }
        });

        // Monthly Revenue Logic
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyPaidCount = await Coupon.countDocuments({
            validForDate: { $gte: startOfMonth, $lt: endOfDay },
            status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }
        });

        const revenue = paidCouponsCount * 10;
        const monthlyRevenue = monthlyPaidCount * 10;

        return NextResponse.json({
            totalStudents,
            activeCoupons,
            redeemedToday,
            paidCount: paidCouponsCount,
            revenue,
            monthlyRevenue
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
