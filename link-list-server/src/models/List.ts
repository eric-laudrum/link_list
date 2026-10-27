import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    checked: { type: Boolean, default: false },
    unavailable: { type: Boolean, default: false },
    quantity: { type: Number, default: 1 }
});

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, default: 'Other' },
    orderWeight: { type: Number, default: 200 },
    variants: [variantSchema]
});

const listSchema = new mongoose.Schema({
    name: { type: String, required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
    items: [itemSchema],
    clientId: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now }
});

export const List = mongoose.model('List', listSchema);