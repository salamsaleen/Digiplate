import mongoose, { Schema, model, models } from 'mongoose';

const PushSubscriptionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    endpoint: {
        type: String,
        required: true,
    },
    keys: {
        auth: { type: String, required: true },
        p256dh: { type: String, required: true },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Avoid OverwriteModelError in Next.js development
const PushSubscription = models.PushSubscription || model('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;
