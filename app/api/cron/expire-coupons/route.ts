import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import User from '@/models/User';
import { getTodayLunchDate } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        
        // Vercel cron auth
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        // Get today's start and end boundaries
        const todayDate = getTodayLunchDate();
        const start = new Date(todayDate); start.setHours(0, 0, 0, 0);
        const end = new Date(todayDate); end.setHours(23, 59, 59, 999);

        // Find test student to exclude them from expiration
        const testStudent = await User.findOne({ email: 'teststudent@digiplate.com' });
        const query: any = {
            validForDate: { $gte: start, $lt: end },
            status: { $in: ['polled', 'requested', 'approved', 'active'] }
        };

        if (testStudent) {
            query.studentId = { $ne: testStudent._id };
        }

        // Find and update unused coupons
        const result = await Coupon.updateMany(
            query,
            {
                $set: { status: 'expired' }
            }
        );

        return NextResponse.json({ 
            message: `Successfully expired ${result.modifiedCount} unused coupons for today.`,
            count: result.modifiedCount
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
