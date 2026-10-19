import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Item, GroceryList } from '../types';
import { SwipeableVariant } from './SwipeableVariant';

export function ListView({ listId, onBack }: { listId: string, onBack: () => void }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [list, setList] = useState<GroceryList | null>(null);
    const [itemName, setItemName] = useState('');
    const [variantName, setVariantName] = useState('');
    const [variantsDict, setVariantsDict] = useState<Record<string, string[]>>({});
    const [categoriesDict, setCategoriesDict] = useState<Record<string, number>>({});

    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetch('http://localhost:3001/dictionary/variants')
            .then(res => res.json())
            .then(setVariantsDict)
            .catch(() => {});

        fetch('http://localhost:3001/dictionary/categories')
            .then(res => res.json())
            .then(setCategoriesDict)
            .catch(() => {});
    }, []);

    useEffect(() => {
        const s = io('http://localhost:3001');
        setSocket(s);
        s.emit('join-list', listId);
        s.on('list-data', (updatedList: GroceryList) => setList(updatedList));
        return () => { s.disconnect(); };
    }, [listId]);

    const addItem = (e: React.FormEvent, directVariant?: string) => {
        e.preventDefault();
        const finalVariant = directVariant ?? variantName;
        if (!itemName.trim() || !socket) return;
        socket.emit('add-item', { listId, name: itemName.trim(), variantName: finalVariant });
        if (!directVariant) {
            setItemName('');
            setVariantName('');
        } else {
            setVariantName('');
        }
    };

    const updateQuantity = (itemId: string, variantId: string, quantity: number) => {
        if (!socket || quantity < 1) return;
        socket.emit('update-variant-quantity', { listId, itemId, variantId, quantity });
    };

    const toggleCheck = (itemId: string, variantId: string, checked: boolean) => {
        if (!socket) return;
        socket.emit('toggle-variant-check', { listId, itemId, variantId, checked });
    };

    const toggleUnavailable = (itemId: string, variantId: string, unavailable: boolean) => {
        if (!socket) return;
        socket.emit('toggle-variant-unavailable', { listId, itemId, variantId, unavailable });
    };

    const removeVariant = (itemId: string, variantId: string) => {
        if (!socket) return;
        socket.emit('remove-variant', { listId, itemId, variantId });
    };

    const updateItemCategory = (itemId: string, category: string, orderWeight: number) => {
        if (!socket) return;
        socket.emit('update-item-category', { listId, itemId, category, orderWeight });
        setEditingCategoryId(null);
        setNewCategoryName('');
    };

    const startHold = (itemId: string) => {
        holdTimer.current = setTimeout(() => {
            setEditingCategoryId(itemId);
        }, 600);
    };

    const cancelHold = () => {
        if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
        }
    };

    if (!list) return <div style={{ padding: '2rem' }}>Loading...</div>;

    const groupedItems = list.items.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, Item[]>);

    const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
        const weightA = groupedItems[a][0]?.orderWeight ?? 100;
        const weightB = groupedItems[b][0]?.orderWeight ?? 100;
        return weightA - weightB;
    });

    const suggestions = variantsDict[itemName.toLowerCase().trim()] || [];
    const editingItem = list.items.find(i => i._id === editingCategoryId);

    const totalItems = list.items.reduce((sum, item) => sum + (item.variants?.filter(v => !v.unavailable).length || 0), 0);
    const checkedItems = list.items.reduce((sum, item) => sum + (item.variants?.filter(v => v.checked).length || 0), 0);
    const progressPercentage = totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
            <button onClick={onBack} style={{ marginBottom: '1rem' }}>&larr; Back to Lists</button>

            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>{list.name}</h2>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
                    <span>Progress</span>
                    <span>{checkedItems} / {totalItems}</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#4caf50', transition: 'width 0.3s ease' }} />
                </div>
            </div>

            <form onSubmit={e => addItem(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item (e.g. Apples)" style={{ flex: 1, padding: '0.5rem' }} />
                    <input type="text" value={variantName} onChange={e => setVariantName(e.target.value)} placeholder="Variant (Optional)" style={{ flex: 1, padding: '0.5rem' }} />
                    <button type="submit" style={{ padding: '0.5rem 1rem' }}>Add</button>
                </div>
                {suggestions.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {suggestions.map(sug => (
                            <button key={sug} type="button" onClick={(e) => addItem(e, sug)} style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', border: '1px solid #ccc', background: '#f9f9f9', cursor: 'pointer' }}>
                                + {sug}
                            </button>
                        ))}
                    </div>
                )}
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {sortedCategories.map(category => (
                    <div key={category}>
                        <h3 style={{ margin: '0 0 0.5rem 0', color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>
                            {category}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {groupedItems[category].map(item => (
                                <div key={item._id} style={{ display: 'flex', border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div
                                        onPointerDown={() => startHold(item._id)}
                                        onPointerUp={cancelHold}
                                        onPointerLeave={cancelHold}
                                        onPointerMove={cancelHold}
                                        onPointerCancel={cancelHold}
                                        style={{ flex: '0 0 110px', padding: '0.75rem', backgroundColor: '#f5f5f5', fontWeight: 'bold', borderRight: '1px solid #eee', cursor: 'pointer', userSelect: 'none' }}
                                    >
                                        {item.name}
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
                                        {(item.variants || []).map(variant => (
                                            <SwipeableVariant
                                                key={variant._id}
                                                itemId={item._id}
                                                variant={variant}
                                                updateQuantity={updateQuantity}
                                                toggleCheck={toggleCheck}
                                                toggleUnavailable={toggleUnavailable}
                                                removeVariant={removeVariant}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {editingCategoryId && editingItem && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>Move {editingItem.name}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto', marginBottom: '1rem' }}>
                            {Object.entries(categoriesDict).map(([cat, weight]) => (
                                <button
                                    key={cat}
                                    onClick={() => updateItemCategory(editingCategoryId, cat, weight)}
                                    style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer', borderRadius: '4px' }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                placeholder="New category..."
                                style={{ flex: 1, padding: '0.5rem' }}
                            />
                            <button
                                onClick={() => {
                                    if (newCategoryName.trim()) {
                                        updateItemCategory(editingCategoryId, newCategoryName.trim(), 199);
                                    }
                                }}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                Add
                            </button>
                        </div>
                        <button
                            onClick={() => { setEditingCategoryId(null); setNewCategoryName(''); }}
                            style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', background: '#eee', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}