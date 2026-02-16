export function getISTDate(): Date {
    const now = new Date();
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    return new Date(istString);
}

export function isBookingOpen(): { open: boolean; message?: string } {
    const istDate = getISTDate();
    const hours = istDate.getHours();

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
