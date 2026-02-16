'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import QRCode from 'react-qr-code';

export default function StudentDashboard({ user }: { user: any }) {
    const [coupon, setCoupon] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Canteen Status State
    const [settings, setSettings] = useState({ mealType: 'Rice', isOpen: true, closingReason: '' });
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    useEffect(() => {
        fetchCoupon();
        fetchSettings();
    }, []);

    async function fetchCoupon() {
        try {
            const res = await fetch('/api/coupon/book');
            if (res.ok) {
                const data = await res.json();
                if (data.coupon) {
                    setCoupon(data.coupon);
                }
            }
        } catch (e) { console.error(e); }
    }

    async function fetchSettings() {
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const res = await fetch(`/api/system/settings?date=${tomorrow.toISOString()}`);
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    mealType: data.mealType || 'Rice',
                    isOpen: data.isOpen !== undefined ? data.isOpen : true,
                    closingReason: data.closingReason || ''
                });
                setSettingsLoaded(true);
            }
        } catch (e) {
            console.error(e);
            setSettingsLoaded(true); // Allow fallback
        }
    }

    const handleAction = async (action: 'poll' | 'request' | 'pay' | 'pay_direct') => {
        setLoading(true);
        // Pass the mealType when creating the coupon
        const mealToCheck = settings.mealType;

        setMessage(action === 'poll' ? 'Submitting Poll...' : action === 'request' ? 'Requesting...' : 'Processing Payment...');

        try {
            const res = await fetch('/api/coupon/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, mealType: mealToCheck })
            });

            const data = await res.json();
            if (res.ok) {
                if (action === 'poll') setMessage('Poll Submitted! Now request approval.');
                if (action === 'request') setMessage('Request Sent! Waiting for Admin Approval.');
                if (action === 'pay' || action === 'pay_direct') {
                    setMessage('Payment Successful! Coupon Generated.');
                    setShowPaymentModal(false);
                }
                setCoupon(data.coupon);
            } else {
                setMessage(`Error: ${data.message}`);
            }
        } catch (err) {
            setMessage('Action Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRazorpayPayment = async () => {
        setLoading(true);
        setMessage('Initializing Payment...');
        try {
            // 1. Create Order
            const resOrder = await fetch('/api/payment/order', { method: 'POST' });
            if (!resOrder.ok) {
                const errorData = await resOrder.json().catch(() => ({}));
                throw new Error(errorData.message || 'Order creation failed');
            }
            const order = await resOrder.json();

            // 2. Open Razorpay
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "DigiPlate",
                description: "Meal Coupon",
                order_id: order.id,
                handler: async function (response: any) {
                    setMessage('Verifying Payment...');
                    // 3. Verify Payment
                    const resVerify = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            mealType: settings.mealType
                        })
                    });

                    const data = await resVerify.json();
                    if (resVerify.ok) {
                        setMessage('Payment Successful! Coupon Generated.');
                        setCoupon(data.coupon);
                        setShowPaymentModal(false);
                    } else {
                        setMessage('Payment Verification Failed: ' + data.message);
                    }
                },
                prefill: {
                    name: user.name, // Access user prop
                    email: user.email, // Access user prop
                    contact: user.phone || '' // Access user prop
                },
                theme: {
                    color: "#2563eb"
                }
            };

            const rzp1 = new (window as any).Razorpay(options);
            rzp1.on('payment.failed', function (response: any) {
                setMessage(`Payment Failed: ${response.error.description}`);
            });
            rzp1.open();

        } catch (error: any) {
            console.error(error);
            setMessage(`Payment Initialization Failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderActionArea = () => {
        if (!settingsLoaded) return <p className="text-white text-center">Loading Canteen Status...</p>;

        // 1. If Canteen is CLOSED for tomorrow
        if (!settings.isOpen && (!coupon || coupon.status === 'polled')) {
            return (
                <div className="glass-panel p-6 text-center border border-red-500/30 bg-red-900/10">
                    <h2 className="text-xl font-bold text-red-400 mb-4">Canteen Closed Tomorrow</h2>
                    <p className="text-white text-lg mb-2">🚫 No Meals Available</p>
                    {settings.closingReason && (
                        <p className="text-gray-300 italic">" {settings.closingReason} "</p>
                    )}
                    <button disabled className="mt-6 glass-button bg-gray-600 cursor-not-allowed w-full opacity-50">
                        Booking Disabled
                    </button>
                </div>
            );
        }

        // 2. Poll / Pay Area
        if (!coupon || coupon.status === 'polled') {
            const mealName = settings.mealType === 'Rice' ? 'Rice (ചോറ്)' : settings.mealType === 'Porridge' ? 'Kanji (കഞ്ഞി)' : settings.mealType;
            const isPolled = coupon?.status === 'polled';

            return (
                <div className={`p-6 text-center rounded-xl shadow-lg border border-gray-700 w-full max-w-md mx-auto ${isPolled ? 'bg-yellow-900/40 border-yellow-500/30' : 'bg-[#0b121e]'}`}>
                    <h2 className="text-xl font-semibold mb-2 text-white">Meal Booking</h2>
                    <p className="text-gray-300 mb-1">for Tomorrow ({new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString()})</p>
                    <p className="text-yellow-400 text-sm font-bold mb-4 bg-yellow-900/20 py-1 px-3 rounded-full inline-block border border-yellow-500/30">
                        🕒 Polling Time: 3:00 PM - 8:00 PM
                    </p>

                    <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
                        <p className="text-gray-400 text-sm uppercase tracking-wide">Tomorrow's Menu</p>
                        <p className="text-2xl font-bold text-orange-400 mt-1">{mealName}</p>
                        {settings.sideDishes && settings.sideDishes.length > 0 && (
                            <div className="mt-2 text-sm text-gray-300">
                                <span className="text-xs text-gray-500 uppercase mr-1">Includes:</span>
                                {settings.sideDishes.join(', ')}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 max-w-sm mx-auto">

                        {/* Option 1: Poll Only */}
                        {!isPolled && (
                            <button
                                onClick={() => handleAction('poll')}
                                disabled={loading}
                                className="glass-button w-full border border-orange-400/50 hover:bg-orange-500/20 text-orange-200"
                            >
                                ✋ Poll Only (I might eat)
                            </button>
                        )}


                        {/* Option 2: Pay Directly */}
                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={loading}
                            className="glass-button bg-green-600 hover:bg-green-700 w-full border-2 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                        >
                            {isPolled ? '💰 Pay Now (Get Coupon)' : '⚡ Poll & Pay Now (Get Coupon)'}
                        </button>
                    </div>
                    {isPolled && (
                        <p className="mt-4 text-sm text-yellow-300 bg-yellow-900/20 p-2 rounded border border-yellow-500/30 animate-pulse">
                            ⚠️ You have polled! Pay now to confirm your meal.
                        </p>
                    )}
                    {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
                </div>
            );
        }

        // 3. Active Coupon Display
        if (coupon.status === 'active') {
            const mealDisplay = coupon.mealType === 'Rice' ? 'Rice (ചോറ്)' : coupon.mealType === 'Porridge' ? 'Kanji (കഞ്ഞി)' : (coupon.mealType || 'Rice (ചോറ്)');

            // Calculate Validity (Example: 18 hours from created time, or till next day lunch time)
            // Hardcoding "Expires in 18 Hours" or specific time for now as per request
            const validDate = new Date(coupon.validForDate);
            const expiryText = "Valid until 3:00 PM";

            return (
                <div className="glass-panel p-6 flex flex-col items-center max-w-sm mx-auto border-2 border-green-500/30">
                    <div className="w-full border-b border-white/10 pb-4 mb-4 text-center">
                        <h2 className="text-xl font-bold text-green-400">MEAL COUPON</h2>
                        <p className="text-xs text-green-300/70 uppercase tracking-widest mt-1">DigiPlate Verification</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border-4 border-white shadow-2xl mb-6">
                        <QRCode value={coupon.code} size={180} />
                    </div>

                    <div className="w-full space-y-3 text-left bg-black/20 p-4 rounded-lg">
                        {/* 1. Student Name */}
                        <div>
                            <p className="text-xs text-gray-400 uppercase">Student Name</p>
                            <p className="text-lg font-bold text-white">{user.name}</p>
                        </div>

                        {/* 2. Dish (and Date) */}
                        <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                            <div>
                                <p className="text-xs text-gray-400 uppercase">Meal</p>
                                <p className="text-lg font-bold text-orange-400">{mealDisplay}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 uppercase">Date</p>
                                <p className="text-white">{validDate.toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* 3. Side Dishes */}
                        <div className="border-t border-white/10 pt-2 mt-2">
                            <p className="text-xs text-gray-400 uppercase mb-1">Side Dishes</p>
                            <p className="text-sm text-white font-medium">{coupon.sideDishes?.length > 0 ? coupon.sideDishes.join(', ') : 'No Sides'}</p>
                        </div>

                        {/* 4. Validity */}
                        <div className="border-t border-white/10 pt-2 mt-2">
                            <p className="text-xs text-gray-400 uppercase">Validity</p>
                            <p className="text-sm text-yellow-300">{expiryText}</p>
                        </div>

                        <div className="pt-2 border-t border-white/10 mt-2">
                            <p className="text-xs text-gray-500 font-mono text-center tracking-widest">{coupon.code}</p>
                        </div>
                    </div>

                </div>
            );
        }

        return <p className="text-white">Status: {coupon.status}</p>;
    };

    return (
        <div className="p-4 min-h-screen pb-20 relative">
            <Link href="/" className="absolute top-6 left-4 flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-md rounded-full border border-gray-700 hover:bg-gray-700/80 text-gray-300 hover:text-white transition-all shadow-lg group z-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
                <span className="text-sm font-medium">Back to Home</span>
            </Link>

            <div className="bg-[#0b121e] p-6 mb-6 flex justify-between items-center rounded-xl border border-gray-800 shadow-lg mt-12">
                <div>
                    <h1 className="text-2xl font-bold text-white">Welcome, {user.name}</h1>
                    <p className="text-gray-400 text-sm">
                        {{
                            'cs': 'B.Sc Computer Science',
                            'chemistry': 'B.Sc Chemistry',
                            'commerce': user.program === 'pg' ? 'M.Com' : 'B.Com',
                            'history': user.program === 'pg' ? 'MA History' : 'BA History',
                            'economics': user.program === 'pg' ? 'MA Economics' : 'BA Economics',
                            'jmc': user.program === 'pg' ? 'MA JMC' : 'BA JMC'
                        }[user.department as string] || user.department?.toUpperCase()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400 text-sm">Wallet</p>
                    <p className="text-xl font-bold text-green-400">₹{user.walletBalance}</p>
                </div>
            </div>

            {renderActionArea()}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="glass-panel p-8 max-w-sm w-full border border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-white">Select Payment Method</h3>
                        <p className="mb-6 text-gray-300">Pay ₹10 to activate your coupon.</p>

                        {loading ? (
                            <div className="flex justify-center my-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 mt-6">
                                <button
                                    onClick={() => handleAction('pay_direct')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-600 font-bold shadow-lg border border-gray-500"
                                >
                                    <span>💳</span> Wallet (Bal: ₹{user.walletBalance})
                                </button>

                                <button
                                    onClick={handleRazorpayPayment}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-lg border border-blue-400"
                                >
                                    <span>📱</span> UPI / Online
                                </button>

                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="mt-2 px-4 py-2 text-gray-400 hover:text-white text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
        </div>
    );
}
