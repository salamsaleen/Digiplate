import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import PushSubscription from '@/models/PushSubscription';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const subscription = await req.json();

        if (!subscription || !subscription.endpoint) {
            return NextResponse.json({ message: 'Invalid subscription' }, { status: 400 });
        }

        await connectToDatabase();

        // Check if this exact endpoint already exists for this user
        const existing = await PushSubscription.findOne({
            userId: (session.user as any).id,
            endpoint: subscription.endpoint
        });

        if (!existing) {
            await PushSubscription.create({
                userId: (session.user as any).id,
                endpoint: subscription.endpoint,
                keys: subscription.keys
            });
        }

        return NextResponse.json({ message: 'Subscribed successfully' });

    } catch (error: any) {
        console.error('Push subscription error:', error);
        return NextResponse.json({ message: 'Server Error' }, { status: 500 });
    }
}
