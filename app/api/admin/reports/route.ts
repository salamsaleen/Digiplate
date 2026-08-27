
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

        const dateFilter = {
            validForDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['active', 'redeemed', 'expired', 'transferred'] }
        };

        // 1. Financial Summary — use real amountPaid aggregation
        const financialAgg = await Coupon.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', 10] } },
                    totalCoupons: { $sum: 1 },
                    redeemedCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'redeemed'] }, 1, 0] }
                    }
                }
            }
        ]);

        const summary = financialAgg[0] || { totalRevenue: 0, totalCoupons: 0, redeemedCount: 0 };

        // 2. Department Breakdown — use real amountPaid aggregation
        const departments = ['cs', 'chemistry', 'commerce', 'history', 'economics', 'jmc'];
        const deptStats = await Promise.all(departments.map(async (dept) => {
            const agg = await Coupon.aggregate([
                { $match: { ...dateFilter, department: dept } },
                {
                    $group: {
                        _id: null,
                        coupons: { $sum: 1 },
                        revenue: { $sum: { $cond: [{ $gt: ['$amountPaid', 0] }, '$amountPaid', 10] } }
                    }
                }
            ]);
            const studentsCount = await User.countDocuments({ department: dept, role: 'student' });
            return {
                dept,
                coupons: agg[0]?.coupons || 0,
                revenue: agg[0]?.revenue || 0,
                students: studentsCount
            };
        }));

        // 3. Admin / Staff List
        const admins = await User.find({ role: { $in: ['dept_admin', 'super_admin', 'canteen_staff'] } })
            .select('name email role department');

        return NextResponse.json({
            period,
            startDate,
            endDate,
            summary: {
                totalRevenue: summary.totalRevenue,
                totalCoupons: summary.totalCoupons,
                redeemedCount: summary.redeemedCount,
            },
            deptStats,
            admins
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
