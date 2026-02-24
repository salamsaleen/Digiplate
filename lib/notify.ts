import twilio from 'twilio';
import nodemailer from 'nodemailer';

const client = process.env.TWILIO_ACCOUNT_SID ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;
const transporter = process.env.EMAIL_SERVER_HOST ? nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
}) : null;

export async function sendSMS(phone: string, message: string) {
    if (!client) {
        console.log(`[SMS MOCK] To ${phone}: ${message}`);
        return;
    }
    // Propagate error
    await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
    });
}

export async function sendWhatsApp(phone: string, message: string) {
    if (!client) {
        console.log(`[WhatsApp MOCK] To ${phone}: ${message}`);
        return;
    }
    const to = `whatsapp:${phone.startsWith('+') ? phone : '+91' + phone}`;
    const from = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

    console.log(`[WhatsApp Attempt] From: ${from}, To: ${to}`);

    try {
        await client.messages.create({
            body: message,
            from: from,
            to: to,
        });
        console.log(`[WhatsApp SUCCESS] Sent to ${to}`);
    } catch (error: any) {
        console.error(`[WhatsApp ERROR] Failed to send to ${to}:`, error.message);
        // We don't throw here to prevent the whole API request from failing, 
        // but it will be visible in the server logs.
    }
}

export async function sendEmail(email: string, subject: string, html: string) {
    if (!transporter) {
        console.log(`[EMAIL MOCK] To ${email}, Subject: ${subject}`);
        // If we are in mock mode, maybe user forgot to set env?
        // But for now, just logging is fine as per original design.
        return;
    }
    // Propagate error to API route
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject,
        html,
    });
}
