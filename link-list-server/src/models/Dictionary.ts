import mongoose from 'mongoose';

const dictionarySchema = new mongoose.Schema({
    categoryWeights: { type: Map, of: Number },
    itemDictionary: { type: Map, of: String },
    itemVariants: { type: Map, of: [String] }
});

export const Dictionary = mongoose.model('Dictionary', dictionarySchema);