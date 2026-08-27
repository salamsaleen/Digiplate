import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/notify';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import connectToDatabase from '@/lib/db';
import { getNextLunchDate, getTodayLunchDate } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const type = req.nextUrl.searchParams.get('type');
        await connectToDatabase();

        if (type === 'open') {
            // 3:00 PM: Send to all students
            const students = await User.find({ role: 'student' });
            let count = 0;
            for (const student of students) {
                await sendPushNotification(student._id.toString(), '🔔 Polling is now OPEN!', 'Book your meal for tomorrow.');
                count++;
            }
            return NextResponse.json({ message: `Polling opened reminder sent to ${count} students.` });
        }

        if (type === 'pay') {
            // 6:00 AM: Send to students who polled for today but haven't paid
            const todayDate = getTodayLunchDate();
            const start = new Date(todayDate); start.setHours(0, 0, 0, 0);
            const end = new Date(todayDate); end.setHours(23, 59, 59, 999);

            const unpaidCoupons = await Coupon.find({
                validForDate: { $gte: start, $lt: end },
                status: 'polled'
            });

            let count = 0;
            for (const coupon of unpaidCoupons) {
                await sendPushNotification(coupon.studentId.toString(), '⏰ Payment Reminder', 'Pay your ₹10 between 6:00 AM and 10:00 AM to get your coupon.');
                count++;
            }
            return NextResponse.json({ message: `Payment reminder sent to ${count} students.` });
        }

        return NextResponse.json({ message: 'Invalid cron type' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
