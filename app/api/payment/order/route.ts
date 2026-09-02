import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isBookingOpen, isPaymentOpen, getNextLunchDate, getTodayLunchDate } from '@/lib/time';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import { createOrder } from '@/lib/cashfree';

export async function POST(req: NextRequest) {
    try {
        console.log('[CASHFREE_ORDER_CREATE_START]');
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        await connectToDatabase();

        // ── Determine which flow this is ──────────────────────────────────────────
        // Flow A: Student has a polled coupon for TODAY and is paying on meal morning
        // Flow B: Student is doing Poll & Pay during polling window (no prior poll)

        const todayDate = getTodayLunchDate();
        const todayStart = new Date(todayDate); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayDate); todayEnd.setHours(23, 59, 59, 999);

        const todayPolled = await Coupon.findOne({
            studentId: user.id,
            validForDate: { $gte: todayStart, $lt: todayEnd },
            status: { $in: ['polled', 'approved'] }
        });

        let lunchDate: Date;

        if (todayPolled) {
            // Flow A: paying for today's meal (morning payment window)
            const { open, message: timeMsg } = isPaymentOpen(user.email);
            if (!open) {
                return NextResponse.json({ message: timeMsg }, { status: 400 });
            }
            lunchDate = todayDate;
            console.log('[CASHFREE_ORDER_CREATE] Flow A — morning payment for today\'s polled coupon');
        } else {
            // Flow B: Poll & Pay during polling window (tonight for tomorrow)
            const { open, message: timeMsg } = isBookingOpen(user.email);
            if (!open) {
                return NextResponse.json({ message: timeMsg }, { status: 400 });
            }
            lunchDate = getNextLunchDate();
            console.log('[CASHFREE_ORDER_CREATE] Flow B — poll & pay during polling window');
        }

        if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
            return NextResponse.json({ message: 'Cashfree API Keys missing in server config' }, { status: 500 });
        }

        // Base URL — dynamically adapts to Vercel production or localhost
        let baseUrl = 'http://localhost:3000';
        if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
            baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
        } else if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`;
        } else if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
            baseUrl = process.env.NEXTAUTH_URL;
        }

        // Unique order ID
        const orderId = `digiplate-${user.id}-${Date.now()}`;

        // Cashfree requires a valid 10-digit Indian mobile number (starts with 6–9)
        let cleanPhone = (user.phone || '').replace(/\D/g, '');
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
        const isValidIndianMobile = cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone);
        if (!isValidIndianMobile) cleanPhone = '9876543210'; // safe test fallback

        // Cashfree rejects names with parentheses or special characters — strip them
        const cleanName = (user.name || 'Student')
            .replace(/[^a-zA-Z\s]/g, '')  // remove anything that's not a letter or space
            .replace(/\s+/g, ' ')          // collapse multiple spaces
            .trim() || 'Student';

        console.log('[CASHFREE_ORDER_CREATE] Creating payment order for:', user.email);

        const { orderId: createdOrderId, paymentSessionId } = await createOrder({
            orderId,
            amount: 10,
            customerName: cleanName,
            customerEmail: user.email || '',
            customerPhone: cleanPhone,
            returnUrl: `${baseUrl}/verify-payment?cf_order_status=PAYMENT_COMPLETED&order_id={order_id}`,
        });

        return NextResponse.json({ orderId: createdOrderId, paymentSessionId, amount: 10 });

    } catch (error: any) {
        console.error('[CASHFREE_ORDER_CREATE_ERROR]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
