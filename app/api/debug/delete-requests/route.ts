import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        // Delete all coupons with status 'requested'
        const result = await Coupon.deleteMany({ status: 'requested' });

        return NextResponse.json({
            message: 'Pending coupon requests deleted successfully.',
            deletedCount: result.deletedCount
        });
    } catch (error: any) {
        return NextResponse.json(
            { message: 'Error deleting requests', error: error.message },
            { status: 500 }
        );
    }
}
