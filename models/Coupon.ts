import mongoose, { Schema, model, models } from 'mongoose';

const CouponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    department: {
        type: String,
        required: true, // Snapshot of student's department at time of booking
    },
    // polled: student said "I will eat" -> requested: I want a coupon -> approved -> active -> redeemed
    status: {
        type: String,
        enum: ['polled', 'requested', 'approved', 'active', 'redeemed', 'expired', 'transferred', 'rejected'],
        default: 'polled',
    },
    validForDate: {
        type: Date, // The specific date this coupon is valid for (lunch)
        required: true,
    },
    mealType: {
        type: String,
        default: 'Rice', // Default until dynamic selection is fully used
    },
    redeemedAt: {
        type: Date,
    },
    sideDishes: {
        type: [String],
    },
    transferredTo: {
        type: Schema.Types.ObjectId, // If transferred, who owns it now? Or simpler: update studentId and log history
        ref: 'User',
    },
    originalOwnerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    paymentId: { type: String }, // Cashfree Order ID (from link_orders[0].order_id)
    orderId: { type: String },   // Cashfree Payment Link ID
    amountPaid: { type: Number, default: 10 }, // Actual amount paid in ₹
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index to ensure a student can only book one coupon per day (unless transferred?)
// The requirement said "one coupon can use at once", implying limit.
// Let's enforce 1 active booking per student per day for simplicity initially.
CouponSchema.index({ studentId: 1, validForDate: 1 }, { unique: true });

// Force delete model to allow schema update in dev mode
if (process.env.NODE_ENV === 'development' && models.Coupon) {
    delete models.Coupon;
}

const Coupon = models.Coupon || model('Coupon', CouponSchema);

export default Coupon;
