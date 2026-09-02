'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyPaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your payment securely... Please wait.');

    useEffect(() => {
        const paymentStatus = searchParams.get('cf_order_status');
        const orderIdParam = searchParams.get('order_id');

        if (!orderIdParam) {
            setStatus('error');
            setMessage('Missing order ID. Cannot verify payment.');
            return;
        }

        if (paymentStatus !== 'PAYMENT_COMPLETED') {
            setStatus('error');
            setMessage('Payment was not completed or was cancelled.');
            return;
        }

        // Proceed to verify payment with backend
        fetch(`/api/payment/verify?orderId=${orderIdParam}`)
            .then(res => res.json())
            .then(data => {
                if (data.paid && data.coupon) {
                    setStatus('success');
                    setMessage('Payment verified successfully! Redirecting...');
                    // Redirect back to dashboard with a success flag
                    setTimeout(() => {
                        router.replace('/dashboard?payment_success=true');
                    }, 1000);
                } else {
                    setStatus('error');
                    setMessage(`Verification failed: ${data.message || 'Payment not completed or pending.'}`);
                }
            })
            .catch(err => {
                console.error('Verification error:', err);
                setStatus('error');
                setMessage('Failed to connect to verification server. Please try again.');
            });
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="glass-panel p-8 max-w-md w-full text-center space-y-6">
                
                {status === 'verifying' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-500 animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-cyan-400 animate-spin" style={{ animationDirection: 'reverse' }}></div>
                        </div>
                        <h2 className="text-xl font-bold text-white">Verifying Payment</h2>
                        <p className="text-gray-400 text-sm">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/50 text-green-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                        </div>
                        <h2 className="text-xl font-bold text-green-400">Payment Confirmed!</h2>
                        <p className="text-gray-300 text-sm">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50 text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        </div>
                        <h2 className="text-xl font-bold text-red-400">Verification Failed</h2>
                        <p className="text-gray-300 text-sm">{message}</p>
                        <button 
                            onClick={() => router.replace('/dashboard')}
                            className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium transition-colors border border-gray-700"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                )}
                
            </div>
        </div>
    );
}

export default function VerifyPaymentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-t-indigo-500 animate-spin"></div>
            </div>
        }>
            <VerifyPaymentContent />
        </Suspense>
    );
}
