
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import SystemSettings from '@/models/SystemSettings';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        // Get settings for "Tomorrow" by default, or specific date if query param provided
        // Logic: Polling is usually for the NEXT day.

        const url = new URL(req.url);
        const dateParam = url.searchParams.get('date');

        let targetDate = new Date();
        if (dateParam) {
            targetDate = new Date(dateParam);
        } else {
            // Default to tomorrow
            targetDate.setDate(targetDate.getDate() + 1);
        }
        targetDate.setHours(0, 0, 0, 0);

        let settings = await SystemSettings.findOne({ date: targetDate });

        if (!settings) {
            // Return default settings if none exist for that day
            return NextResponse.json({
                date: targetDate,
                mealType: 'Rice', // Default
                isOpen: true,
                closingReason: '',
                sideDishes: ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'],
                isDefault: true
            });
        }

        return NextResponse.json(settings);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!session || (user.role !== 'canteen_staff' && user.role !== 'super_admin')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await connectToDatabase();
        const body = await req.json();
        const { date, mealType, isOpen, closingReason, sideDishes } = body; // Add sideDishes

        let targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // console.log(`[SETTINGS POST] Date: ${targetDate.toISOString()}, Body: ${JSON.stringify(body)}\n`);
        const schemaCheck = SystemSettings.schema.path('sideDishes');
        // console.log(`[SETTINGS DEBUG] Schema sideDishes path: ${!!schemaCheck}\n`);

        const settings = await SystemSettings.findOneAndUpdate(
            { date: targetDate },
            {
                mealType,
                isOpen,
                closingReason,
                sideDishes, // Save sideDishes
                updatedBy: user.id,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({ message: 'Settings updated', settings });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
