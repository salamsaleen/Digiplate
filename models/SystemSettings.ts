import mongoose, { Schema, model, models } from 'mongoose';

const SystemSettingsSchema = new Schema({
    date: {
        type: Date,
        required: true,
        unique: true, // Only one settings doc per day
    },
    mealType: {
        type: String,
        enum: ['Rice', 'Porridge', 'Both', 'None'],
        default: 'Rice',
    },
    isOpen: {
        type: Boolean,
        default: true,
    },
    closingReason: {
        type: String,
        default: '',
    },
    sideDishes: {
        type: [String],
        default: ['പപ്പടം', 'അച്ചാർ', 'ഉപ്പേരി'],
    },
    updatedBy: {
        type: Schema.Types.ObjectId, // Who updated this?
        ref: 'User',
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Force delete model to allow schema update in dev mode
if (process.env.NODE_ENV === 'development' && models.SystemSettings) {
    delete models.SystemSettings;
}

const SystemSettings = models.SystemSettings || model('SystemSettings', SystemSettingsSchema);

export default SystemSettings;
