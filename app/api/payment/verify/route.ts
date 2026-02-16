
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import SystemSettings from '@/models/SystemSettings';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectToDatabase();
        const user = session.user as any;
        const body = await req.json();

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mealType } = body;

        // Verify Signature
        const text = razorpay_order_id + '|' + razorpay_payment_id;
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(text.toString())
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ message: 'Payment verification failed' }, { status: 400 });
        }

        // Payment Verified - Generate/Activate Coupon

        // Find existing coupon for "Tomorrow" (or specified date?)
        // Assuming "Tomorrow" for now as per dashboard logic
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const lunchDate = tomorrow; // Keep time logic separate if needed

        const start = new Date(lunchDate); start.setHours(0, 0, 0, 0);
        const end = new Date(lunchDate); end.setHours(23, 59, 59, 999);

        // Fetch Settings for Side Dishes
        const settings = await SystemSettings.findOne({ date: { $gte: start, $lt: end } });
        const sideDishes = settings ? settings.sideDishes : ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

        const existing = await Coupon.findOne({
            studentId: user.id,
            validForDate: { $gte: start, $lt: end }
        });

        let coupon;
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        if (existing) {
            // Update existing (e.g. from polled -> active)
            existing.status = 'active';
            existing.paymentId = razorpay_payment_id;
            existing.orderId = razorpay_order_id;
            existing.sideDishes = sideDishes;
            if (mealType) existing.mealType = mealType;
            // Ensure unique code if older one was stale? Or keep existing?
            // Usually simpler to just update status.
            await existing.save();
            coupon = existing;
        } else {
            // Create New
            coupon = await Coupon.create({
                code,
                studentId: user.id,
                department: user.department,
                status: 'active',
                validForDate: lunchDate,
                originalOwnerId: user.id,
                mealType: mealType || 'Rice',
                sideDishes: sideDishes,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id
            });
        }

        return NextResponse.json({
            message: 'Payment verified and coupon generated',
            coupon
        });

    } catch (error: any) {
        console.error('Payment Verification Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
