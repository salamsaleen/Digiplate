
import { NextResponse } from 'next/server';

// This route was used for the old Razorpay JS SDK modal flow.
// Payment is now handled via Cashfree Payment Links (qr-create + qr-status).
export async function POST() {
    return NextResponse.json(
        { message: 'This endpoint is deprecated. Use /api/payment/qr-create instead.' },
        { status: 410 }
    );
}
