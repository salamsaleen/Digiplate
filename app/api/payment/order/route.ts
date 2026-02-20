
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        console.log('[VERIFIED_ORDER_START]');
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        console.log('[PAYMENT ORDER] Request received for user:', session.user?.email);


        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('Razorpay Keys Missing');
            return NextResponse.json({ message: 'Razorpay API Keys are missing in server config' }, { status: 500 });
        }

        console.log('[VERIFIED_ORDER_BEFORE_RAZORPAY]');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        console.log('[PAYMENT ORDER] KeyID present:', !!process.env.RAZORPAY_KEY_ID, 'Secret present:', !!process.env.RAZORPAY_KEY_SECRET);

        // Amount is in smallest currency unit (paise for INR)
        // ₹10 = 1000 paise
        const options = {
            amount: 1000,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json(order);
    } catch (error: any) {
        console.error('[PAYMENT ORDER ERROR]', error.message);
        console.error('Razorpay Order Error:', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
