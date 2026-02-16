
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'canteen_staff') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { code, action } = await req.json(); // action: 'validate' or 'redeem'
        if (!code) return NextResponse.json({ message: 'Code required' }, { status: 400 });

        await connectToDatabase();

        // Populate student details to show Name/Dept upon validation
        // Need to ensure User model is available for population (it's imported above)
        const coupon = await Coupon.findOne({ code }).populate('studentId', 'name department email');

        if (!coupon) {
            return NextResponse.json({ message: 'Invalid Coupon Code' }, { status: 404 });
        }

        // --- EXPIRATION CHECK ---
        const now = new Date();
        const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const validDate = new Date(coupon.validForDate); // This is UTC date from DB

        // Normalize validDate to local date components for comparison
        // coupon.validForDate was created via lib/time.ts which uses "IST stored as UTC" logic
        // So validDate object here represents the target date at 12:00:00.

        // Check if dates match (Year, Month, Date)
        const isSameDay =
            istDate.getFullYear() === validDate.getFullYear() &&
            istDate.getMonth() === validDate.getMonth() &&
            istDate.getDate() === validDate.getDate();

        if (!isSameDay) {
            // If checking validity for TODAY, but coupon is for another day:
            // return invalid/expired logic
            if (istDate < validDate) {
                return NextResponse.json({ message: `Coupon is valid for ${validDate.toLocaleDateString()}, not today.`, coupon, valid: false }, { status: 400 });
            } else {
                return NextResponse.json({ message: 'Coupon Expired (Date Passed)', coupon, valid: false }, { status: 400 });
            }
        }

        // If it IS the same day, check for 3:00 PM cutoff (15:00)
        if (istDate.getHours() >= 15) {
            return NextResponse.json({ message: 'Coupon Expired (Time limit 3:00 PM passed)', coupon, valid: false }, { status: 400 });
        }
        // ------------------------

        if (action === 'validate') {
            // Just return coupon info without redeeming
            if (coupon.status !== 'active') {
                // Still return info but with a warning status, or error?
                // Let's error for simplicity unless we want to show "Already Redeemed at X time"
                return NextResponse.json({ message: `Coupon is ${coupon.status}`, coupon, valid: false }, { status: 200 });
            }
            return NextResponse.json({ message: 'Coupon Valid', coupon, valid: true }, { status: 200 });
        }

        // REDEEM ACTION
        if (coupon.status !== 'active') {
            return NextResponse.json({ message: `Coupon is ${coupon.status}`, coupon }, { status: 400 });
        }

        coupon.status = 'redeemed';
        coupon.redeemedAt = new Date();
        await coupon.save();

        return NextResponse.json({ message: 'Coupon Redeemed Successfully', coupon });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
