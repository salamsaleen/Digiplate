
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import SystemSettings from '@/models/SystemSettings';
import User from '@/models/User';
import { sendPushNotification } from '@/lib/notify';
import { getNextLunchDate, getTodayLunchDate } from '@/lib/time';
import { fetchPaymentLink } from '@/lib/cashfree';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;

        const { searchParams } = new URL(req.url);
        const linkId = searchParams.get('linkId');
        const mealType = searchParams.get('mealType') || 'Rice';

        if (!linkId) {
            return NextResponse.json({ message: 'Missing linkId' }, { status: 400 });
        }

        // Fetch the payment link status from Cashfree
        const link = await fetchPaymentLink(linkId);

        // 'PAID' means payment was successfully completed
        if (link.link_status !== 'PAID') {
            return NextResponse.json({ paid: false });
        }

        const paymentId = link.link_orders?.[0]?.order_id || 'unknown';

        // Generate coupon
        await connectToDatabase();

        // Determine the correct lunchDate:
        // If the student polled yesterday and is paying this morning, look for TODAY's coupon.
        // Otherwise fall back to next lunch date (Poll & Pay during polling window).
        const todayDate = getTodayLunchDate();
        const todayStart = new Date(todayDate); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayDate); todayEnd.setHours(23, 59, 59, 999);

        const todayPolled = await Coupon.findOne({
            studentId: user.id,
            validForDate: { $gte: todayStart, $lt: todayEnd },
            status: { $in: ['polled', 'approved'] }
        });

        const lunchDate = todayPolled ? todayDate : getNextLunchDate();
        const start = new Date(lunchDate); start.setHours(0, 0, 0, 0);
        const end = new Date(lunchDate); end.setHours(23, 59, 59, 999);

        const settings = await SystemSettings.findOne({ date: { $gte: start, $lt: end } });
        const sideDishes = settings?.sideDishes || ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

        const existing = await Coupon.findOne({
            studentId: user.id,
            validForDate: { $gte: start, $lt: end }
        });

        let coupon;
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        if (existing) {
            existing.status = 'active';
            existing.paymentId = paymentId;
            existing.orderId = linkId;
            existing.sideDishes = sideDishes;
            existing.amountPaid = 10;
            if (mealType) existing.mealType = mealType;
            await existing.save();
            coupon = existing;
        } else {
            coupon = await Coupon.create({
                code,
                studentId: user.id,
                department: user.department,
                status: 'active',
                validForDate: lunchDate,
                originalOwnerId: user.id,
                mealType,
                sideDishes,
                paymentId,
                orderId: linkId,
                amountPaid: 10,
            });
        }

        // Send WhatsApp Notification
        const student = await User.findById(user.id);
        if (student) {
            await sendPushNotification(student._id.toString(), '🎉 Coupon generated successfully!', 'Your meal is confirmed.');
        }

        return NextResponse.json({ paid: true, coupon });

    } catch (error: any) {
        console.error('[CASHFREE_QR_STATUS_ERROR]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
