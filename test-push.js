require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

const subSchema = new mongoose.Schema({}, { strict: false });
const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', subSchema, 'pushsubscriptions');

const webpush = require('web-push');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (vapidPublicKey && vapidPrivateKey) {
        webpush.setVapidDetails('mailto:admin@digiplate.com', vapidPublicKey, vapidPrivateKey);
    } else {
        console.log("No VAPID keys found in .env.local");
        process.exit(1);
    }

    const subscriptions = await PushSubscription.find({});
    console.log(`Found ${subscriptions.length} total push subscriptions in DB.`);

    const students = await User.find({ role: 'student' });
    console.log(`Found ${students.length} students in DB.`);

    let count = 0;
    for (const student of students) {
        const studentSubs = await PushSubscription.find({ userId: student._id.toString() });
        console.log(`Student ${student.email} has ${studentSubs.length} subscriptions.`);
        
        for (const sub of studentSubs) {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, JSON.stringify({
                    title: '🔔 Polling is now OPEN!',
                    body: 'Book your meal for tomorrow (Test Manual Trigger).',
                    url: '/'
                }));
                console.log(`Successfully sent push to student ${student.email}`);
                count++;
            } catch (err) {
                console.log(`Failed to send to ${student.email}:`, err.message);
            }
        }
    }
    console.log(`Successfully sent ${count} push notifications.`);
    process.exit(0);
}

run();
