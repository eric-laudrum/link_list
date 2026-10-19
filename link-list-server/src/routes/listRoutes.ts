import { Router } from 'express';
import { List } from '../models/index.ts';

const router = Router();

router.get('/', async (req, res) => {
    const lists = await List.find().sort({ createdAt: -1 });
    res.json(lists);
});

router.post('/', async (req, res) => {
    const newList = await List.create({ name: req.body.name, items: [] });
    res.json(newList);
});

router.delete('/:id', async (req, res) => {
    await List.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

export default router;