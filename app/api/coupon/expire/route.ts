import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import { getISTDate } from '@/lib/time';

/**
 * POST /api/coupon/expire
 *
 * Called silently on every dashboard load.
 * 1. Deletes all 'polled' coupons for TODAY if IST time >= 10:00 AM (missed payment window)
 * 2. Marks all 'active' coupons for TODAY as 'expired' if IST time >= 3:00 PM
 */
export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();

        const istNow = getISTDate();
        const istHours = istNow.getHours();

        // Build today's date range in UTC (aligned to IST midnight)
        const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
        const istToday = new Date(istMs);
        istToday.setUTCHours(0, 0, 0, 0);
        const todayStart = new Date(istToday.getTime() - 5.5 * 60 * 60 * 1000);
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        let deletedPolls = 0;
        let expiredCoupons = 0;

        // ── 1. Delete unpaid polls if payment window has passed (>= 10:00 AM IST) ──
        if (istHours >= 10) {
            const result = await Coupon.deleteMany({
                validForDate: { $gte: todayStart, $lt: todayEnd },
                status: 'polled'
            });
            deletedPolls = result.deletedCount;
            if (deletedPolls > 0) {
                console.log(`[EXPIRE] Deleted ${deletedPolls} unpaid poll(s) for today (past 10:00 AM)`);
            }
        }

        // ── 2. Expire active coupons if lunch time has passed (>= 3:00 PM IST) ──
        if (istHours >= 15) {
            const result = await Coupon.updateMany(
                {
                    validForDate: { $gte: todayStart, $lt: todayEnd },
                    status: 'active'
                },
                { $set: { status: 'expired' } }
            );
            expiredCoupons = result.modifiedCount;
            if (expiredCoupons > 0) {
                console.log(`[EXPIRE] Expired ${expiredCoupons} active coupon(s) for today (past 3:00 PM)`);
            }
        }

        return NextResponse.json({ deletedPolls, expiredCoupons });
    } catch (error: any) {
        console.error('[EXPIRE_ERROR]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
