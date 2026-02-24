import mongoose, { Schema, model, models } from 'mongoose';

const SystemTaskSchema = new Schema({
    taskType: {
        type: String,
        required: true,
        enum: ['polling_reminder']
    },
    date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        default: 'success'
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure unique task per day
SystemTaskSchema.index({ taskType: 1, date: 1 }, { unique: true });

const SystemTask = models.SystemTask || model('SystemTask', SystemTaskSchema);

export default SystemTask;
