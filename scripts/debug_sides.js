const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/digiplate').then(() => check()).catch(err => { console.error(err); process.exit(1); });

async function check() {
    try {
        const SystemSettings = mongoose.model('SystemSettings', new mongoose.Schema({
            date: Date, sideDishes: [String]
        }));
        const Coupon = mongoose.model('Coupon', new mongoose.Schema({
            code: String, sideDishes: [String], createdAt: Date, validForDate: Date
        }));

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const start = new Date(tomorrow); start.setHours(0, 0, 0, 0);
        const end = new Date(tomorrow); end.setHours(23, 59, 59, 999);

        // Find settings
        const settings = await SystemSettings.findOne({ date: { $gte: start, $lt: end } });

        // Find latest coupon
        const coupon = await Coupon.findOne().sort({ createdAt: -1 });

        console.log(JSON.stringify({
            queryStart: start.toISOString(),
            queryEnd: end.toISOString(),
            settingsFound: !!settings,
            settings: settings ? settings.toObject() : null,
            latestCoupon: coupon ? coupon.toObject() : null
        }, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
}
