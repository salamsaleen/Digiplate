import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Coupon from '@/models/Coupon';
import SystemTask from '@/models/SystemTask';
import { getNextLunchDate, getISTDate } from '@/lib/time';
import { sendWhatsApp } from '@/lib/notify';

export async function sendPollingReminders() {
    await connectToDatabase();

    const lunchDate = getNextLunchDate();
    const start = new Date(lunchDate); start.setHours(0, 0, 0, 0);
    const end = new Date(lunchDate); end.setHours(23, 59, 59, 999);

    // 1. Get IDs of students who already polled/booked
    const bookedStudents = await Coupon.find({
        validForDate: { $gte: start, $lt: end },
        status: { $in: ['polled', 'requested', 'approved', 'active', 'redeemed'] }
    }).distinct('studentId');

    // 2. Get all students not in that list
    const pendingStudents = await User.find({
        role: 'student',
        _id: { $nin: bookedStudents }
    }).select('name phone');

    // 3. Send reminders
    let sentCount = 0;
    for (const student of pendingStudents) {
        if (student.phone) {
            await sendWhatsApp(student.phone, `Reminder: 🔔 Hello ${student.name}, polling for tomorrow's meal is open until 8 PM. Don't forget to book your lunch on DigiPlate! 🍽️`);
            sentCount++;
        }
    }
    return sentCount;
}

export async function triggerAutomatedReminders() {
    const istDate = getISTDate();
    const hours = istDate.getHours();

    // Only trigger between 3 PM and 8 PM
    if (hours < 15 || hours >= 20) return;

    const todayDate = new Date(istDate);
    todayDate.setHours(0, 0, 0, 0);

    await connectToDatabase();

    // Check if already sent today
    const existing = await SystemTask.findOne({
        taskType: 'polling_reminder',
        date: todayDate
    });

    if (existing) {
        console.log('[AUTO-REMINDER] Already sent for today.');
        return;
    }

    console.log('[AUTO-REMINDER] Starting automated polling reminders...');
    try {
        const count = await sendPollingReminders();

        await SystemTask.create({
            taskType: 'polling_reminder',
            date: todayDate,
            status: 'success'
        });

        console.log(`[AUTO-REMINDER] SUCCESS: Sent to ${count} students.`);
    } catch (error) {
        console.error('[AUTO-REMINDER] FAILED:', error);
    }
}
