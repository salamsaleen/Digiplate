/**
 * lib/cashfree.ts
 * Shared helper for Cashfree Payment Gateway API calls.
 * Uses native fetch — no SDK required.
 */

const CASHFREE_API_VERSION = '2023-08-01';

function getBaseUrl(): string {
    return process.env.CASHFREE_ENV === 'PRODUCTION'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
}

function getHeaders(): HeadersInit {
    return {
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        'x-api-version': CASHFREE_API_VERSION,
        'Content-Type': 'application/json',
    };
}

export interface CashfreeOrderParams {
    orderId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    returnUrl: string;
}

export interface CashfreeOrder {
    order_id: string;
    order_status: string;
    payment_session_id: string;
}

/**
 * Creates a Cashfree Order.
 * Returns the order_id and payment_session_id (for the JS SDK).
 */
export async function createOrder(
    params: CashfreeOrderParams
): Promise<{ orderId: string; paymentSessionId: string }> {
    const body = {
        order_id: params.orderId,
        order_amount: params.amount,
        order_currency: 'INR',
        customer_details: {
            customer_id: params.orderId, // customer_id is required, using orderId as fallback unique id
            customer_name: params.customerName,
            customer_email: params.customerEmail,
            customer_phone: params.customerPhone,
        },
        order_meta: {
            return_url: params.returnUrl,
        },
    };

    const res = await fetch(`${getBaseUrl()}/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            err?.message || `Cashfree createOrder failed: ${res.status}`
        );
    }

    const data: CashfreeOrder = await res.json();
    return { orderId: data.order_id, paymentSessionId: data.payment_session_id };
}

/**
 * Fetches the current status of a Cashfree Order.
 */
export async function fetchOrder(orderId: string): Promise<CashfreeOrder> {
    const res = await fetch(`${getBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            err?.message || `Cashfree fetchOrder failed: ${res.status}`
        );
    }

    return res.json();
}
