import mongoose from 'mongoose';
import { Dictionary } from './models/index.ts';
import { CATEGORY_WEIGHTS, ITEM_DICTIONARY, ITEM_VARIANTS, setDictionaryState } from './utils/dictionary.ts';

export async function connectDB(uri: string) {
    try {
        await mongoose.connect(uri);
        let dict = await Dictionary.findOne();
        if (!dict) {
            await Dictionary.create({
                categoryWeights: CATEGORY_WEIGHTS,
                itemDictionary: ITEM_DICTIONARY,
                itemVariants: ITEM_VARIANTS
            });
        } else {
            setDictionaryState(
                Object.fromEntries(dict.categoryWeights as any),
                Object.fromEntries(dict.itemDictionary as any),
                Object.fromEntries(dict.itemVariants as any)
            );
        }
    } catch (error) {
        console.error('Database connection failed');
    }
}