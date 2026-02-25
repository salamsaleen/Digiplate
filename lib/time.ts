export function getISTDate(): Date {
    const now = new Date();
    // UTC time + 5 hours 30 minutes
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate;
}

export function isBookingOpen(email?: string): { open: boolean; message?: string } {

    // ✅ GLOBAL BYPASS: If Razorpay is in test mode, skip all time restrictions
    if (process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) {
        console.log('[TIME_LOG] Razorpay test mode detected — bypassing time restriction');
        return { open: true };
    }

    const istDate = getISTDate();
    const hours = istDate.getHours();

    // Bypass for test users
    const testers = ['teststudent@digiplate.com'];
    if (email && testers.includes(email.toLowerCase())) {
        console.log(`[TIME_LOG] Bypass granted for tester: ${email}`);
        return { open: true };
    }

    console.log(`[TIME_LOG] Checking Booking Time. IST Hours: ${hours}`);

    if (hours >= 15 && hours < 20) {
        return { open: true };
    }

    return {
        open: false,
        message: 'Polling is only open from 3:00 PM to 8:00 PM'
    };
}


export function getNextLunchDate(): Date {
    const istDate = getISTDate();
    const tomorrow = new Date(istDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    return tomorrow;
}
