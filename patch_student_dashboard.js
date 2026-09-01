const fs = require('fs');

let content = fs.readFileSync('components/dashboard/StudentDashboard.tsx', 'utf8');

// 1. Add import
content = content.replace(`import QRCode from 'react-qr-code';\nimport { useRouter } from 'next/navigation';`, `import QRCode from 'react-qr-code';\nimport { useRouter } from 'next/navigation';\nimport { load } from '@cashfreepayments/cashfree-js';`);

// 2. Remove states
content = content.replace(/\/\/ UPI Payment Link state[\s\S]*?const pollRef = useRef<NodeJS\.Timeout \| null>\(null\);/, '');

// 3. Update useEffect for redirect
content = content.replace(/const paymentStatus = searchParams\.get\('cf_link_status'\);/, `const paymentStatus = searchParams.get('cf_order_status');`);
content = content.replace(/const linkIdParam = searchParams\.get\('link_id'\);/, `const orderIdParam = searchParams.get('order_id');`);
content = content.replace(/paymentStatus === 'PAID' && linkIdParam/, `paymentStatus === 'PAYMENT_COMPLETED' && orderIdParam`);
content = content.replace(/\/api\/payment\/qr-status\?linkId=\$\{linkIdParam\}/, `/api/payment/verify?orderId=\${orderIdParam}`);
content = content.replace(/failed to verify payment link redirect/, `Failed to verify payment redirect`);

// 4. Remove polling useEffect
content = content.replace(/\/\/ Auto-poll Cashfree Payment Link status every 3 seconds[\s\S]*?return \(\) => stopPolling\(\);\n    }, \[linkId, showQrModal\]\);/, '');

// 5. Remove stopPolling function
content = content.replace(/const stopPolling = \(\) => \{[\s\S]*?pollRef\.current = null;\n        \}\n    \};/, '');

// 6. Remove stopPolling from main useEffect cleanup
content = content.replace(/return \(\) => stopPolling\(\);/, '');

// 7. Replace handleUpiQrPayment
const oldHandler = /\/\/ Creates a Cashfree Payment Link[\s\S]*?finally \{\n            setLoading\(false\);\n        \}\n    \};/;
const newHandler = `// Creates a Cashfree Order → Launches Cashfree SDK Checkout
    const handlePayment = async () => {
        setLoading(true);
        setMessage('Initializing Payment...');
        try {
            const res = await fetch('/api/payment/order', { method: 'POST' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to create payment');
            }
            const data = await res.json().catch(() => ({}));
            
            // Initialize Cashfree SDK
            const env = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox';
            const cashfree = await load({ mode: env });
            
            cashfree.checkout({
                paymentSessionId: data.paymentSessionId,
                // returnUrl is already configured on backend, but SDK might use it if redirect is needed
            });
            setMessage('Opening secure checkout...');
        } catch (error: any) {
            console.error(error);
            setMessage(\`❌ \${error.message}\`);
            setLoading(false);
        }
    };`;
content = content.replace(oldHandler, newHandler);

// 8. Remove handleCloseQrModal
content = content.replace(/const handleCloseQrModal = \(\) => \{[\s\S]*?setLinkId\(''\);\n    \};/, '');

// 9. Update button onClick handlers
content = content.replace(/onClick={handleUpiQrPayment}/g, 'onClick={handlePayment}');

// 10. Remove the entire JSX for the modal
content = content.replace(/\{\/\* UPI QR Code Payment Modal \*\/\}[\s\S]*?\{\/\* Cancel \*\/\}[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\)/, '');

fs.writeFileSync('components/dashboard/StudentDashboard.tsx', content);
console.log('Patched StudentDashboard.tsx');
