import { Server, Socket } from 'socket.io';
import { List, Dictionary } from '../models/index.ts';
import { getItemMetadata, ITEM_VARIANTS, ITEM_DICTIONARY, resolveItemInput } from '../utils/dictionary.ts';

export function registerListHandlers(io: Server, socket: Socket) {
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

            const lowerCleanedName = cleanedName.toLowerCase();
            if (!ITEM_DICTIONARY[lowerCleanedName]) {
                ITEM_DICTIONARY[lowerCleanedName] = category;
                const dict = await Dictionary.findOne();
                if (dict && dict.itemVariants) {
                    dict.itemVariants.set(cleanedName, ITEM_VARIANTS[cleanedName]);
                    await dict.save();
                }

            }

            if (vName !== 'Default') {
                if (!ITEM_VARIANTS[cleanedName]) ITEM_VARIANTS[cleanedName] = [];
                if (!ITEM_VARIANTS[cleanedName].includes(cleanedVariantName)) {
                    ITEM_VARIANTS[cleanedName].push(cleanedVariantName);
                    const dict = await Dictionary.findOne();
                    if (dict && dict.itemVariants) {
                        dict.itemVariants.set(cleanedName, ITEM_VARIANTS[cleanedName]);
                        await dict.save();
                    }
                }
            }

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

            list.markModified('items');
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
                    list.markModified('items');
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
                    if (checked) variant.unavailable = false;
                    list.markModified('items');
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
                    if (unavailable) variant.checked = false;
                    list.markModified('items');
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
                item.variants = item.variants.filter((v: any) => v._id.toString() !== variantId) as any;
                if (item.variants.length === 0) {
                    list.items = list.items.filter((i: any) => i._id.toString() !== itemId) as any;
                }
                list.markModified('items');
                await list.save();
                io.to(listId).emit('list-data', list);
            }
        }
    });

    socket.on('update-list-store', async ({ listId, storeId }) => {
        const list = await List.findByIdAndUpdate(
            listId,
            { storeId: storeId || null },
            { new: true }
        );
        if (list) io.to(listId).emit('list-data', list);
    });

    socket.on('update-item-category', async ({ listId, itemId, category, orderWeight }) => {
        const list = await List.findOneAndUpdate(
            { _id: listId, 'items._id': itemId },
            { $set: { 'items.$.category': category, 'items.$.orderWeight': orderWeight } },
            { new: true }
        );
        if (list) io.to(listId).emit('list-data', list);
    });
}