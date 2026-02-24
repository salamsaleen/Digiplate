
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'canteen_staff') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly

        await connectToDatabase();

        const now = new Date();
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (period === 'weekly') {
            startDate.setDate(now.getDate() - 7);
        } else if (period === 'monthly') {
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
        }

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        // 1. Financial Status
        const paidCoupons = await Coupon.find({
            validForDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }
        });

        const totalRevenue = paidCoupons.length * 10;
        const prepaidCount = paidCoupons.filter(c => c.status === 'active').length;

        // 2. Meal Served Status (Redeemed)
        const redeemedCoupons = await Coupon.find({
            redeemedAt: { $gte: startDate, $lte: endDate },
            status: 'redeemed'
        });

        // 3. Estimated Meal Status (Polled/Requested)
        const estimatedCount = await Coupon.countDocuments({
            validForDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed'] }
        });

        return NextResponse.json({
            period,
            startDate,
            endDate,
            summary: {
                totalRevenue,
                prepaidCount,
                redeemedCount: redeemedCoupons.length,
                estimatedCount
            },
            // Department breakdown for more detail
            deptStats: await Promise.all(['cs', 'chemistry', 'commerce', 'history', 'economics', 'jmc'].map(async (dept) => {
                const count = await Coupon.countDocuments({
                    department: dept,
                    validForDate: { $gte: startDate, $lte: endDate },
                    status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }
                });
                return { dept, count, revenue: count * 10 };
            }))
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
