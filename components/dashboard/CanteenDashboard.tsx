'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function CanteenDashboard({ user }: { user: any }) {
    const [couponCode, setCouponCode] = useState('');
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [scannedCoupon, setScannedCoupon] = useState<any>(null); // Store fetched coupon details
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ polledCount: 0, redeemedCount: 0, paidCount: 0, revenue: 0 });
    const [showFinance, setShowFinance] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Canteen Settings State
    const [settings, setSettings] = useState({
        date: new Date(),
        mealType: 'Rice',
        isOpen: true,
        closingReason: '',
        // sideDishes: ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'] // Changed to Malayalam default
        sideDishes: ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി']
    });
    const [showMenu, setShowMenu] = useState(false);
    const [showMealModal, setShowMealModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [tempReason, setTempReason] = useState('');

    const [showCredentialSender, setShowCredentialSender] = useState(false);
    const [credData, setCredData] = useState({ name: '', email: '', phone: '', password: '' });

    const handleSendCredentials = async () => {
        if (!credData.password || (!credData.email && !credData.phone)) {
            setMessage('Please provide password and either email or phone.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users/send-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credData),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage('Credentials Sent Successfully!');
                setCredData({ name: '', email: '', phone: '', password: '' });
                setShowCredentialSender(false);
            } else {
                setMessage(`Error: ${data.message}`);
            }
        } catch (error) {
            setMessage('Failed to send credentials.');
        } finally {
            setLoading(false);
        }
    };

    // Available Side Dishes Options
    const AVAILABLE_SIDES = ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'];

    useEffect(() => {
        fetchStats();
        fetchSettings();
        const interval = setInterval(() => {
            fetchStats();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/canteen/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchSettings = async () => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const res = await fetch(`/api/system/settings?date=${tomorrow.toISOString()}`); // Fetch for tomorrow
            if (res.ok) {
                const data = await res.json();
                if (data) setSettings({
                    mealType: data.mealType || 'Rice',
                    isOpen: data.isOpen !== undefined ? data.isOpen : true,
                    closingReason: data.closingReason || '',
                    date: new Date(data.date),
                    sideDishes: data.sideDishes || ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി']
                });
            }
        } catch (e) { console.error(e); }
    };

    const handleSideToggle = (side: string) => {
        const currentSides = settings.sideDishes || [];
        let newSides;
        if (currentSides.includes(side)) {
            newSides = currentSides.filter(s => s !== side);
        } else {
            newSides = [...currentSides, side];
        }
        setSettings({ ...settings, sideDishes: newSides });
    };

    const updateSettings = async (newSettings: any) => {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const res = await fetch('/api/system/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: tomorrow.toISOString(),
                    ...newSettings
                })
            });

            if (res.ok) {
                const data = await res.json();
                setSettings({
                    mealType: data.settings.mealType,
                    isOpen: data.settings.isOpen,
                    closingReason: data.settings.closingReason,
                    date: new Date(data.settings.date),
                    sideDishes: data.settings.sideDishes || []
                });
                setShowMealModal(false);
                setShowStatusModal(false);
                setMessage('Settings Updated Successfully');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (e) { console.error(e); }
    };

    const handleAction = async (e?: React.FormEvent, codeOverride?: string) => {
        if (e) e.preventDefault();
        const code = codeOverride || couponCode;
        if (!code) return;

        setLoading(true);
        setMessage('Processing Redemption...'); // Single status message
        setScanResult(null);
        setScannedCoupon(null); // Clear previous

        try {
            // Always perform 'redeem' action directly
            const res = await fetch('/api/coupon/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, action: 'redeem' }),
            });

            const data = await res.json();

            if (res.ok) {
                // Redeem Success
                setScannedCoupon(data.coupon);
                setCouponCode('');
                setScanResult('SUCCESS');
                setMessage('✅ Validated Successfully!');
                fetchStats();
            } else {
                // Error (Invalid, Expired, Already Redeemed)
                setScanResult('ERROR');
                setMessage(`❌ ${data.message}`);
                // Still show coupon details if available (e.g., if already redeemed)
                setScannedCoupon(data.coupon || null);
            }
        } catch (err: any) {
            setScanResult('ERROR');
            setMessage('Network Error');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = (detectedCodes: any) => {
        if (detectedCodes && detectedCodes.length > 0) {
            const code = detectedCodes[0].rawValue;
            setCouponCode(code);
            setShowScanner(false);
            // Auto Redeem on Scan
            handleAction(undefined, code);
        }
    };

    return (
        <div className="p-6 min-h-screen relative">
            <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-md rounded-full border border-gray-700 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-all shadow-lg group z-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
                <span className="text-sm font-medium">Back to Home</span>
            </Link>

            <h1 className="text-3xl font-bold mb-6 text-white text-center mt-8">Canteen Staff Dashboard</h1>

            {/* More Options Menu (Global Top Right) */}
            <div className="absolute top-4 right-4 z-50">
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="bg-gray-800/50 p-2 rounded-full hover:bg-gray-700/50 transition-colors backdrop-blur-md border border-gray-600/50 text-white shadow-lg"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-64 glass-panel border border-gray-600 shadow-2xl rounded-xl overflow-hidden z-50 animate-fade-in-down">
                            <div className="bg-white/5 px-4 py-2 border-b border-gray-600/50">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Canteen Controls</span>
                            </div>
                            <button
                                onClick={() => { setShowMealModal(true); setShowMenu(false); }}
                                className="block w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors border-b border-gray-700/50"
                            >
                                <span className="mr-2">🍽️</span> Set Tomorrow's Meal
                            </button>
                            <button
                                onClick={() => { setShowStatusModal(true); setShowMenu(false); }}
                                className="block w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors border-b border-gray-700/50"
                            >
                                <span className="mr-2">{settings.isOpen ? '🔒' : '🔓'}</span>
                                {settings.isOpen ? 'Close Canteen (Tomorrow)' : 'Open Canteen (Tomorrow)'}
                            </button>
                            <button
                                onClick={() => { setShowFinance(!showFinance); setShowMenu(false); }}
                                className="block w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                            >
                                <span className="mr-2">💰</span>
                                {showFinance ? 'Hide Financial Stats' : 'Show Financial Stats'}
                            </button>
                            <button
                                onClick={() => { setShowCredentialSender(true); setShowMenu(false); }}
                                className="block w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-white/10 transition-colors border-t border-gray-700/50"
                            >
                                <span className="mr-2">📧</span>
                                Send Login Details
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Credential Sender Modal */}
            {showCredentialSender && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="glass-panel p-6 max-w-sm w-full border border-gray-700 space-y-4">
                        <h3 className="text-xl font-bold text-white mb-2">Send Login Details</h3>

                        <input
                            type="text"
                            placeholder="Student Name"
                            className="w-full bg-black/30 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                            value={credData.name}
                            onChange={(e) => setCredData({ ...credData, name: e.target.value })}
                        />
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-black/30 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                            value={credData.email}
                            onChange={(e) => setCredData({ ...credData, email: e.target.value })}
                        />
                        <input
                            type="tel"
                            placeholder="Phone Number (e.g. +91...)"
                            className="w-full bg-black/30 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                            value={credData.phone}
                            onChange={(e) => setCredData({ ...credData, phone: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Password to Send"
                            className="w-full bg-black/30 border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                            value={credData.password}
                            onChange={(e) => setCredData({ ...credData, password: e.target.value })}
                        />

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setShowCredentialSender(false)}
                                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendCredentials}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
                            >
                                {loading ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto relative">
                <div className="glass-panel p-6 text-center border border-orange-500/30 bg-orange-900/20">
                    <p className="text-orange-300 font-semibold mb-2">Estimated Meals</p>
                    <p className="text-4xl font-bold text-orange-400">{stats.polledCount}</p>
                    <p className="text-xs text-orange-300/70 mt-2">Based on student polls</p>
                </div>
                <div className="glass-panel p-6 text-center border border-indigo-500/30 bg-indigo-900/20">
                    <p className="text-indigo-300 font-semibold mb-2">Meals Served Today</p>
                    <p className="text-4xl font-bold text-indigo-400">{stats.redeemedCount}</p>
                    <p className="text-xs text-indigo-300/70 mt-2">Coupons redeemed</p>
                </div>

                {showFinance && (
                    <>
                        <div className="glass-panel p-6 text-center border border-cyan-500/30 bg-cyan-900/20">
                            <p className="text-cyan-300 font-semibold mb-2">Pre-paid Meals</p>
                            <p className="text-4xl font-bold text-cyan-400">{stats.paidCount || 0}</p>
                            <p className="text-xs text-cyan-300/70 mt-2">Active + Redeemed</p>
                        </div>
                        <div className="glass-panel p-6 text-center border border-rose-500/30 bg-rose-900/20">
                            <p className="text-rose-300 font-semibold mb-2">Total Revenue (₹)</p>
                            <p className="text-4xl font-bold text-rose-400">₹{stats.revenue || 0}</p>
                            <p className="text-xs text-rose-300/70 mt-2">Today's Collection</p>
                        </div>
                    </>
                )}
            </div>

            {/* Set Meal Modal */}
            {showMealModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="glass-panel p-6 w-full max-w-sm mx-auto">
                        <h3 className="text-lg font-bold mb-4 text-white">Set Tomorrow's Menu</h3>

                        {/* Meal Type Selection */}
                        <div className="space-y-3 mb-6">
                            <p className="text-sm text-gray-400 uppercase">Main Course</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setSettings({ ...settings, mealType: 'Rice' })}
                                    className={`p-3 rounded-lg border ${settings.mealType === 'Rice' ? 'bg-orange-600 border-orange-400 text-white' : 'glass-button text-gray-300'}`}
                                >
                                    Rice
                                </button>
                                <button
                                    onClick={() => setSettings({ ...settings, mealType: 'Porridge' })}
                                    className={`p-3 rounded-lg border ${settings.mealType === 'Porridge' ? 'bg-orange-600 border-orange-400 text-white' : 'glass-button text-gray-300'}`}
                                >
                                    Kanji
                                </button>
                            </div>
                        </div>

                        {/* Side Dishes Selection */}
                        <div className="space-y-3 mb-6">
                            <p className="text-sm text-gray-400 uppercase">Side Dishes</p>
                            <div className="space-y-2">
                                {AVAILABLE_SIDES.map(side => (
                                    <label key={side} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-white/5 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={settings.sideDishes?.includes(side)}
                                            onChange={() => handleSideToggle(side)}
                                            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-white">{side}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => updateSettings(settings)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg"
                        >
                            Save Menu
                        </button>

                        <button onClick={() => setShowMealModal(false)} className="mt-4 w-full text-gray-400 hover:text-white text-sm">Cancel</button>
                    </div>
                </div>
            )}

            {/* Set Status Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="glass-panel p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4 text-white">
                            {settings.isOpen ? 'Close Canteen for Tomorrow?' : 'Re-open Canteen?'}
                        </h3>

                        {settings.isOpen ? (
                            <div className="mb-4">
                                <label className="block text-sm text-gray-300 mb-2">Reason (e.g., Holiday, Maintenance)</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={tempReason}
                                    onChange={(e) => setTempReason(e.target.value)}
                                    placeholder="Enter reason..."
                                />
                            </div>
                        ) : null}

                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setShowStatusModal(false)} className="flex-1 glass-button bg-gray-600">Cancel</button>
                            <button
                                onClick={() => updateSettings({
                                    ...settings,
                                    isOpen: !settings.isOpen,
                                    closingReason: settings.isOpen ? tempReason : ''
                                })}
                                className={`flex-1 glass-button ${settings.isOpen ? 'bg-red-600' : 'bg-green-600'}`}
                            >
                                {settings.isOpen ? 'Confirm Close' : 'Confirm Open'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className="glass-panel p-8 max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-2 text-center text-white">Coupon Validation</h2>
                <p className="text-gray-400 text-center mb-6 text-sm">Scan or enter code to redeem</p>

                <button
                    onClick={() => setShowScanner(!showScanner)}
                    className="w-full mb-6 p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M3 17v2a2 2 0 0 1 2 2h2" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
                    {showScanner ? 'Close Scanner' : 'Validate Coupon'}
                </button>

                {message && !showMealModal && !showStatusModal && (
                    <div className={`p-4 mb-6 rounded text-center font-bold ${scanResult === 'SUCCESS' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                        message.includes('Updated') ? 'bg-blue-500/20 text-blue-300' :
                            'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                        {message}
                    </div>
                )}

                {/* Scanner logic remains same... */}
                {showScanner ? (
                    <div className="mb-6 rounded-lg overflow-hidden border border-white/20 relative bg-black">
                        <Scanner
                            onScan={handleScan}
                            onError={(error) => console.log(error?.message)}
                            components={{
                                onOff: false,
                                torch: false,
                                zoom: false,
                                finder: true,
                            }}
                            styles={{
                                container: { width: '100%', height: '300px' },
                                video: { width: '100%', height: '300px', objectFit: 'cover' }
                            }}
                        />
                        <button
                            onClick={() => setShowScanner(false)}
                            className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full z-10 hover:bg-black/70"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowScanner(true)}
                        className="w-full glass-button bg-indigo-600 hover:bg-indigo-700 mb-6 flex items-center justify-center gap-2 py-4 shadow-lg hover:shadow-indigo-500/20"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /></svg>
                        Open QR Scanner
                    </button>
                )}

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Or enter manually</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                </div>

                <form onSubmit={(e) => handleAction(e)} className="space-y-4 mt-4">
                    <input
                        type="text"
                        placeholder="Enter Coupon Code (e.g. MEAL-XYZ)"
                        className="glass-input text-center text-lg tracking-widest uppercase"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || !couponCode}
                            className={`glass-button bg-green-600 w-full hover:bg-green-700 border border-green-500 ${loading ? 'opacity-50' : ''}`}
                        >
                            {loading ? 'Processing...' : 'Validate Coupon'}
                        </button>
                    </div>
                </form>

                {/* Display Scanned/Validated Coupon Details */}
                {scannedCoupon && (
                    <div className={`mt-6 rounded-xl overflow-hidden border animate-fade-in ${scanResult === 'SUCCESS' ? 'border-green-500/40' : 'border-white/10'}`}>
                        {/* Header */}
                        <div className={`px-4 py-3 text-center ${scanResult === 'SUCCESS' ? 'bg-green-900/40' : 'bg-white/5'}`}>
                            <h3 className="text-white font-bold text-base">
                                {scanResult === 'SUCCESS' ? '✅ Coupon Validated' : '📋 Coupon Info'}
                            </h3>
                        </div>

                        {/* Student Details */}
                        <div className="p-4 space-y-2 text-sm border-b border-white/10">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-2">Student</p>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Name:</span>
                                <span className="text-white font-medium">{scannedCoupon.studentId?.name || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Department:</span>
                                <span className="text-white">{scannedCoupon.department?.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Status:</span>
                                <span className={`font-bold uppercase ${scannedCoupon.status === 'active' ? 'text-green-400' :
                                    scannedCoupon.status === 'redeemed' ? 'text-blue-400' : 'text-red-400'
                                    }`}>{scannedCoupon.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Valid Date:</span>
                                <span className="text-white">{new Date(scannedCoupon.validForDate).toDateString()}</span>
                            </div>
                        </div>

                        {/* Meal Details */}
                        <div className="p-4 space-y-2 text-sm bg-orange-950/20">
                            <p className="text-xs text-orange-400 uppercase font-bold tracking-widest mb-2">🍽️ Meal Details</p>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Main Dish:</span>
                                <span className="text-orange-300 font-bold text-base">
                                    {scannedCoupon.mealType === 'Rice'
                                        ? '🍚 Rice (ചോറ്)'
                                        : scannedCoupon.mealType === 'Porridge'
                                            ? '🥣 Kanji (കഞ്ഞി)'
                                            : scannedCoupon.mealType || '🍚 Rice (ചോറ്)'}
                                </span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-gray-400 mt-1">Side Dishes:</span>
                                <div className="text-right">
                                    {scannedCoupon.sideDishes && scannedCoupon.sideDishes.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                                            {scannedCoupon.sideDishes.map((side: string, i: number) => (
                                                <span key={i} className="bg-orange-900/50 border border-orange-500/30 text-orange-200 text-xs px-2 py-0.5 rounded-full">
                                                    {side}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 text-xs">No sides listed</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

