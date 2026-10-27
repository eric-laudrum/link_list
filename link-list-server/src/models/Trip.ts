import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
    listId: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
    items: { type: Array, default: [] }
});

export const Trip = mongoose.model('Trip', tripSchema);