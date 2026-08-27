'use client';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';

export default function StudentDashboard({ user }: { user: any }) {
    const [coupon, setCoupon] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Countdown timer for morning payment window
    const [countdown, setCountdown] = useState('');

    // UPI Payment Link state
    const [showQrModal, setShowQrModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkId, setLinkId] = useState('');
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // Canteen Status State
    const [settings, setSettings] = useState<any>({ mealType: 'Rice', isOpen: true, closingReason: '' });
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();

    // Ref to the coupon card — used to scroll into view after payment
    const couponRef = useRef<HTMLDivElement | null>(null);
    // Flag: scroll to coupon on next render
    const pendingScrollRef = useRef(false);

    useEffect(() => {
        fetchCoupon();
        fetchSettings();
        return () => stopPolling();
    }, []);

    // Live countdown to 10:00 AM IST — shown when student has polled and is on meal morning
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
            const deadline = new Date(istNow);
            deadline.setUTCHours(4, 30, 0, 0); // 10:00 AM IST = 04:30 UTC
            const diff = deadline.getTime() - istNow.getTime();
            if (diff <= 0) { setCountdown('00:00:00'); return; }
            const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
            const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
            const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
            setCountdown(`${h}:${m}:${s}`);
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, []);

    // Handle Cashfree redirect back to dashboard after payment
    // Cashfree appends ?cf_link_status=PAID&link_id=...
    useEffect(() => {
        const paymentStatus = searchParams.get('cf_link_status');
        const linkIdParam = searchParams.get('link_id');

        if (paymentStatus === 'PAID' && linkIdParam) {
            setMessage('✅ Verifying payment securely...');

            // Hit the qr-status endpoint to verify the payment and generate the coupon
            fetch(`/api/payment/qr-status?linkId=${linkIdParam}`)
                .then(res => res.json())
                .then(data => {
                    if (data.paid && data.coupon) {
                        pendingScrollRef.current = true;
                        setCoupon(data.coupon);
                        setMessage('✅ Payment Successful! Your meal coupon is ready.');
                    } else {
                        pendingScrollRef.current = true;
                        fetchCoupon(); // Fallback
                    }
                })
                .catch(err => {
                    console.error('Failed to verify payment link redirect', err);
                    fetchCoupon(); // Fallback
                })
                .finally(() => {
                    // Clean the URL so params don't persist on refresh
                    window.history.replaceState({}, '', '/dashboard');
                });
        }
    }, [searchParams]);

    // Scroll to coupon card whenever coupon state changes AND a scroll is pending
    useEffect(() => {
        if (coupon && pendingScrollRef.current) {
            pendingScrollRef.current = false;
            // Small timeout lets React flush the DOM update first
            setTimeout(() => {
                couponRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [coupon]);


    // Auto-poll Cashfree Payment Link status every 3 seconds
    useEffect(() => {
        if (!linkId || !showQrModal) return;
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/payment/qr-status?linkId=${linkId}&mealType=${settings.mealType}`);
                if (!res.ok) return; // Silent skip for polling error
                const data = await res.json().catch(() => ({}));
                if (data.paid) {
                    stopPolling();
                    setShowQrModal(false);
                    setMessage('✅ Payment Successful! Your meal coupon is ready.');
                    pendingScrollRef.current = true;
                    // Use coupon from qr-status response directly (already saved to DB)
                    if (data.coupon) {
                        setCoupon(data.coupon);
                    } else {
                        // Fallback: fetch from DB
                        await fetchCoupon();
                    }
                }
            } catch (e) {
                console.error('Poll error:', e);
            }
        }, 3000);
        return () => stopPolling();
    }, [linkId, showQrModal]);

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    async function fetchCoupon(retries = 2): Promise<any> {
        try {
            const res = await fetch('/api/coupon/book');
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.coupon) {
                    setCoupon(data.coupon);
                    return data.coupon;
                } else if (retries > 0) {
                    // Coupon may not be written to DB yet (webhook delay) — retry after 2s
                    await new Promise(r => setTimeout(r, 2000));
                    return fetchCoupon(retries - 1);
                }
            }
        } catch (e) { console.error(e); }
        return null;
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
                    closingReason: data.closingReason || '',
                    sideDishes: data.sideDishes || [],
                });
                setSettingsLoaded(true);
            }
        } catch (e) {
            console.error(e);
            setSettingsLoaded(true);
        }
    }

    const handleAction = async (action: 'poll' | 'request' | 'pay' | 'pay_direct') => {
        setLoading(true);
        const mealToCheck = settings.mealType;
        setMessage(action === 'poll' ? 'Submitting Poll...' : action === 'request' ? 'Requesting...' : 'Processing Payment...');
        try {
            const res = await fetch('/api/coupon/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, mealType: mealToCheck })
            });
            const data = await res.json().catch(() => ({ message: 'Server error (HTML response)' }));
            if (res.ok || data.coupon) {
                if (action === 'poll') setMessage('Poll Submitted! Now request approval.');
                if (action === 'request') setMessage('Request Sent! Waiting for Admin Approval.');
                if (action === 'pay' || action === 'pay_direct') {
                    setMessage('✅ Payment Successful! Coupon Generated.');
                    setShowPaymentModal(false);
                    // Use the coupon already returned in the API response
                    if (data.coupon) {
                        pendingScrollRef.current = true;
                        setCoupon(data.coupon);
                    } else {
                        // Fallback: fetch from DB
                        pendingScrollRef.current = true;
                        await fetchCoupon();
                    }
                } else {
                    setCoupon(data.coupon);
                }
            } else {
                setMessage(`Error: ${data.message}`);
            }
        } catch (err) {
            setMessage('Action Failed');
        } finally {
            setLoading(false);
        }
    };

    // Creates a Cashfree Payment Link → shows QR code of its link URL
    const handleUpiQrPayment = async () => {
        setLoading(true);
        setMessage('Creating Payment Link...');
        try {
            const res = await fetch('/api/payment/qr-create', { method: 'POST' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to create payment');
            }
            const data = await res.json().catch(() => ({}));
            setLinkUrl(data.linkUrl);
            setLinkId(data.linkId);
            setShowPaymentModal(false);
            setShowQrModal(true);
            setMessage('');
        } catch (error: any) {
            console.error(error);
            setMessage(`❌ ${error.message}`);
        } finally {
            setLoading(false);
        }
    };


    const handleCloseQrModal = () => {
        stopPolling();
        setShowQrModal(false);
        setLinkUrl('');
        setLinkId('');
    };

    const isTester = user?.email?.toLowerCase() === 'teststudent@digiplate.com';

    const renderActionArea = () => {
        if (!settingsLoaded) return <p className="text-white text-center">Loading Canteen Status...</p>;

        if (!settings.isOpen && (!coupon || coupon.status === 'polled')) {
            return (
                <div className="glass-panel p-6 text-center border border-red-500/30 bg-red-900/10">
                    <h2 className="text-xl font-bold text-red-400 mb-4">Canteen Closed Tomorrow</h2>
                    <p className="text-white text-lg mb-2">🚫 No Meals Available</p>
                    {settings.closingReason && <p className="text-gray-300 italic">" {settings.closingReason} "</p>}
                    <button disabled className="mt-6 glass-button bg-gray-600 cursor-not-allowed w-full opacity-50">Booking Disabled</button>
                </div>
            );
        }

        if (!coupon || coupon.status === 'polled') {
            const mealName = settings.mealType === 'Rice' ? 'Rice (ചോറ്)' : settings.mealType === 'Porridge' ? 'Kanji (കഞ്ഞി)' : settings.mealType;
            const isPolled = coupon?.status === 'polled';

            // Determine current IST hour to show correct state
            // teststudent bypasses all time gates — can act at any hour
            const istHour = new Date(Date.now() + 5.5 * 60 * 60 * 1000).getUTCHours();
            const isMorningWindow = isTester || (istHour >= 6 && istHour < 10);   // 6–10 AM: pay for today
            const isPaymentExpired = !isTester && (istHour >= 10 && isPolled);     // Past 10 AM: poll deleted
            const isPollingHours = isTester || (istHour >= 15 && istHour < 20);   // 3–8 PM: poll or pay

            // State: Polled, but payment window has expired (10 AM passed without paying)
            if (isPaymentExpired) {
                return (
                    <div className="p-6 text-center rounded-xl border border-red-500/30 bg-red-900/10 w-full max-w-md mx-auto">
                        <h2 className="text-xl font-bold text-red-400 mb-3">❌ Payment Window Expired</h2>
                        <p className="text-gray-300 mb-2">You polled but did not pay before 10:00 AM.</p>
                        <p className="text-gray-400 text-sm">Your poll has been cancelled. You can poll again from 3:00 PM today for tomorrow's meal.</p>
                    </div>
                );
            }

            // State: Polled yesterday, now it's meal morning (6–10 AM) — show Pay button
            if (isPolled && isMorningWindow) {
                return (
                    <div className="p-6 text-center rounded-xl border border-yellow-500/40 bg-yellow-900/20 w-full max-w-md mx-auto">
                        <h2 className="text-xl font-bold text-yellow-300 mb-1">⏰ Pay to Confirm Your Meal</h2>
                        <p className="text-gray-300 text-sm mb-4">You polled! Pay ₹10 before 10:00 AM to activate your coupon.</p>
                        <div className="bg-black/30 rounded-lg p-3 mb-5 border border-yellow-500/30">
                            <p className="text-xs text-gray-400 uppercase mb-1">Time Remaining</p>
                            <p className="text-3xl font-mono font-bold text-yellow-300 animate-pulse">{countdown}</p>
                            <p className="text-xs text-gray-500 mt-1">Payment closes at 10:00 AM</p>
                        </div>
                        <button onClick={() => setShowPaymentModal(true)} disabled={loading}
                            className="glass-button bg-green-600 hover:bg-green-700 w-full border-2 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] mb-3">
                            💰 Pay ₹10 Now (Get Coupon)
                        </button>
                        {message && <p className="mt-3 text-sm text-gray-300">{message}</p>}
                    </div>
                );
            }

            // State: Polled, but not yet morning (waiting for next day)
            if (isPolled && !isMorningWindow) {
                return (
                    <div className="p-6 text-center rounded-xl border border-yellow-500/30 bg-yellow-900/20 w-full max-w-md mx-auto">
                        <h2 className="text-xl font-bold text-yellow-300 mb-2">✅ Polled for Tomorrow!</h2>
                        <p className="text-gray-300 text-sm mb-1">Come back tomorrow morning between</p>
                        <p className="text-yellow-400 font-bold text-lg mb-4">6:00 AM – 10:00 AM</p>
                        <p className="text-gray-400 text-sm">to pay ₹10 and activate your meal coupon. If you don't pay before 10:00 AM, your poll will be cancelled.</p>
                    </div>
                );
            }

            // State: No coupon yet — show booking options during polling hours
            return (
                <div className="p-6 text-center rounded-xl shadow-lg border border-gray-700 bg-[#0b121e] w-full max-w-md mx-auto">
                    <h2 className="text-xl font-semibold mb-2 text-white">Meal Booking</h2>
                    <p className="text-gray-300 mb-1">for Tomorrow ({new Date(new Date().setDate(new Date().getDate() + 1)).toLocaleDateString('en-IN')})</p>
                    <p className="text-yellow-400 text-sm font-bold mb-4 bg-yellow-900/20 py-1 px-3 rounded-full inline-block border border-yellow-500/30">
                        🕒 Polling Time: 3:00 PM – 8:00 PM
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
                    {isPollingHours ? (
                        <div className="flex flex-col gap-4 max-w-sm mx-auto">
                            <button onClick={() => handleAction('poll')} disabled={loading}
                                className="glass-button w-full border border-orange-400/50 hover:bg-orange-500/20 text-orange-200">
                                ✋ Poll Only
                                <span className="block text-xs text-orange-300/70 mt-0.5">Pay tomorrow morning (6–10 AM)</span>
                            </button>
                            <button onClick={() => setShowPaymentModal(true)} disabled={loading}
                                className="glass-button bg-green-600 hover:bg-green-700 w-full border-2 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]">
                                ⚡ Poll & Pay Now (₹10)
                                <span className="block text-xs text-green-200/70 mt-0.5">Get your coupon immediately</span>
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-gray-400 text-sm">Booking opens at <span className="text-yellow-400 font-bold">3:00 PM</span> today.</p>
                            <button disabled className="mt-4 glass-button bg-gray-700 cursor-not-allowed w-full opacity-50">Booking Not Open Yet</button>
                        </div>
                    )}
                    {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}
                </div>
            );
        }

        if (coupon.status === 'active') {
            const mealDisplay = coupon.mealType === 'Rice' ? 'Rice (ചോറ്)' : coupon.mealType === 'Porridge' ? 'Kanji (കഞ്ഞി)' : (coupon.mealType || 'Rice (ചോറ്)');
            const validDate = new Date(coupon.validForDate);

            const downloadCouponJPEG = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                canvas.width = 600;
                canvas.height = 900;

                // BG
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Header
                ctx.fillStyle = '#22c55e';
                ctx.font = 'bold 50px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('MEAL COUPON', canvas.width / 2, 80);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '20px Arial';
                ctx.fillText('DIGIPLATE VERIFICATION', canvas.width / 2, 120);

                // QR Code
                const svg = document.querySelector('.qr-container svg');
                if (svg) {
                    const xml = new XMLSerializer().serializeToString(svg);
                    const svg64 = btoa(unescape(encodeURIComponent(xml)));
                    const image64 = 'data:image/svg+xml;base64,' + svg64;

                    const img = new Image();
                    img.onload = () => {
                        // White square for QR
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(canvas.width / 2 - 160, 160, 320, 320);
                        ctx.drawImage(img, canvas.width / 2 - 150, 170, 300, 300);

                        // Info
                        ctx.textAlign = 'left';
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 32px Arial';
                        ctx.fillText(`Student: ${user.name}`, 60, 540);

                        ctx.font = 'bold 32px Arial';
                        ctx.fillStyle = '#f97316'; // orange-500
                        ctx.fillText(`Meal: ${mealDisplay}`, 60, 590);

                        ctx.fillStyle = '#fde047'; // yellow-300
                        ctx.font = '24px Arial';
                        let sideDishesText = coupon.sideDishes?.length > 0 ? coupon.sideDishes.join(', ') : 'No Sides';
                        if (sideDishesText.length > 40) sideDishesText = sideDishesText.substring(0, 37) + '...';
                        ctx.fillText(`Sides: ${sideDishesText}`, 60, 640);

                        ctx.fillStyle = '#ffffff';
                        ctx.font = '28px Arial';
                        ctx.fillText(`Date: ${validDate.toLocaleDateString()}`, 60, 690);
                        ctx.fillText(`Code: ${coupon.code}`, 60, 740);

                        ctx.fillStyle = '#94a3b8';
                        ctx.font = '24px Arial';
                        ctx.fillText(`Valid until 3:00 PM`, 60, 790);

                        // Branding footer
                        ctx.fillStyle = '#1e293b';
                        ctx.fillRect(0, 840, 600, 60);
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 24px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('N M S M GOVT COLLEGE KALPETTA', canvas.width / 2, 880);

                        const link = document.createElement('a');
                        link.download = `Coupon_${coupon.code}.jpg`;
                        link.href = canvas.toDataURL('image/jpeg', 0.9);
                        link.click();
                    };
                    img.src = image64;
                }
            };

            return (
                <div ref={couponRef} className="glass-panel p-6 flex flex-col items-center max-w-sm mx-auto border-2 border-green-500/30">
                    <div className="w-full border-b border-white/10 pb-4 mb-4 text-center">
                        <h2 className="text-xl font-bold text-green-400">MEAL COUPON</h2>
                        <p className="text-xs text-green-300/70 uppercase tracking-widest mt-1">DigiPlate Verification</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-4 border-white shadow-2xl mb-6 qr-container">
                        <QRCode value={coupon.code} size={180} />
                    </div>
                    <div className="w-full space-y-3 text-left bg-black/20 p-4 rounded-lg">
                        <div>
                            <p className="text-xs text-gray-400 uppercase">Student Name</p>
                            <p className="text-lg font-bold text-white">{user.name}</p>
                        </div>
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
                        <div className="border-t border-white/10 pt-2 mt-2">
                            <p className="text-xs text-gray-400 uppercase mb-1">Side Dishes</p>
                            <p className="text-sm text-white font-medium">{coupon.sideDishes?.length > 0 ? coupon.sideDishes.join(', ') : 'No Sides'}</p>
                        </div>
                        <div className="border-t border-white/10 pt-2 mt-2">
                            <p className="text-xs text-gray-400 uppercase">Validity</p>
                            <p className="text-sm text-yellow-300">Valid until 3:00 PM</p>
                        </div>
                        <div className="pt-2 border-t border-white/10 mt-2">
                            <p className="text-xs text-gray-500 font-mono text-center tracking-widest">{coupon.code}</p>
                        </div>
                    </div>

                    <button
                        onClick={downloadCouponJPEG}
                        className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all border border-indigo-400/50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                        Download Coupon (JPEG)
                    </button>
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

            <div className="bg-[#0b121e] p-4 sm:p-6 mb-6 flex flex-wrap justify-between items-center gap-3 rounded-xl border border-gray-800 shadow-lg mt-12">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome, {user.name}</h1>
                    <p className="text-gray-400 text-sm">
                        {{ 'cs': 'B.Sc Computer Science', 'chemistry': 'B.Sc Chemistry', 'commerce': user.program === 'pg' ? 'M.Com' : 'B.Com', 'history': user.program === 'pg' ? 'MA History' : 'BA History', 'economics': user.program === 'pg' ? 'MA Economics' : 'BA Economics', 'jmc': user.program === 'pg' ? 'MA JMC' : 'BA JMC' }[user.department as string] || user.department?.toUpperCase()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400 text-sm">Wallet</p>
                    <p className="text-xl font-bold text-green-400">₹{user.walletBalance}</p>
                </div>
            </div>

            {renderActionArea()}

            {/* Payment Method Selection Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="glass-panel p-8 max-w-sm w-full border border-gray-700">
                        <h3 className="text-xl font-bold mb-2 text-white">Select Payment Method</h3>
                        <p className="mb-6 text-gray-300">Pay ₹10 to activate your coupon.</p>
                        {loading ? (
                            <div className="flex flex-col items-center my-6 gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <p className="text-gray-400 text-sm">{message || 'Processing...'}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 mt-6">
                                <button onClick={() => handleAction('pay_direct')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-600 font-bold shadow-lg border border-gray-500">
                                    <span>💳</span> Wallet (Bal: ₹{user.walletBalance})
                                </button>
                                <button onClick={handleUpiQrPayment}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold shadow-lg border border-blue-400">
                                    <span>📱</span> Pay via UPI / QR Code
                                </button>
                                <button onClick={() => setShowPaymentModal(false)} className="mt-2 px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* UPI QR Code Payment Modal */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-[#0d1829] border border-blue-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-blue-900/30 my-4">
                        {/* Header */}
                        <div className="text-center mb-4">
                            <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Secure UPI Payment</p>
                            <h3 className="text-2xl font-bold text-white">Pay ₹10</h3>
                            <p className="text-gray-400 text-sm mt-1">Scan the QR code or tap an app below</p>
                        </div>

                        {/* QR Code — encodes Cashfree payment link URL */}
                        <div className="flex justify-center mb-4">
                            {linkUrl ? (
                                <div className="bg-white p-3 rounded-xl shadow-lg border-4 border-white">
                                    <QRCode value={linkUrl} size={200} />
                                </div>
                            ) : (
                                <div className="w-[228px] h-[228px] bg-white/10 rounded-xl flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-white/10"></div>
                            <p className="text-gray-500 text-xs">OR tap to open app</p>
                            <div className="flex-1 h-px bg-white/10"></div>
                        </div>

                        {/* UPI App Icons — clicking opens Cashfree payment page */}
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            {[
                                { name: 'PhonePe', icon: '/upi-icons/phonepe.svg', bg: '#5f259f' },
                                { name: 'Google Pay', icon: '/upi-icons/googlepay.svg', bg: '#ffffff' },
                                { name: 'Paytm', icon: '/upi-icons/paytm.svg', bg: '#ffffff' },
                                { name: 'FamPay', icon: '/upi-icons/fampay.svg', bg: '#FFD700' },
                                { name: 'Navi', icon: '/upi-icons/navi.svg', bg: '#1B1F3B' },
                                { name: 'BHIM UPI', icon: '/upi-icons/bhim.svg', bg: '#FF6B00' },
                            ].map((app) => (
                                <button
                                    key={app.name}
                                    onClick={() => linkUrl && (window.location.href = linkUrl)}
                                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-white/10 transition-all active:scale-90"
                                >
                                    <div
                                        className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center border border-white/10"
                                        style={{ backgroundColor: app.bg }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={app.icon}
                                            alt={app.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="text-white/80 text-[10px] font-medium leading-tight text-center">{app.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Waiting Indicator */}
                        <div className="flex items-center justify-center gap-2 bg-blue-950/40 border border-blue-500/20 rounded-xl py-3 mb-4">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 flex-shrink-0"></div>
                            <p className="text-blue-300 text-sm font-medium">Waiting for payment confirmation...</p>
                        </div>

                        <p className="text-center text-gray-600 text-xs mb-3">QR code expires in 30 minutes · Powered by Cashfree</p>

                        {/* Cancel */}
                        <button onClick={handleCloseQrModal}
                            className="w-full py-2 text-gray-400 hover:text-white text-sm border border-gray-700 rounded-lg hover:border-gray-500 transition-colors">
                            Cancel Payment
                        </button>

                    </div>
                </div>
            )}
        </div>
    );
}
