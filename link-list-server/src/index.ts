import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { List } from './models.ts';
import { getItemMetadata, ITEM_VARIANTS, CATEGORY_WEIGHTS, resolveItemInput } from './utils/dictionary.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@link-list.nltrce5.mongodb.net/link-list`;
mongoose.connect(uri).catch(() => console.error('Database connection failed'));

app.get('/lists', async (req, res) => {
    const lists = await List.find().sort({ createdAt: -1 });
    res.json(lists);
});

app.post('/lists', async (req, res) => {
    const newList = await List.create({ name: req.body.name, items: [] });
    res.json(newList);
});

app.delete('/lists/:id', async (req, res) => {
    await List.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.get('/dictionary/variants', (req, res) => {
    res.json(ITEM_VARIANTS);
});

app.get('/dictionary/categories', (req, res) => {
    res.json(CATEGORY_WEIGHTS);
});

io.on('connection', (socket) => {
    socket.on('join-list', async (listId) => {
        socket.join(listId);
        const list = await List.findById(listId);
        if (list) socket.emit('list-data', list);
    });

    socket.on('add-item', async ({ listId, name, variantName }) => {
        const list = await List.findById(listId);
        if (list) {
            const { resolvedName, resolvedVariant } = resolveItemInput(name, variantName || '');

            const cleanedName = resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1);
            const { category, orderWeight } = getItemMetadata(cleanedName);

            const vName = resolvedVariant || 'Default';
            const cleanedVariantName = vName.charAt(0).toUpperCase() + vName.slice(1);

            const existingItem = list.items.find(i => i.name.toLowerCase() === cleanedName.toLowerCase());

            if (existingItem) {
                const existingVariant = existingItem.variants.find(v => v.name.toLowerCase() === cleanedVariantName.toLowerCase());
                if (existingVariant) {
                    existingVariant.quantity += 1;
                } else {
                    existingItem.variants.push({ name: cleanedVariantName, quantity: 1, checked: false, unavailable: false });
                }
            } else {
                list.items.push({
                    name: cleanedName,
                    category,
                    orderWeight,
                    variants: [{ name: cleanedVariantName, quantity: 1, checked: false, unavailable: false }]
                });
            }

            await list.save();
            io.to(listId).emit('list-data', list);
        }
    });

    socket.on('update-variant-quantity', async ({ listId, itemId, variantId, quantity }) => {
        const list = await List.findById(listId);
        if (list) {
            const item = list.items.find(i => i._id.toString() === itemId);
            if (item) {
                const variant = item.variants.find(v => v._id.toString() === variantId);
                if (variant) {
                    variant.quantity = Math.max(1, Number(quantity));
                    await list.save();
                    io.to(listId).emit('list-data', list);
                }
            }
        }
    });

    socket.on('toggle-variant-check', async ({ listId, itemId, variantId, checked }) => {
        const list = await List.findById(listId);
        if (list) {
            const item = list.items.find(i => i._id.toString() === itemId);
            if (item) {
                const variant = item.variants.find(v => v._id.toString() === variantId);
                if (variant) {
                    variant.checked = checked;
                    if (checked) variant.unavailable = false; // Unmark unavailable if found
                    await list.save();
                    io.to(listId).emit('list-data', list);
                }
            }
        }
    });

    socket.on('toggle-variant-unavailable', async ({ listId, itemId, variantId, unavailable }) => {
        const list = await List.findById(listId);
        if (list) {
            const item = list.items.find(i => i._id.toString() === itemId);
            if (item) {
                const variant = item.variants.find(v => v._id.toString() === variantId);
                if (variant) {
                    variant.unavailable = unavailable;
                    if (unavailable) variant.checked = false; // Uncheck if marked unavailable
                    await list.save();
                    io.to(listId).emit('list-data', list);
                }
            }
        }
    });

    socket.on('remove-variant', async ({ listId, itemId, variantId }) => {
        const list = await List.findById(listId);
        if (list) {
            const item = list.items.find(i => i._id.toString() === itemId);
            if (item) {
                // Manually filter out the variant
                item.variants = item.variants.filter((v: any) => v._id.toString() !== variantId) as any;

                // If no variants are left, remove the entire item
                if (item.variants.length === 0) {
                    list.items = list.items.filter((i: any) => i._id.toString() !== itemId) as any;
                }
                await list.save();
                io.to(listId).emit('list-data', list);
            }
        }
    });
    socket.on('update-item-category', async ({ listId, itemId, category, orderWeight }) => {
        const list = await List.findOneAndUpdate(
            { _id: listId, 'items._id': itemId },
            { $set: { 'items.$.category': category, 'items.$.orderWeight': orderWeight } },
            { new: true }
        );
        if (list) io.to(listId).emit('list-data', list);
    });
});

server.listen(3001, () => console.log('Server running on port 3001'));