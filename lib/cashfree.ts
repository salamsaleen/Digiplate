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

export interface CashfreePaymentLinkParams {
    linkId: string;          // Unique ID you generate
    amount: number;          // In rupees (NOT paise — Cashfree uses actual INR amount)
    purpose: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;   // 10-digit Indian mobile number required
    expiryTime: string;      // ISO 8601 e.g. "2025-01-01T18:00:00+05:30"
    returnUrl: string;       // Redirect after payment
}

export interface CashfreePaymentLink {
    link_id: string;
    link_url: string;
    link_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED' | string;
    link_orders?: Array<{ order_id: string; order_amount: number }>;
    cf_link_id?: number;
}

/**
 * Creates a Cashfree Payment Link.
 * Returns the link_id (for polling) and link_url (for QR code).
 */
export async function createPaymentLink(
    params: CashfreePaymentLinkParams
): Promise<{ linkId: string; linkUrl: string }> {
    const body = {
        link_id: params.linkId,
        link_amount: params.amount,
        link_currency: 'INR',
        link_purpose: params.purpose,
        customer_details: {
            customer_name: params.customerName,
            customer_email: params.customerEmail,
            customer_phone: params.customerPhone,
        },
        link_expiry_time: params.expiryTime,
        link_notify: { send_sms: false, send_email: false },
        link_auto_reminders: false,
        link_meta: {
            return_url: params.returnUrl,
        },
    };

    const res = await fetch(`${getBaseUrl()}/links`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            err?.message || `Cashfree createPaymentLink failed: ${res.status}`
        );
    }

    const data: CashfreePaymentLink = await res.json();
    return { linkId: data.link_id, linkUrl: data.link_url };
}

/**
 * Fetches the current status of a Cashfree Payment Link.
 */
export async function fetchPaymentLink(linkId: string): Promise<CashfreePaymentLink> {
    const res = await fetch(`${getBaseUrl()}/links/${encodeURIComponent(linkId)}`, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            err?.message || `Cashfree fetchPaymentLink failed: ${res.status}`
        );
    }

    return res.json();
}
