export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import { getTodayLunchDate, getNextLunchDate } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'super_admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();

        // Count Total Students
        const totalStudents = await User.countDocuments({ role: 'student' });

        const todayLunch = getTodayLunchDate();
        const tomorrowLunch = getNextLunchDate();

        // Exact match bounds for validForDate to avoid cross-day timezone collisions
        const todayStartUTC = new Date(todayLunch);
        const todayEndUTC = new Date(todayLunch.getTime() + 24 * 60 * 60 * 1000);

        const tomorrowStartUTC = new Date(tomorrowLunch);
        const tomorrowEndUTC = new Date(tomorrowLunch.getTime() + 24 * 60 * 60 * 1000);

        // Count Redeemed Today (Redeemed status, for today's meal)
        const redeemedToday = await Coupon.countDocuments({
            status: 'redeemed',
            validForDate: { $gte: todayStartUTC, $lt: todayEndUTC }
        });

        // Polled Today (unpaid for today)
        const polledToday = await Coupon.countDocuments({
            status: { $in: ['polled', 'requested', 'approved'] },
            validForDate: { $gte: todayStartUTC, $lt: todayEndUTC }
        });

        // Polled Tomorrow (unpaid for tomorrow)
        const polledTomorrow = await Coupon.countDocuments({
            status: { $in: ['polled', 'requested', 'approved'] },
            validForDate: { $gte: tomorrowStartUTC, $lt: tomorrowEndUTC }
        });

        // Paid Today (active, redeemed, expired for today - ignoring transferred to prevent double count)
        const paidToday = await Coupon.countDocuments({
            validForDate: { $gte: todayStartUTC, $lt: todayEndUTC },
            status: { $in: ['active', 'redeemed', 'expired'] }
        });

        // Paid Tomorrow
        const paidTomorrow = await Coupon.countDocuments({
            validForDate: { $gte: tomorrowStartUTC, $lt: tomorrowEndUTC },
            status: { $in: ['active', 'redeemed', 'expired'] }
        });

        // Monthly Revenue Logic
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0); // Last day of month
        endOfMonth.setHours(23, 59, 59, 999);

        const monthlyPaidCount = await Coupon.countDocuments({
            validForDate: { $gte: startOfMonth, $lt: endOfMonth },
            status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }
        });

        const revenue = paidToday * 10;
        const monthlyRevenue = monthlyPaidCount * 10;

        return NextResponse.json({
            totalStudents,
            polledToday,
            polledTomorrow,
            paidToday,
            paidTomorrow,
            redeemedToday,
            revenue,
            monthlyRevenue
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
