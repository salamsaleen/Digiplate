// Returns the current time as an IST Date object
export function getISTDate(): Date {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset);
}

// Returns true if polling is open (3:00 PM – 8:00 PM IST, day before meal)
export function isBookingOpen(email?: string): { open: boolean; message?: string } {
    // Bypass for test users only — sandbox mode obeys real time
    const testers = ['teststudent@digiplate.com'];
    if (email && testers.includes(email.toLowerCase())) {
        console.log(`[TIME_LOG] Bypass granted for tester: ${email}`);
        return { open: true };
    }

    const hours = getISTDate().getHours();
    console.log(`[TIME_LOG] isBookingOpen check. IST Hours: ${hours}`);

    if (hours >= 15 && hours < 20) {
        return { open: true };
    }

    return {
        open: false,
        message: 'Polling is only open from 3:00 PM to 8:00 PM'
    };
}

// Returns true if the morning payment window is open (6:00 AM – 10:00 AM IST, on meal day)
export function isPaymentOpen(email?: string): { open: boolean; message?: string } {
    // Bypass for test users only — sandbox mode obeys real time
    const testers = ['teststudent@digiplate.com'];
    if (email && testers.includes(email.toLowerCase())) {
        console.log(`[TIME_LOG] Payment bypass granted for tester: ${email}`);
        return { open: true };
    }

    const hours = getISTDate().getHours();
    console.log(`[TIME_LOG] isPaymentOpen check. IST Hours: ${hours}`);

    if (hours >= 6 && hours < 10) {
        return { open: true };
    }

    return {
        open: false,
        message: 'Payment window is 6:00 AM – 10:00 AM on meal day only'
    };
}

// Returns the next lunch date (tomorrow) as a UTC Date representing midnight IST
// FIX: Previously added IST offset + 1 day, causing a +2 day bug in evenings
export function getNextLunchDate(): Date {
    const now = new Date();
    // Shift to IST by adding 5h30m
    const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    const istNow = new Date(istMs);
    // Move to tomorrow in IST
    istNow.setUTCDate(istNow.getUTCDate() + 1);
    // Set to midnight IST (00:00 IST = 18:30 UTC previous day)
    istNow.setUTCHours(0, 0, 0, 0);
    // Convert back to UTC for DB storage
    return new Date(istNow.getTime() - 5.5 * 60 * 60 * 1000);
}

// Returns today's lunch date (the meal day itself) — used when paying on meal morning
export function getTodayLunchDate(): Date {
    const now = new Date();
    const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    const istNow = new Date(istMs);
    // Today in IST, midnight
    istNow.setUTCHours(0, 0, 0, 0);
    return new Date(istNow.getTime() - 5.5 * 60 * 60 * 1000);
}
