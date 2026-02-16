const { isBookingOpen, getNextLunchDate } = require('../lib/time');

// Mocking the environment for TS -> JS execution if needed, 
// but easier to just write pure JS logic I used.

function test() {
    console.log("--- Time Debug ---");
    const now = new Date();
    console.log("System Now:", now.toISOString());
    console.log("System Local String:", now.toString());

    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    console.log("IST String:", istString);

    const istDate = new Date(istString);
    console.log("Parsed IST Date:", istDate.toString());
    console.log("IST Hours:", istDate.getHours());

    const hours = istDate.getHours();
    const isOpen = (hours >= 15 && hours < 20);
    console.log(`Is Open (15-20)? ${isOpen} (Hours: ${hours})`);

    console.log("------------------");
}

test();
