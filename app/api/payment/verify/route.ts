
import { NextResponse } from 'next/server';

// This route was used for Razorpay signature verification (old modal flow).
// Verification is now done via Cashfree payment link status (qr-status route).
export async function POST() {
    return NextResponse.json(
        { message: 'This endpoint is deprecated. Use /api/payment/qr-status instead.' },
        { status: 410 }
    );
}
