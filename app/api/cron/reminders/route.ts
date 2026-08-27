import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/notify';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import connectToDatabase from '@/lib/db';
import { getNextLunchDate, getTodayLunchDate } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        const type = req.nextUrl.searchParams.get('type');
        
        if (type !== 'test_open' && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();

        if (type === 'test_open') {
            // 3:30 PM Test (Runs once on Aug 27, 2026)
            if (!new Date().toISOString().startsWith('2026-08-27')) {
                return NextResponse.json({ message: 'Skipped - not the target date.' });
            }
            const students = await User.find({ role: 'student' });
            let count = 0;
            for (const student of students) {
                await sendPushNotification(student._id.toString(), '🔔 Test: Polling is OPEN!', 'This is a test notification requested at 3:30 PM.');
                count++;
            }
            return NextResponse.json({ message: `Test polling reminder sent to ${count} students.` });
        }

        if (type === 'open') {
            // 3:00 PM: Send to all students
            const students = await User.find({ role: 'student' });
            
            // Run notifications in parallel to prevent Vercel 10-second timeout
            const pushPromises = students.map(student => 
                sendPushNotification(student._id.toString(), '🔔 Polling is now OPEN!', 'Book your meal for tomorrow.')
            );
            
            await Promise.allSettled(pushPromises);
            
            return NextResponse.json({ message: `Polling opened reminder sent to ${students.length} students.` });
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

        if (type === 'canteen_set_meal') {
            const canteenStaff = await User.find({ role: 'canteen_staff' });
            for (const staff of canteenStaff) {
                await sendPushNotification(staff._id.toString(), '🍽️ Reminder: Set tomorrow\'s meal!', 'Polling opens at 3:00 PM. Please set the meal status.');
            }
            return NextResponse.json({ message: 'Canteen meal reminder sent.' });
        }

        if (type === 'canteen_polled') {
            const todayDate = getTodayLunchDate();
            const start = new Date(todayDate); start.setHours(0, 0, 0, 0);
            const end = new Date(todayDate); end.setHours(23, 59, 59, 999);

            const count = await Coupon.countDocuments({
                validForDate: { $gte: start, $lt: end },
                status: { $in: ['polled', 'active', 'redeemed', 'approved'] }
            });

            const canteenStaff = await User.find({ role: 'canteen_staff' });
            for (const staff of canteenStaff) {
                await sendPushNotification(staff._id.toString(), '📊 Polling Update', `${count} students have polled for today.`);
            }
            return NextResponse.json({ message: `Canteen polled update sent: ${count}` });
        }

        if (type === 'canteen_confirmed') {
            const todayDate = getTodayLunchDate();
            const start = new Date(todayDate); start.setHours(0, 0, 0, 0);
            const end = new Date(todayDate); end.setHours(23, 59, 59, 999);

            const count = await Coupon.countDocuments({
                validForDate: { $gte: start, $lt: end },
                status: { $in: ['active', 'redeemed', 'approved'] }
            });

            const canteenStaff = await User.find({ role: 'canteen_staff' });
            for (const staff of canteenStaff) {
                await sendPushNotification(staff._id.toString(), '✅ Final Count Update', `${count} students have confirmed and paid for today.`);
            }
            return NextResponse.json({ message: `Canteen confirmed update sent: ${count}` });
        }

        if (type === 'canteen_missed_deadline') {
            // 3:05 PM: Check if they set tomorrow's menu. If not, notify them it's locked.
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const normalizedDate = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0));
            
            // Need to import SystemSettings
            const SystemSettings = (await import('@/models/SystemSettings')).default;
            const settings = await SystemSettings.findOne({ date: normalizedDate });

            if (!settings) {
                // They didn't save any settings, so it defaulted.
                const canteenStaff = await User.find({ role: 'canteen_staff' });
                for (const staff of canteenStaff) {
                    await sendPushNotification(
                        staff._id.toString(), 
                        '⚠️ Deadline Missed!', 
                        'Tomorrow\'s menu was automatically locked as Default (Rice). Polling has started.'
                    );
                }
                return NextResponse.json({ message: 'Missed deadline notification sent.' });
            }
            return NextResponse.json({ message: 'Menu was set. No missed deadline.' });
        }

        return NextResponse.json({ message: 'Invalid cron type' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
