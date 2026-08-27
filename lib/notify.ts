import nodemailer from 'nodemailer';
import webpush from 'web-push';
import PushSubscription from '@/models/PushSubscription';
import connectToDatabase from '@/lib/db';

const transporter = process.env.EMAIL_SERVER_HOST ? nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
}) : null;

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:admin@digiplate.com',
        vapidPublicKey,
        vapidPrivateKey
    );
}

export async function sendPushNotification(userId: string, title: string, body: string, url: string = '/') {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.log(`[PUSH MOCK] To User ${userId}: ${title} - ${body}`);
        return;
    }

    try {
        await connectToDatabase();
        const subscriptions = await PushSubscription.find({ userId });

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`[PUSH MOCK] No subscriptions for user ${userId}. Message: ${title}`);
            return;
        }

        const payload = JSON.stringify({
            title,
            body,
            url
        });

        // Send to all registered devices for this user
        const pushPromises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payload);
            } catch (err: any) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Subscription has expired or is no longer valid
                    console.log('Subscription has expired or is invalid, removing from DB.');
                    await PushSubscription.findByIdAndDelete(sub._id);
                } else {
                    console.error('Error sending push notification:', err);
                }
            }
        });

        await Promise.all(pushPromises);
        console.log(`[PUSH SUCCESS] Sent to user ${userId}`);

    } catch (error: any) {
        console.error(`[PUSH ERROR] Failed to send to user ${userId}:`, error.message);
    }
}

export async function sendEmail(email: string, subject: string, html: string) {
    if (!transporter) {
        console.log(`[EMAIL MOCK] To ${email}, Subject: ${subject}`);
        return;
    }
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject,
        html,
    });
}
