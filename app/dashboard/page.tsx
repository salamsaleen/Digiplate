import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import DeptAdminDashboard from '@/components/dashboard/DeptAdminDashboard';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';
import CanteenDashboard from '@/components/dashboard/CanteenDashboard';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/');
    }

    const role = (session.user as any).role;

    if (role === 'student') return <StudentDashboard user={session.user} />;
    if (role === 'dept_admin') return <DeptAdminDashboard user={session.user} />;
    if (role === 'super_admin') return <SuperAdminDashboard user={session.user} />;
    if (role === 'canteen_staff') return <CanteenDashboard user={session.user} />;

    return <div>Unknown Role</div>;
}
