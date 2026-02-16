import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Coupon from '@/models/Coupon';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';

// Also allow GET for easy triggering via browser
export async function GET(req: NextRequest) {
    return POST(req);
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Delete all Coupons (Resets Polling/Booking)
        await Coupon.deleteMany({});

        // 2. Reset Student Wallets to 500
        await User.updateMany({ role: 'student' }, { walletBalance: 500 });

        // 3. Keep SystemSettings (or reset if needed) - keeping them allows tomorrow's config
        // await SystemSettings.deleteMany({}); // Uncomment if you want to wipe settings too

        return NextResponse.json({ message: 'App data reset: Coupons cleared, Wallets reset to 500.' });
    } catch (error) {
        return NextResponse.json({ message: 'Error resetting data', error }, { status: 500 });
    }
}
