
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'dept_admin') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { couponId, action } = await req.json(); // action: 'approve' or 'reject'
        if (!couponId || !action) return NextResponse.json({ message: 'Missing fields' }, { status: 400 });

        await connectToDatabase();

        const coupon = await Coupon.findById(couponId);
        if (!coupon) return NextResponse.json({ message: 'Coupon not found' }, { status: 404 });

        if (coupon.department !== (session.user as any).department) {
            return NextResponse.json({ message: 'Cannot manage other department coupons' }, { status: 403 });
        }

        // Validate Status
        if (coupon.status !== 'requested' && coupon.status !== 'polled') {
            return NextResponse.json({ message: `Coupon is already ${coupon.status}` }, { status: 400 });
        }

        if (action === 'approve') {
            coupon.status = 'approved';
            await coupon.save();



            return NextResponse.json({ message: 'Request Approved' }, { status: 200 });
        } else if (action === 'reject') {
            coupon.status = 'rejected';
            await coupon.save();
            return NextResponse.json({ message: 'Request Rejected' }, { status: 200 });
        }

        return NextResponse.json({ message: 'Invalid Action' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Server Error' }, { status: 500 });
    }
}
