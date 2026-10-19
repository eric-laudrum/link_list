import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    categoryWeights: { type: Map, of: Number, default: {} }
});

export const Store = mongoose.model('Store', storeSchema);