import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Suspense } from 'react';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import DeptAdminDashboard from '@/components/dashboard/DeptAdminDashboard';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';
import CanteenDashboard from '@/components/dashboard/CanteenDashboard';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/');
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    // Fetch full user from DB to get walletBalance and latest data
    let fullUser = { ...session.user } as any;
    try {
        await connectToDatabase();
        const dbUser = await User.findById(userId).lean();
        if (dbUser) {
            fullUser = {
                ...fullUser,
                walletBalance: (dbUser as any).walletBalance ?? 0,
                phone: (dbUser as any).phone || '',
                program: (dbUser as any).program || '',
            };
        }
    } catch (e) {
        console.error('Failed to fetch user from DB:', e);
    }

    // Silently run coupon expiry cleanup on every dashboard load:
    // - Deletes unpaid 'polled' coupons if past 10:00 AM IST
    // - Marks 'active' coupons as 'expired' if past 3:00 PM IST
    try {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/coupon/expire`, { method: 'POST' }).catch(() => {});
    } catch (_) {}


    if (role === 'student') return (
        <Suspense fallback={<div className="p-8 text-white text-center">Loading...</div>}>
            <StudentDashboard user={fullUser} />
        </Suspense>
    );
    if (role === 'dept_admin') return <DeptAdminDashboard user={fullUser} />;
    if (role === 'super_admin') return <SuperAdminDashboard user={fullUser} />;
    if (role === 'canteen_staff') return <CanteenDashboard user={fullUser} />;

    return <div>Unknown Role</div>;
}
