const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/digiplate').then(() => run()).catch(console.error);

async function run() {
    try {
        console.log('--- Clearing Data ---');

        // Define minimal schemas to access collections
        const SystemSettings = mongoose.model('SystemSettings', new mongoose.Schema({}, { strict: false }));
        const Coupon = mongoose.model('Coupon', new mongoose.Schema({}, { strict: false }));
        // Not deleting Users

        // Delete Coupons
        const deletedCoupons = await Coupon.deleteMany({});
        console.log(`Deleted ${deletedCoupons.deletedCount} Coupons.`);

        // Delete System Settings
        const deletedSettings = await SystemSettings.deleteMany({});
        console.log(`Deleted ${deletedSettings.deletedCount} SystemSettings.`);

        console.log('--- Data Cleared Successfully ---');

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
}
