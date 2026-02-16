import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    phone: {
        type: String,
        required: [true, 'Please provide a phone number'],
        unique: true,
    },
    password: {
        type: String, // Will be hashed
        required: [true, 'Please provide a password'],
    },
    role: {
        type: String,
        enum: ['student', 'dept_admin', 'super_admin', 'canteen_staff'],
        default: 'student',
    },
    department: {
        type: String,
        enum: [
            'cs',
            'chemistry',
            'history',
            'economics',
            'jmc',
            'commerce',
            'admin', // For super admin
            'canteen', // For canteen staff
        ],
        required: true,
    },
    program: {
        type: String,
        enum: ['ug', 'pg'], // ug = BA/B.Sc/B.Com, pg = MA/M.Sc/M.Com
        default: 'ug',
    },
    walletBalance: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const User = models.User || model('User', UserSchema);

export default User;
