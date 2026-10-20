import express from 'express';
import { List } from '../models';

const router = express.Router();

// GET lists scoped only to this browser session
router.get('/', async (req, res) => {
    try {
        const { clientId } = req.query;
        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        // Only finds lists matching the device's ID
        const lists = await List.find({ clientId }).sort({ createdAt: -1 });
        res.json(lists);
    } catch (error) {
        console.error('Error fetching lists:', error);
        res.status(500).json({ error: 'Server error' });
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
        const { id } = req.params;
        const { clientId } = req.query;

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        const deletedList = await List.findOneAndDelete({ _id: id, clientId });
        if (!deletedList) {
            return res.status(404).json({ error: 'List not found or unauthorized' });
        }

        res.json({ message: 'List deleted successfully' });
    } catch (error) {
        console.error('Error deleting list:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;