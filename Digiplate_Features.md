# DigiPlate - Complete Features Documentation

DigiPlate is a comprehensive digital meal coupon and canteen management system built to streamline the process of meal polling, payments, and redemption for educational institutions. The platform caters to multiple user roles, each with a tailored dashboard and specific permissions.

---

## 1. User Roles
The system operates with four distinct roles:
- **Student:** The end-users who book and consume meals.
- **Canteen Staff:** The personnel responsible for serving meals, scanning coupons, and tracking daily estimates.
- **Department Admin:** Faculty or staff responsible for overseeing students in their specific department.
- **Super Admin:** The highest authority overseeing the entire system, managing admins, and viewing global analytics.

---

## 2. Student Features
- **Smart Dashboard:** A real-time personalized dashboard displaying the student's active coupons and system status.
- **Meal Polling (3:00 PM - 8:00 PM):** Students can "poll" (express interest) for tomorrow's meal.
- **UPI / QR Code Payments:** Students pay ₹10 directly via a secure Cashfree UPI payment gateway to confirm their booking.
- **Email Receipts:** Transaction details and payment confirmations are automatically sent to the user's email ID.
- **Digital QR Coupons:** Once paid, a unique digital QR code is generated on their device, which acts as their meal ticket.
- **Coupon Transfer:** Students who cannot attend can securely transfer their active coupon to another student using their email address.
- **Coupon History:** A complete log of all past bookings, redemptions, and expired coupons.
- **Manual Requests:** In cases of offline payment, students can request a manual coupon approval from their Department Admin.
- **Push Notifications:** Automated Web Push notifications (and WhatsApp alerts) remind students when polling opens, when payments are due, and when coupons are successfully generated.

---

## 3. Canteen Staff Features
- **Real-Time Canteen Dashboard:** A live overview of operations.
- **QR Code Scanner:** Built-in web camera integration (`react-qr-scanner`) allowing staff to instantly scan a student's digital coupon to redeem their meal.
- **Manual Redemption:** An option to manually enter a 6-8 character coupon code if the student's camera or screen is broken.
- **Menu Management:** Staff can set the daily menu/side dishes (e.g., Rice with pickle and curry).
- **Advanced Forecasting:** 
  - Staff can view exactly how many meals are estimated for "Today" and toggle to view estimates for "Tomorrow".
  - Estimates combine both confirmed (paid) coupons and polled (unpaid) interest.
- **PDF Reporting:** Staff can generate Daily, Weekly, or Monthly PDF reports showing Financial Status, Meals Served, and Unredeemed Meals, complete with exact timestamps.

---

## 4. Department Admin Features
- **Department Oversight:** A focused dashboard showing statistics solely for their assigned department (e.g., Computer Science).
- **Student Management:** Admins can add new students, edit details, or remove them.
- **Credentials Distribution:** Admins can trigger automated emails to send login credentials to newly added students.

---

## 5. Super Admin Features
- **Global Overview:** A top-level dashboard displaying total system revenue, total coupons issued, and overall redemption rates.
- **Staff Management:** The Super Admin can create and manage Department Admins and Canteen Staff accounts.
- **Comprehensive PDF Reports:** Ability to generate detailed, multi-department financial reports (Daily, Weekly, Monthly) that include revenue breakdown by department.
- **System Settings:** Control over core platform configurations.

---

## 6. Automations & Background Tasks (Cron)
- **Time-gated Access:** 
  - Polling is strictly restricted to 3:00 PM - 8:00 PM the day before.
  - Payment confirmation is open from 6:00 AM - 10:00 AM on the day of the meal.
- **Coupon Expiration:** A cron job runs daily at 3:00 PM to automatically mark any unredeemed coupons from that day as "Expired".
- **Reminders:** Automated cron jobs trigger push notifications at strategic times (e.g., 7:55 PM) to warn students that the polling window is about to close.

---

## 7. Technical Stack
- **Frontend / Backend:** Next.js (App Router), React, Tailwind CSS
- **Database:** MongoDB (Mongoose)
- **Payments:** Cashfree UPI Payment Links
- **Progressive Web App (PWA) & TWA:** The app can be installed directly on a smartphone home screen (PWA), and integrates via Trusted Web Activity (TWA) for seamless Android native deployment.
- **PDF Generation:** `jspdf` and `jspdf-autotable`

<div style="page-break-after: always;"></div>

# Complete Time Management

DigiPlate operates on strict time-based rules to ensure precise canteen forecasting and avoid confusion. The system automatically enables and disables features based on the current time (IST).

## 1. Polling Window (3:00 PM to 8:00 PM)
*Applies to the day **before** the meal.*
- **What is Working:**
  - Students can log in and click "Poll Only" or "Poll & Pay Now" for tomorrow's lunch.
  - Canteen Staff can view real-time estimates for "Tomorrow", which actively update as students poll.
- **What is NOT Working:**
  - Students cannot poll for tomorrow if it is before 3:00 PM or after 8:00 PM.
  - The "Poll" buttons are disabled and visually state "Booking Closed".

## 2. Morning Payment Window (6:00 AM to 10:00 AM)
*Applies to the **day of** the meal.*
- **What is Working:**
  - Students who successfully polled the previous night can log in and pay their ₹10 via UPI to secure their coupon.
  - Students can view the live countdown timer showing exactly how much time is left to pay.
- **What is NOT Working:**
  - Students who missed polling the day before cannot book a new meal.
  - After 10:00 AM, all pending (polled but unpaid) requests are locked, and no more payments can be made for that day's lunch.

## 3. Meal Redemption Window (10:00 AM to 3:00 PM)
*Applies to the **day of** the meal.*
- **What is Working:**
  - Students with an active (paid) coupon can show their QR code at the canteen counter.
  - Canteen Staff can actively scan QR codes or manually enter the code to mark the meal as "Redeemed".
- **What is NOT Working:**
  - Students cannot pay or create new coupons for today.
  - Polling for tomorrow's meal has not opened yet.

## 4. End of Day Expiry (3:00 PM)
*Applies to the **day of** the meal.*
- **What happens:**
  - The system automatically transitions any Active coupons that were never scanned into an **Expired** state.
  - This ensures that coupons cannot be carried over to the next day.
  - Simultaneously, the system opens up the Polling Window for the *next* day's lunch.

## 5. Timely Notifications & Automated Reminders (Cron Schedule)
To ensure smooth operations, the system sends timely notifications to users.
- **7:55 PM (Polling Closes Soon):** A "Hurry Up!" push notification is sent to all **active** students who haven't polled yet, reminding them that the polling window closes in 5 minutes.
- **9:00 AM (Payment Reminder):** A reminder is sent to all students who polled but haven't paid yet, warning them that the payment window (active payment option) closes at 10:00 AM.
- **Option Activity States:**
  - **Polling Option:** Active only between 3 PM and 8 PM. Inactive at all other times.
  - **Payment Option:** Active only between 6 AM and 10 AM. Inactive at all other times.
  - **QR Code Scanning (Redemption):** Active only between 10 AM and 3 PM. Inactive at all other times.
