
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import SystemSettings from '@/models/SystemSettings';

// ⚠️ TEST ONLY — This route is only reachable in development mode
export async function POST(req: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ message: 'Not available in production' }, { status: 403 });
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const mealType = body.mealType || 'Rice';

        await connectToDatabase();
        const user = session.user as any;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const start = new Date(tomorrow); start.setHours(0, 0, 0, 0);
        const end = new Date(tomorrow); end.setHours(23, 59, 59, 999);

        const settings = await SystemSettings.findOne({ date: { $gte: start, $lt: end } });
        const sideDishes = settings?.sideDishes || ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

        // Remove any existing coupon for this date so we can recreate
        const existing = await Coupon.findOne({
            studentId: user.id,
            validForDate: { $gte: start, $lt: end }
        });

        let coupon;
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();

        if (existing) {
            existing.status = 'active';
            existing.paymentId = 'test_pay_simulate';
            existing.sideDishes = sideDishes;
            existing.mealType = mealType;
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
                paymentId: 'test_pay_simulate',
            });
        }

        return NextResponse.json({ coupon });

    } catch (error: any) {
        console.error('[TEST SIMULATE ERROR]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
