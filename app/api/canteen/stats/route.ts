
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import { getNextLunchDate } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'canteen_staff') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();
        const lunchDate = getNextLunchDate();

        // Count Polls
        const polledCount = await Coupon.countDocuments({
            validForDate: {
                $gte: new Date(new Date(lunchDate).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(lunchDate).setHours(23, 59, 59, 999))
            },
            status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed'] } // All positive intentions
        });

        // Count Redeemed
        const redeemedCount = await Coupon.countDocuments({
            redeemedAt: {
                $gte: new Date(new Date().setHours(0, 0, 0, 0)), // Redeemed TODAY
                $lt: new Date(new Date().setHours(23, 59, 59, 999))
            },
            status: 'redeemed'
        });

        // Count Paid Meals (Active + Redeemed today)
        // Students who paid but haven't eaten yet (Active) + Students who ate (Redeemed)
        // Note: 'Active' status coupons are valid for 'lunchDate' which is usually tomorrow/today depending on logic.
        // For simplicity, we count 'Active' coupons valid for 'lunchDate'.

        const activeCount = await Coupon.countDocuments({
            validForDate: {
                $gte: new Date(new Date(lunchDate).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(lunchDate).setHours(23, 59, 59, 999))
            },
            status: 'active'
        });

        // Paid Count = Active (Available to eat) + Redeemed (Eaten)
        // Note: redeemedCount above is checking 'redeemedAt' which is today. 
        // We should probably check 'validForDate' for consistency if we want "Meals for this slot".
        // But 'revenue' implies money collected. Money is collected when status becomes 'active'.
        // So Revenue = (Active + Redeemed + Transferred + Expired) * 10
        // Essentially any coupon for this date that isn't just 'polled' or 'requested'.

        const paidCouponsCount = await Coupon.countDocuments({
            validForDate: {
                $gte: new Date(new Date(lunchDate).setHours(0, 0, 0, 0)),
                $lt: new Date(new Date(lunchDate).setHours(23, 59, 59, 999))
            },
            status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }
        });

        const revenue = paidCouponsCount * 10;

        return NextResponse.json({ polledCount, redeemedCount, paidCount: paidCouponsCount, revenue });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
