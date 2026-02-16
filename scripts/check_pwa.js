
try {
    const pwa = require("@ducanh2912/next-pwa");
    console.log("Require success:", pwa);
    console.log("Default:", pwa.default);
} catch (e) {
    console.error(e);
}
