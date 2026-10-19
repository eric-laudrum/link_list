import { Router } from 'express';
import { Store } from '../models/index.ts';

const router = Router();

router.get('/', async (req, res) => {
    const stores = await Store.find().sort({ name: 1 });
    res.json(stores);
});

router.post('/', async (req, res) => {
    const newStore = await Store.create({
        name: req.body.name,
        categoryWeights: req.body.categoryWeights || {}
    });
    res.json(newStore);
});

router.get('/:id', async (req, res) => {
    const store = await Store.findById(req.params.id);
    res.json(store);
});

router.delete('/:id', async (req, res) => {
    await Store.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

export default router;