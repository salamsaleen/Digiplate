export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import { getNextLunchDate, getTodayLunchDate } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'canteen_staff') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();
        
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffset);
        
        const todayLunchDate = getTodayLunchDate();
        const nextLunchDate = getNextLunchDate();

        // Exact match bounds for validForDate to avoid cross-day timezone collisions
        const todayStartUTC = new Date(todayLunchDate);
        const todayEndUTC = new Date(todayLunchDate.getTime() + 24 * 60 * 60 * 1000);

        const tomorrowStartUTC = new Date(nextLunchDate);
        const tomorrowEndUTC = new Date(nextLunchDate.getTime() + 24 * 60 * 60 * 1000);

        // -- TODAY STATS --
        // Estimated = polled/approved + paid (active, redeemed, expired). Transferred is ignored to avoid double counting.
        const todayPolledCount = await Coupon.countDocuments({
            validForDate: { $gte: todayStartUTC, $lt: todayEndUTC },
            status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed', 'expired'] }
        });

        const todayRedeemedCount = await Coupon.countDocuments({
            validForDate: { $gte: todayStartUTC, $lt: todayEndUTC },
            status: 'redeemed'
        });

        const todayPaidCouponsCount = await Coupon.countDocuments({
            validForDate: { $gte: todayStartUTC, $lt: todayEndUTC },
            status: { $in: ['active', 'redeemed', 'expired'] }
        });
        const todayRevenue = todayPaidCouponsCount * 10;

        // -- TOMORROW STATS --
        const tomorrowPolledCount = await Coupon.countDocuments({
            validForDate: { $gte: tomorrowStartUTC, $lt: tomorrowEndUTC },
            status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed', 'expired'] }
        });

        const tomorrowRedeemedCount = await Coupon.countDocuments({
            validForDate: { $gte: tomorrowStartUTC, $lt: tomorrowEndUTC },
            status: 'redeemed'
        });

        const tomorrowPaidCouponsCount = await Coupon.countDocuments({
            validForDate: { $gte: tomorrowStartUTC, $lt: tomorrowEndUTC },
            status: { $in: ['active', 'redeemed', 'expired'] }
        });
        const tomorrowRevenue = tomorrowPaidCouponsCount * 10;

        return NextResponse.json({
            today: {
                date: todayLunchDate,
                polledCount: todayPolledCount,
                redeemedCount: todayRedeemedCount,
                paidCount: todayPaidCouponsCount,
                revenue: todayRevenue
            },
            tomorrow: {
                date: nextLunchDate,
                polledCount: tomorrowPolledCount,
                redeemedCount: tomorrowRedeemedCount,
                paidCount: tomorrowPaidCouponsCount,
                revenue: tomorrowRevenue
            }
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
