import { Router } from 'express';
import { Store, List } from '../models/index.ts';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const { clientId, joinedIds } = req.query;
        const orConditions: any[] = [];

        if (clientId) {
            orConditions.push({ clientId });
        }

        if (typeof joinedIds === 'string' && joinedIds.trim() !== '') {
            const idsArray = joinedIds.split(',');
            const joinedLists = await List.find({ _id: { $in: idsArray } });
            const joinedStoreIds = joinedLists.map(l => l.storeId).filter(Boolean);

            if (joinedStoreIds.length > 0) {
                orConditions.push({ _id: { $in: joinedStoreIds } });
            }
        }

        if (orConditions.length === 0) {
            return res.json([]);
        }

        const stores = await Store.find({ $or: orConditions }).sort({ name: 1 });
        res.json(stores);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stores' });
    }
});

router.post('/', async (req, res) => {
    try {
        const newStore = await Store.create({
            name: req.body.name,
            clientId: req.body.clientId,
            categoryWeights: req.body.categoryWeights || {},
            itemDictionary: req.body.itemDictionary || {}
        });
        res.json(newStore);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create store' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);
        res.json(store);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch store' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Store.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete store' });
    }
});

export default router;