---
description: Student payment success → automatically scroll to coupon generated page
---

# Workflow: Student Payment → Auto-scroll to Coupon Page

## Overview

After a student completes payment (via **Wallet** or **UPI/QR**), the app must:
1. Close the payment modal / QR modal
2. Fetch the freshly generated coupon from the database
3. Automatically scroll to the coupon card on screen — without any manual action by the student

---

## How It Works (Implementation in `StudentDashboard.tsx`)

### Key Components

| Piece | Purpose |
|---|---|
| `couponRef` | A `useRef<HTMLDivElement>` attached to the coupon card `<div>` |
| `pendingScrollRef` | A `useRef<boolean>` flag — set `true` before fetching coupon after payment |
| `useEffect([coupon])` | Watches the `coupon` state; when coupon appears AND flag is `true`, scrolls to `couponRef` |

### Why `useEffect` + `ref` Instead of `setTimeout + scrollTo(top:0)`

- React state updates are **async** — the coupon card doesn't exist in the DOM until React re-renders
- `scrollTo({ top: 0 })` scrolls the window, but the coupon card may not be at `top: 0` (e.g. on mobile)
- `ref.scrollIntoView()` fires only when the coupon `<div>` is actually in the DOM

---

## Payment Paths and Their Scroll Triggers

### Path 1: Wallet Payment (`pay_direct`)
**Location:** `handleAction('pay_direct')` in `StudentDashboard.tsx`

```
handleAction('pay_direct')
  → setShowPaymentModal(false)
  → pendingScrollRef.current = true     ← set flag
  → await fetchCoupon()                 ← updates coupon state
    → useEffect([coupon]) fires
      → couponRef.current.scrollIntoView(smooth)   ← scroll!
```

### Path 2: UPI/QR Payment (in-app polling)
**Location:** Polling `useEffect` watching `paymentLinkId`

```
pollRef interval fires every 3s
  → GET /api/payment/qr-status
  → data.paid === true
    → stopPolling()
    → setShowQrModal(false)
    → pendingScrollRef.current = true   ← set flag
    → await fetchCoupon()               ← updates coupon state
      → useEffect([coupon]) fires
        → couponRef.current.scrollIntoView(smooth)
```

### Path 3: Razorpay Redirect (student taps UPI app link)
**Location:** Second `useEffect` watching `searchParams`

```
Page loads with ?razorpay_payment_link_status=paid in URL
  → setMessage('Payment confirmed...')
  → setTimeout 1500ms (wait for DB webhook write)
    → pendingScrollRef.current = true   ← set flag
    → await fetchCoupon()               ← updates coupon state
      → useEffect([coupon]) fires
        → couponRef.current.scrollIntoView(smooth)
    → window.history.replaceState('/dashboard')   ← clean URL
```

---

## Files Involved

- `components/dashboard/StudentDashboard.tsx` — main implementation
- `app/api/payment/qr-status/route.ts` — UPI payment status polling endpoint
- `app/api/payment/qr-create/route.ts` — creates Razorpay payment link
- `app/api/coupon/book/route.ts` — returns student's active coupon

---

## Debugging Checklist (if auto-scroll stops working)

1. **Is `couponRef` attached?**
   - The coupon `<div>` with `ref={couponRef}` must be the `coupon.status === 'active'` card, not a wrapper
   - Check: `if (!coupon || coupon.status === 'polled')` renders a different card — `couponRef` won't be on it

2. **Is `pendingScrollRef.current` being set to `true` BEFORE `fetchCoupon()`?**
   - If set after, the `useEffect` may already have fired with the new coupon value

3. **Is `fetchCoupon()` actually updating `coupon` state?**
   - `fetchCoupon()` only calls `setCoupon` if `data.coupon` is truthy
   - If DB hasn't written the coupon yet, fetch returns nothing → coupon state unchanged → `useEffect` doesn't fire
   - **Fix:** Increase the 1500ms delay on the Razorpay redirect path, or add retry logic in `fetchCoupon`

4. **Is the coupon already in state when the modal closes?**
   - If `coupon` was already set before payment (shouldn't happen, but check), the `useEffect` won't fire again since the same value doesn't trigger it

---

## Adding This Feature to a New Dashboard

1. Add `const couponRef = useRef<HTMLDivElement | null>(null);`
2. Add `const pendingScrollRef = useRef(false);`
3. Add the scroll effect:
   ```tsx
   useEffect(() => {
     if (coupon && pendingScrollRef.current) {
       pendingScrollRef.current = false;
       setTimeout(() => {
         couponRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
       }, 100);
     }
   }, [coupon]);
   ```
4. Before every `fetchCoupon()` call that should trigger a scroll, set `pendingScrollRef.current = true;`
5. Attach `ref={couponRef}` to the coupon card `<div>`
