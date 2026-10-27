import { Router } from 'express';
import { Dictionary } from '../models/index.ts';
import { CATEGORY_WEIGHTS, ITEM_VARIANTS, setDictionaryState } from '../utils/dictionary.ts';

const router = Router();

router.get('/', async (req, res) => {
    try {
        let dict = await Dictionary.findOne();
        if (!dict) {
            dict = await Dictionary.create({ itemVariants: {} });
        }
        res.json(dict);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dictionary' });
    }
});

router.post('/', async (req, res) => {
    const { categoryWeights, itemDictionary, itemVariants } = req.body;
    const dict = await Dictionary.findOneAndUpdate(
        {},
        { categoryWeights, itemDictionary, itemVariants },
        { new: true, upsert: true }
    );
    setDictionaryState(categoryWeights, itemDictionary, itemVariants);
    res.json(dict);
});

router.get('/variants', (req, res) => {
    res.json(ITEM_VARIANTS);
});

router.get('/categories', (req, res) => {
    res.json(CATEGORY_WEIGHTS);
});

export default router;
