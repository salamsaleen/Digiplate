
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import { getTodayLunchDate } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'super_admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'daily';

        await connectToDatabase();

        const todayLunch = getTodayLunchDate();

        let dateFilter: any = {};
        let startDate = new Date(todayLunch);
        let endDate = new Date(todayLunch);

        if (period === 'daily') {
            dateFilter = {
                validForDate: todayLunch,
                status: { $in: ['active', 'redeemed', 'expired', 'transferred'] }
            };
        } else {
            if (period === 'weekly') {
                startDate.setDate(todayLunch.getDate() - 7);
            } else if (period === 'monthly') {
                startDate.setDate(1);
            }
            dateFilter = {
                validForDate: { $gte: startDate, $lte: todayLunch },
                status: { $in: ['active', 'redeemed', 'expired', 'transferred'] }
            };
        }

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
