
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

        // 1. Financial Status / Revenue
        const coupons = await Coupon.find({
            validForDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['active', 'redeemed', 'expired', 'transferred'] }
        });

        const totalRevenue = coupons.length * 10;
        const redeemedCount = coupons.filter(c => c.status === 'redeemed').length;

        // 2. Department Breakdown
        const departments = ['cs', 'chemistry', 'commerce', 'history', 'economics', 'jmc'];
        const deptStats = await Promise.all(departments.map(async (dept) => {
            const count = await Coupon.countDocuments({
                department: dept,
                validForDate: { $gte: startDate, $lte: endDate },
                status: { $in: ['active', 'redeemed', 'expired', 'transferred'] }
            });
            const studentsCount = await User.countDocuments({ department: dept, role: 'student' });
            return {
                dept,
                coupons: count,
                revenue: count * 10,
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
                totalRevenue,
                totalCoupons: coupons.length,
                redeemedCount,
            },
            deptStats,
            admins
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
