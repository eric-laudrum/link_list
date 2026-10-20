import express from 'express';
import { List } from '../models';

const router = express.Router();

// GET lists scoped only to this browser session
router.get('/', async (req, res) => {
    try {
        const { clientId, joinedIds } = req.query;
        const orConditions: any[] = [];

        // 1 - Get lists this specific device created
        if (clientId) {
            orConditions.push({ clientId });
        }

        // 2 - Get shared lists
        if (typeof joinedIds === 'string' && joinedIds.trim() !== '') {
            const idsArray = joinedIds.split(',');
            orConditions.push({ _id: { $in: idsArray } });
        }

        // If no ID is provided, return nothing
        if (orConditions.length === 0) {
            return res.json([]);
        }

        // Search the database for lists matching either condition
        const lists = await List.find({ $or: orConditions }).sort({ createdAt: -1 });
        res.json(lists);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch lists' });
    }
});

// POST new list with browser's ID
router.post('/', async (req, res) => {
    try {
        const { name, storeId, items, clientId } = req.body;
        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        const newList = await List.create({ name, storeId, items, clientId });
        res.status(201).json(newList);
    } catch (error) {
        console.error('Error creating list:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE list
router.delete('/:id', async (req, res) => {
    try {
        const { clientId } = req.query;
        const list = await List.findById(req.params.id);

        if (!list) return res.status(404).json({ error: 'List not found' });

        if (list.clientId === clientId) {
            list.clientId = 'orphaned';
            await list.save();
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to remove list' });
    }
});

export default router;