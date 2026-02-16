const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/digiplate').then(() => check()).catch(console.error);

async function check() {
    try {
        const SystemSettings = mongoose.model('SystemSettings', new mongoose.Schema({
            date: Date, sideDishes: [String]
        }));

        // Calculate Tomrrow Ranges
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const start = new Date(tomorrow); start.setHours(0, 0, 0, 0);
        const end = new Date(tomorrow); end.setHours(23, 59, 59, 999);

        console.log('--- Query Range ---');
        console.log('Start:', start.toISOString());
        console.log('End:  ', end.toISOString());

        const settings = await SystemSettings.findOne({ date: { $gte: start, $lt: end } });
        console.log('--- Result ---');
        if (settings) {
            console.log('Settings Found for Tomorrow ID:', settings._id);
            console.log('Side Dishes in DB:', JSON.stringify(settings.sideDishes));
        } else {
            console.log('No Settings Found for Tomorrow!');
        }

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
        process.exit(0);
    }
}
