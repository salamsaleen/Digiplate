
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import SystemSettings from '@/models/SystemSettings';
import User from '@/models/User';
import { sendWhatsApp } from '@/lib/notify';
import { isBookingOpen } from '@/lib/time';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;

        const { searchParams } = new URL(req.url);
        const paymentLinkId = searchParams.get('paymentLinkId');
        const mealType = searchParams.get('mealType') || 'Rice';

        if (!paymentLinkId) {
            return NextResponse.json({ message: 'Missing paymentLinkId' }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        // Fetch the payment link status from Razorpay
        const link = await (razorpay as any).paymentLink.fetch(paymentLinkId);

        // 'paid' status means payment was successfully completed
        if (link.status !== 'paid') {
            return NextResponse.json({ paid: false });
        }

        const paymentId = link.payments?.[0]?.payment_id || 'unknown';

        // Generate coupon
        await connectToDatabase();

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const start = new Date(tomorrow); start.setHours(0, 0, 0, 0);
        const end = new Date(tomorrow); end.setHours(23, 59, 59, 999);

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
            existing.sideDishes = sideDishes;
            if (mealType) existing.mealType = mealType;
            await existing.save();
            coupon = existing;
        } else {
            coupon = await Coupon.create({
                code,
                studentId: user.id,
                department: user.department,
                status: 'active',
                validForDate: tomorrow,
                originalOwnerId: user.id,
                mealType,
                sideDishes,
                paymentId,
            });
        }

        // Send WhatsApp Notification
        const student = await User.findById(user.id);
        if (student && student.phone) {
            const dateStr = new Date(tomorrow).toLocaleDateString();
            await sendWhatsApp(student.phone, `Success! 💳 Your UPI payment of ₹10 is verified. Coupon ${coupon.code} for ${mealType} on ${dateStr} is now ACTIVE! 🍽️`);
        }

        return NextResponse.json({ paid: true, coupon });

    } catch (error: any) {
        console.error('[QR STATUS ERROR]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
