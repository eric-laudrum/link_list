import { Server, Socket } from 'socket.io';
import { List, Dictionary, Store } from '../models';
import {
    getItemMetadata,
    ITEM_VARIANTS,
    ITEM_DICTIONARY,
    resolveItemInput,
    CATEGORY_WEIGHTS
} from '../utils/dictionary.ts';

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
        try {
            const list = await List.findById(listId);
            if (!list) return;

            list.storeId = storeId || null;

            if (!storeId) {
                list.items.forEach(item => {
                    const meta = getItemMetadata(item.name);
                    item.category = meta.category;
                    item.orderWeight = meta.orderWeight;
                });
            } else {
                const store = await Store.findById(storeId);
                if (store) {
                    list.items.forEach(item => {
                        const lowerName = item.name.toLowerCase();
                        if (store.itemDictionary && store.itemDictionary.has(lowerName)) {
                            const customCat = store.itemDictionary.get(lowerName) as string;
                            item.category = customCat;
                            item.orderWeight = store.categoryWeights?.get(customCat) ?? 200;
                        } else {
                            const meta = getItemMetadata(item.name);
                            if (store.categoryWeights && store.categoryWeights.has(meta.category)) {
                                item.category = meta.category;
                                item.orderWeight = store.categoryWeights.get(meta.category) as number;
                            } else {
                                item.category = meta.category;
                                item.orderWeight = 200;
                            }
                        }
                    });
                }
            }

            list.markModified('items');
            await list.save();
            io.to(listId).emit('list-data', list);
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('update-item-category', async ({ listId, itemId, category, orderWeight }) => {
        try {
            const list = await List.findById(listId);
            if (!list) return;

            let store;
            if (!list.storeId) {
                store = await Store.create({
                    name: `${list.name} Layout`,
                    categoryWeights: {
                        ...CATEGORY_WEIGHTS,
                        [category]: orderWeight
                    },
                    itemDictionary: {}
                });
                list.storeId = store._id.toString();
            } else {
                store = await Store.findById(list.storeId);
                if (store && store.categoryWeights) {
                    store.categoryWeights.set(category, orderWeight);
                }
            }

            const item = list.items.id(itemId);
            if (item) {
                item.category = category;
                item.orderWeight = orderWeight;
                if (store) {
                    if (!store.itemDictionary) store.itemDictionary = new Map();
                    store.itemDictionary.set(item.name.toLowerCase(), category);
                    await store.save();
                }
            }

            list.markModified('items');
            await list.save();
            io.to(listId).emit('list-data', list);
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('rename-category', async ({ listId, oldCategory, newCategory, currentWeight }) => {
        try {
            const list = await List.findById(listId);
            if (!list) return;

            let store;
            if (!list.storeId) {
                const weights = { ...CATEGORY_WEIGHTS };
                weights[newCategory] = weights[oldCategory] ?? currentWeight;
                delete weights[oldCategory];

                store = await Store.create({
                    name: `${list.name} Layout`,
                    categoryWeights: weights,
                    itemDictionary: {}
                });
                list.storeId = store._id.toString();
            } else {
                store = await Store.findById(list.storeId);
                if (store && store.categoryWeights) {
                    const existingWeight = store.categoryWeights.get(oldCategory) ?? currentWeight;
                    store.categoryWeights.delete(oldCategory);
                    store.categoryWeights.set(newCategory, existingWeight);
                }
            }

            if (store) {
                if (!store.itemDictionary) store.itemDictionary = new Map();
                list.items.forEach(item => {
                    if (item.category === oldCategory) {
                        item.category = newCategory;
                        store.itemDictionary?.set(item.name.toLowerCase(), newCategory);
                    }
                });
                await store.save();
            }

            list.markModified('items');
            await list.save();
            io.to(listId).emit('list-data', list);
        } catch (error) {
            console.error(error);
        }
    });

}