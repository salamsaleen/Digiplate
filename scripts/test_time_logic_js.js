function test() {
    console.log("--- Time Debug ---");
    const now = new Date();
    // Use an explicit IST date string from now if possible
    // Using string manipulation since `Intl.DateTimeFormat` works in Node.

    // Simulate what `isBookingOpen` does:
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    const hours = istDate.getHours();

    console.log("System Now:", now.toISOString());
    console.log("IST String (from toLocaleString):", istString);
    console.log("Parsed 'istDate':", istDate.toString(), "(Hours:", hours, ")");

    const isOpen = (hours >= 15 && hours < 20);
    console.log(`Is Open (15-20)? ${isOpen}`);

    // Simulate `getNextLunchDate`:
    const tomorrow = new Date(istDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0); // Noon
    console.log("Next Lunch Date (Tomorrow Noon IST):", tomorrow.toString());

    // Simulate `redeem` validation check for TODAY (13th) vs Tomorrow (14th)
    // Create a fake coupon for TOMORROW
    // validForDate: tomorrow

    const validDate = tomorrow;
    console.log("\n--- Validation Check (Redeeming 'Future' Coupon) ---");
    // Simulate Scanning NOW (istDate)

    // Check if dates match (Year, Month, Date)
    const isSameDay =
        istDate.getFullYear() === validDate.getFullYear() &&
        istDate.getMonth() === validDate.getMonth() &&
        istDate.getDate() === validDate.getDate();

    console.log(`Scanning Today (${istDate.toDateString()}) vs Coupon for (${validDate.toDateString()})`);
    console.log(`isSameDay? ${isSameDay}`);

    if (!isSameDay) {
        if (istDate < validDate) {
            console.log("Validation: Coupon valid for FUTURE DATE (not today). Correct.");
        } else {
            console.log("Validation: Coupon EXPIRED (Date Passed).");
        }
    } else {
        if (istDate.getHours() >= 15) {
            console.log("Validation: Coupon EXPIRED (Time limit 3:00 PM passed).");
        } else {
            console.log("Validation: Valid for Today.");
        }
    }
}

test();
