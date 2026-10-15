import mongoose from 'mongoose';

// Grocery Items
const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    orderWeight: { type: Number, default: 100 },
    checked: { type: Boolean, default: false }
});

// Grocery Lists
const listSchema = new mongoose.Schema({
    name: { type: String, required: true },
    items: [itemSchema]
});

export const List = mongoose.model('List', listSchema);