
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isBookingOpen, isPaymentOpen, getNextLunchDate, getTodayLunchDate } from '@/lib/time';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import { createPaymentLink } from '@/lib/cashfree';

export async function POST(req: NextRequest) {
    try {
        console.log('[CASHFREE_QR_CREATE_START]');
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
            console.log('[CASHFREE_QR_CREATE] Flow A — morning payment for today\'s polled coupon');
        } else {
            // Flow B: Poll & Pay during polling window (tonight for tomorrow)
            const { open, message: timeMsg } = isBookingOpen(user.email);
            if (!open) {
                return NextResponse.json({ message: timeMsg }, { status: 400 });
            }
            lunchDate = getNextLunchDate();
            console.log('[CASHFREE_QR_CREATE] Flow B — poll & pay during polling window');
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

        // Payment link expires in 30 minutes (IST formatted)
        const expiryIST = new Date(Date.now() + 30 * 60 * 1000 + 5.5 * 60 * 60 * 1000);
        const expiryTime = expiryIST.toISOString().split('.')[0] + '+05:30';

        // Unique link ID
        const linkId = `digiplate-${user.id}-${Date.now()}`;

        // Cashfree requires a strict 10-digit phone
        let cleanPhone = (user.phone || '').replace(/\D/g, '');
        if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
        if (cleanPhone.length !== 10) cleanPhone = '9999999999';

        console.log('[CASHFREE_QR_CREATE] Creating payment link for:', user.email);

        const { linkId: createdLinkId, linkUrl } = await createPaymentLink({
            linkId,
            amount: 10,
            purpose: 'DigiPlate Meal Coupon – ₹10',
            customerName: user.name || 'Student',
            customerEmail: user.email || '',
            customerPhone: cleanPhone,
            expiryTime,
            returnUrl: `${baseUrl}/dashboard?cf_link_status=PAID&link_id=${linkId}`,
        });

        return NextResponse.json({ linkId: createdLinkId, linkUrl, amount: 10 });

    } catch (error: any) {
        console.error('[CASHFREE_QR_CREATE_ERROR]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
