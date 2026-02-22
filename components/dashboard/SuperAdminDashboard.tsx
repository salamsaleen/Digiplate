'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SuperAdminDashboard({ user }: { user: any }) {
    const [showForm, setShowForm] = useState(false);
    // Similar to Dept Admin but can create Dept Admins too
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'dept_admin',
        department: 'cs', // Default
    });
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState({ totalStudents: 0, activeCoupons: 0, redeemedToday: 0, paidCount: 0, revenue: 0, monthlyRevenue: 0 });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (res.ok) setStats(data);
        } catch (error) { console.error(error); }
    };

    const departments = [
        'cs', 'chemistry', 'commerce', 'history', 'economics', 'jmc', 'canteen'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Creating admin...');

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage(`SUCCESS: Admin created! Credentials sent.`);
                setFormData({ ...formData, name: '', email: '', phone: '' });
                fetchStats(); // Refresh stats in case a student was somehow added
            } else {
                setMessage(`ERROR: ${data.message}`);
            }
        } catch (err: any) {
            setMessage(`ERROR: ${err.message}`);
        }
    };

    return (
        <div className="p-6 min-h-screen relative">
            <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-md rounded-full border border-gray-700 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-all shadow-lg group z-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
                <span className="text-sm font-medium">Back to Home</span>
            </Link>

            <h1 className="text-3xl font-bold mb-6 text-white mt-8">Super Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        {showForm ? 'Hide Registration' : 'Register Admins'}
                    </button>
                </div>

                {showForm && (
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-semibold mb-4 text-white">Create Department Admin / Canteen Staff</h2>
                        {message && <p className={`mb-4 font-medium ${message.includes('ERROR') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Role</label>
                                <select
                                    className="glass-input"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="dept_admin" className="text-black">Department Admin</option>
                                    <option value="canteen_staff" className="text-black">Canteen Staff</option>
                                </select>
                            </div>

                            {formData.role === 'dept_admin' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-300">Department</label>
                                    <select
                                        className="glass-input"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    >
                                        {departments.map(dept => {
                                            const displayNames: any = {
                                                'cs': 'Computer Science',
                                                'chemistry': 'Chemistry',
                                                'commerce': 'Commerce',
                                                'history': 'History',
                                                'economics': 'Economics',
                                                'jmc': 'JMC',
                                                'canteen': 'Canteen Staff'
                                            };
                                            return (
                                                <option key={dept} value={dept} className="text-black">
                                                    {displayNames[dept] || dept.toUpperCase()}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Full Name</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Email</label>
                                <input
                                    type="email"
                                    className="glass-input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Phone</label>
                                <input
                                    type="tel"
                                    className="glass-input"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>

                            <button className="glass-button w-full mt-4 bg-green-600 hover:bg-green-500">
                                Create Admin & Send Credentials
                            </button>
                        </form>
                    </div>
                )}
            </div>

            <div className="glass-panel p-6 h-fit bg-gradient-to-br from-indigo-900/40 to-purple-900/40">
                <h2 className="text-xl font-semibold mb-6 text-white border-b border-white/10 pb-2">Platform Stats (Live)</h2>
                <div className="space-y-6">
                    <div className="flex justify-between items-center pb-2">
                        <span className="text-gray-300">Total Students Registered</span>
                        <span className="font-bold text-3xl text-fuchsia-400">{stats.totalStudents}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                        <span className="text-gray-300">Active Coupons (Today)</span>
                        <span className="font-bold text-3xl text-orange-400">{stats.activeCoupons}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                        <span className="text-gray-300">Coupons Redeemed Today</span>
                        <span className="font-bold text-3xl text-indigo-400">{stats.redeemedToday}</span>
                    </div>
                    <div className="border-t border-white/10 pt-4 mt-2">
                        <div className="flex justify-between items-center pb-2">
                            <span className="text-gray-300">Paid Meals Count</span>
                            <span className="font-bold text-3xl text-cyan-300">{stats.paidCount || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                            <span className="text-gray-300">Total Revenue (Today)</span>
                            <span className="font-bold text-3xl text-rose-300">₹{stats.revenue || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                            <span className="text-gray-300">Total Revenue (Month)</span>
                            <span className="font-bold text-3xl text-emerald-300">₹{stats.monthlyRevenue || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div >
    );
}
