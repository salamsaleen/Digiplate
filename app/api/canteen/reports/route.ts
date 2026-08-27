
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
        const period = searchParams.get('period') || 'daily';

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

        const paidFilter = {
            validForDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['active', 'redeemed', 'transferred', 'expired'] }
        };

        // 1. Financial Status — use real amountPaid aggregation
        const financialAgg = await Coupon.aggregate([
            { $match: paidFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', 10] } },
                    prepaidCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    }
                }
            }
        ]);

        const financial = financialAgg[0] || { totalRevenue: 0, prepaidCount: 0 };

        // 2. Redeemed count
        const redeemedAgg = await Coupon.aggregate([
            {
                $match: {
                    redeemedAt: { $gte: startDate, $lte: endDate },
                    status: 'redeemed'
                }
            },
            { $group: { _id: null, count: { $sum: 1 } } }
        ]);
        const redeemedCount = redeemedAgg[0]?.count || 0;

        // 3. Estimated meal count
        const estimatedCount = await Coupon.countDocuments({
            validForDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed'] }
        });

        // 4. Department Breakdown — use real amountPaid aggregation
        const departments = ['cs', 'chemistry', 'commerce', 'history', 'economics', 'jmc'];
        const deptStats = await Promise.all(departments.map(async (dept) => {
            const agg = await Coupon.aggregate([
                { $match: { ...paidFilter, department: dept } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        revenue: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', 10] } }
                    }
                }
            ]);
            return {
                dept,
                count: agg[0]?.count || 0,
                revenue: agg[0]?.revenue || 0
            };
        }));

        return NextResponse.json({
            period,
            startDate,
            endDate,
            summary: {
                totalRevenue: financial.totalRevenue,
                prepaidCount: financial.prepaidCount,
                redeemedCount,
                estimatedCount
            },
            deptStats
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
