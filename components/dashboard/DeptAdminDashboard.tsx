'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DeptAdminDashboard({ user }: { user: any }) {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', role: 'student', program: 'ug' });
    const [message, setMessage] = useState('');
    const [students, setStudents] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [polls, setPolls] = useState<any[]>([]);
    const [approved, setApproved] = useState<any[]>([]);

    useEffect(() => {
        fetchStudents();
        fetchRequests();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (Array.isArray(data)) setStudents(data);
        } catch (error) { console.error("Failed to fetch students", error); }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/coupon/requests');
            const data = await res.json();
            if (data.requests) setRequests(data.requests);
            if (data.polls) setPolls(data.polls);
            if (data.approved) setApproved(data.approved);
        } catch (error) { console.error("Failed to fetch requests", error); }
    };

    const handleRequestAction = async (couponId: string, action: 'approve' | 'reject') => {
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;
        try {
            const res = await fetch('/api/coupon/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ couponId, action })
            });
            if (res.ok) {
                alert(`Request ${action}d successfully`);
                fetchRequests();
            } else {
                const d = await res.json();
                alert(`Failed: ${d.message}`);
            }
        } catch (e) { alert('Error processing request'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this student?')) return;
        try {
            const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) { alert('Student deleted'); fetchStudents(); }
            else { alert('Failed to delete'); }
        } catch (e) { alert('Error deleting'); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('Creating user...');
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, department: user.department }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(`SUCCESS: User created! Password sent to ${formData.email}`);
                setFormData({ name: '', email: '', phone: '', role: 'student', program: 'ug' });
                fetchStudents();
            } else { setMessage(`ERROR: ${data.message}`); }
        } catch (err: any) { setMessage(`ERROR: ${err.message}`); }
    };


    const isDividedDept = ['history', 'economics', 'jmc', 'commerce'].includes(user.department);

    const getDeptDisplayName = (dept: string) => {
        const map: any = {
            'cs': 'B.Sc Computer Science',
            'chemistry': 'B.Sc Chemistry',
            'commerce': 'Commerce',
            'history': 'History',
            'economics': 'Economics',
            'jmc': 'JMC',
            'canteen': 'Canteen'
        };
        return map[dept] || dept.toUpperCase();
    };

    const ugStudents = students.filter(s => s.program === 'ug' || !s.program);
    const pgStudents = students.filter(s => s.program === 'pg');

    return (
        <div className="p-6 min-h-screen relative">
            <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-md rounded-full border border-gray-700 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-all shadow-lg group z-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
                <span className="text-sm font-medium">Back to Home</span>
            </Link>

            <h1 className="text-2xl font-bold mb-6 text-white mt-8">
                Department Admin: {getDeptDisplayName(user.department)}
            </h1>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                {/* All Polled Students Section */}
                <div className="glass-panel p-6 border-l-4 border-purple-500">
                    <h2 className="text-xl font-semibold mb-4 text-purple-400">All Polled Students ({polls.length})</h2>
                    <p className="text-sm text-gray-400 mb-4">All students who have polled (includes both 'Poll Only' and 'Paid').</p>
                    {polls.length === 0 ? (
                        <p className="text-gray-500 italic">No polls yet.</p>
                    ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {polls.map((p: any) => (
                                <div key={p._id} className="p-3 bg-purple-900/30 rounded flex justify-between items-center border border-purple-500/30">
                                    <div>
                                        <p className="font-bold text-gray-200 text-sm">{p.studentId?.name || 'Unknown Name'} <span className="text-xs text-gray-500">({p.studentId?.program?.toUpperCase()})</span></p>
                                        <p className="text-xs text-purple-300 font-medium">{p.studentId?.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs text-gray-400 font-mono bg-black/40 px-2 py-1 rounded border border-gray-600">
                                            {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${p.status === 'polled' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {p.status === 'polled' ? 'Poll Only' : 'Paid'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* Confirmed Coupons Section */}
                <div className="glass-panel p-6 border-l-4 border-green-500">
                    <h2 className="text-xl font-semibold mb-4 text-green-400">Poll & Pay (Confirmed) ({approved.length})</h2>
                    <p className="text-sm text-gray-400 mb-4">Students with active/paid coupons.</p>
                    {approved.length === 0 ? (
                        <p className="text-gray-500 italic">No confirmed coupons.</p>
                    ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {approved.map((c: any) => (
                                <div key={c._id} className="p-3 bg-green-900/30 rounded flex justify-between items-center border border-green-500/30">
                                    <div>
                                        <p className="font-bold text-gray-200 text-sm">{c.studentId?.name || 'Unknown Name'}</p>
                                        <p className="text-xs text-green-300 font-medium">{c.studentId?.email}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 font-mono bg-black/40 px-2 py-1 rounded border border-gray-600">
                                        Token: {c.code}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Registration Form */}
                <div className="glass-panel p-6 h-fit">
                    <h2 className="text-xl font-semibold mb-4 text-white">Register New Student</h2>
                    {message && <p className={`mb-4 font-medium ${message.includes('ERROR') ? 'text-red-400' : 'text-green-400'}`}>{message}</p>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isDividedDept && (
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Program</label>
                                <select
                                    className="glass-input"
                                    value={formData.program}
                                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                                >
                                    <option value="ug" className="text-black">{user.department === 'commerce' ? 'B.Com' : 'BA (UG)'}</option>
                                    <option value="pg" className="text-black">{user.department === 'commerce' ? 'M.Com' : 'MA (PG)'}</option>
                                </select>
                            </div>
                        )}
                        <input type="text" placeholder="Full Name (e.g. Arjun)" className="glass-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        <input type="email" placeholder="Email (e.g. student@college.edu)" className="glass-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                        <input type="tel" placeholder="Phone (e.g. +91...)" className="glass-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                        <button className="glass-button w-full">Register Student & Send SMS</button>
                    </form>
                </div>

                {/* Student List */}
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">Registered Students ({students.length})</h2>

                    {isDividedDept ? (
                        <div className="flex flex-col gap-6">
                            <div>
                                <h3 className="text-lg font-medium text-blue-300 mb-2 border-b border-blue-500/30 pb-1">
                                    {user.department === 'commerce' ? 'B.Com' : 'UG (BA)'} Students
                                </h3>
                                <div className="overflow-y-auto max-h-[300px] space-y-3 pr-2">
                                    {ugStudents.map((student: any) => (
                                        <div key={student._id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition">
                                            <div>
                                                <p className="font-bold text-gray-200">{student.name}</p>
                                                <p className="text-sm text-gray-400">{student.email}</p>
                                            </div>
                                            <button onClick={() => handleDelete(student._id)} className="bg-red-500/20 text-red-300 px-3 py-1 rounded text-sm hover:bg-red-500/40 border border-red-500/30">Delete</button>
                                        </div>
                                    ))}
                                    {ugStudents.length === 0 && <p className="text-gray-500 text-sm">No UG students.</p>}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-pink-300 mb-2 border-b border-pink-500/30 pb-1">
                                    {user.department === 'commerce' ? 'M.Com' : 'PG (MA)'} Students
                                </h3>
                                <div className="overflow-y-auto max-h-[300px] space-y-3 pr-2">
                                    {pgStudents.map((student: any) => (
                                        <div key={student._id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition">
                                            <div>
                                                <p className="font-bold text-gray-200">{student.name}</p>
                                                <p className="text-sm text-gray-400">{student.email}</p>
                                            </div>
                                            <button onClick={() => handleDelete(student._id)} className="bg-red-500/20 text-red-300 px-3 py-1 rounded text-sm hover:bg-red-500/40 border border-red-500/30">Delete</button>
                                        </div>
                                    ))}
                                    {pgStudents.length === 0 && <p className="text-gray-500 text-sm">No PG students.</p>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-y-auto max-h-[600px] space-y-3 pr-2">
                            {students.map((student: any) => (
                                <div key={student._id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition">
                                    <div>
                                        <p className="font-bold text-gray-200">{student.name}</p>
                                        <p className="text-sm text-gray-400">{student.email}</p>
                                    </div>
                                    <button onClick={() => handleDelete(student._id)} className="bg-red-500/20 text-red-300 px-3 py-1 rounded text-sm hover:bg-red-500/40 border border-red-500/30">Delete</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
