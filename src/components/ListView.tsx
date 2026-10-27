import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Item, GroceryList, Store } from '../types';
import { SwipeableVariant } from './SwipeableVariant';
import { API_URL } from '../config';

export function ListView({ listId, onBack }: { listId: string, onBack: () => void }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [list, setList] = useState<GroceryList | null>(null);
    const [itemName, setItemName] = useState('');
    const [variantName, setVariantName] = useState('');
    const [variantsDict, setVariantsDict] = useState<Record<string, string[]>>({});
    const [categoriesDict, setCategoriesDict] = useState<Record<string, number>>({});
    const [stores, setStores] = useState<Store[]>([]);
    const [activeStoreWeights, setActiveStoreWeights] = useState<Record<string, number>>({});

    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [editingCategoryToRename, setEditingCategoryToRename] = useState<string | null>(null);
    const [renamedCategoryValue, setRenamedCategoryValue] = useState('');

    const startCategoryHold = (category: string) => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = setTimeout(() => {
            setEditingCategoryToRename(category);
            setRenamedCategoryValue(category);
        }, 600);
    };

    const renameCategory = () => {
        if (!socket || !editingCategoryToRename || !renamedCategoryValue.trim()) return;
        socket.emit('rename-category', {
            listId,
            oldCategory: editingCategoryToRename,
            newCategory: renamedCategoryValue.trim(),
            currentWeight: getCategoryWeight(editingCategoryToRename, groupedItems[editingCategoryToRename] || [])
        });
        setEditingCategoryToRename(null);
        setRenamedCategoryValue('');
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('List link copied to clipboard!');
    };

    useEffect(() => {
        fetch(`${API_URL}/dictionary/variants`)
            .then(res => res.json())
            .then(setVariantsDict)
            .catch(() => {});

        fetch(`${API_URL}/dictionary/categories`)
            .then(res => res.json())
            .then(setCategoriesDict)
            .catch(() => {});

        fetch(`${API_URL}/stores`)
            .then(res => res.json())
            .then(setStores)
            .catch(() => {});
    }, []);

    useEffect(() => {
        const s = io(API_URL);
        setSocket(s);
        s.emit('join-list', listId);
        s.on('list-data', (updatedList: GroceryList) => setList(updatedList));
        return () => { s.disconnect(); };
    }, [listId]);

    useEffect(() => {
        if (!list?.storeId) {
            setActiveStoreWeights({});
            return;
        }
        const store = stores.find(s => s._id === list.storeId);
        if (store) {
            setActiveStoreWeights(store.categoryWeights || {});
        }
    }, [list?.storeId, stores]);

    useEffect(() => {
        if (list?.storeId && !stores.some(s => s._id === list.storeId)) {
            fetch(`${API_URL}/stores`)
                .then(res => res.json())
                .then(setStores)
                .catch(() => {});
        }
    }, [list?.storeId, stores]);

    const changeStore = (storeId: string) => {
        if (!socket) return;
        socket.emit('update-list-store', { listId, storeId: storeId || null });
    };

    const getCategoryWeight = (cat: string, items: Item[]) => {
        if (activeStoreWeights[cat] !== undefined) {
            return activeStoreWeights[cat];
        }
        return items[0]?.orderWeight ?? categoriesDict[cat] ?? 200;
    };

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
        if (holdTimer.current) clearTimeout(holdTimer.current);
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
        const weightA = getCategoryWeight(a, groupedItems[a]);
        const weightB = getCategoryWeight(b, groupedItems[b]);
        return weightA - weightB;
    });

    const suggestions = variantsDict[itemName.toLowerCase().trim()] || [];
    const editingItem = list.items.find(i => i._id === editingCategoryId);

    const totalItems = list.items.reduce((sum, item) => sum + (item.variants?.filter(v => !v.unavailable).length || 0), 0);
    const checkedItems = list.items.reduce((sum, item) => sum + (item.variants?.filter(v => v.checked).length || 0), 0);
    const progressPercentage = totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);

    return (
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '0', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1rem 0 1rem' }}>
                <button onClick={onBack} aria-label="Back" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', background: '#f1f5f9', border: '1px solid #cbd5e0', borderRadius: '8px', cursor: 'pointer', padding: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h2 style={{ margin: 0, fontSize: '1.5rem', textAlign: 'center', flex: 1, padding: '0 1rem', color: '#0f172a' }}>
                    {list.name}
                </h2>
                <button onClick={copyShareLink} aria-label="Share List" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px', cursor: 'pointer', padding: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8l5 5-5 5" />
                        <path d="M23 13H11a7 7 0 0 0-7 7v1" />
                    </svg>
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                <select
                    value={list.storeId || ''}
                    onChange={e => changeStore(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e0', background: '#f8fafc', color: '#0f172a' }}
                >
                    <option value="">Default Store Layout</option>
                    {stores.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ padding: '0 1rem 1.5rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                    <span>Progress</span>
                    <span>{checkedItems} / {totalItems}</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercentage}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.3s ease' }} />
                </div>
            </div>

            <form onSubmit={e => addItem(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1rem 1rem 1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item (e.g. Apples)" style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e0' }} />
                    <input type="text" value={variantName} onChange={e => setVariantName(e.target.value)} placeholder="Variant" style={{ width: '30%', padding: '0.75rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e0' }} />
                    <button type="submit" style={{ padding: '0.75rem 1rem', fontSize: '1rem', borderRadius: '8px', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer' }}>Add</button>
                </div>
                {suggestions.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {suggestions.map(sug => (
                            <button key={sug} type="button" onClick={(e) => addItem(e, sug)} style={{ padding: '0.4rem 0.75rem', borderRadius: '1rem', border: '1px solid #cbd5e0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.9rem' }}>
                                + {sug}
                            </button>
                        ))}
                    </div>
                )}
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
                {sortedCategories.map(category => (
                    <div
                        key={category}
                        style={{
                            backgroundColor: '#f8f9fa',
                            borderTop: '1px solid #cbd5e0',
                            borderBottom: '1px solid #cbd5e0'
                        }}
                    >
                        <h3
                            onPointerDown={(e) => {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                startCategoryHold(category);
                            }}
                            onPointerUp={(e) => {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                                cancelHold();
                            }}
                            onPointerLeave={cancelHold}
                            onPointerCancel={cancelHold}
                            onContextMenu={(e) => e.preventDefault()}
                            style={{
                                margin: '0',
                                padding: '0.75rem 1rem',
                                color: '#0f172a',
                                fontSize: '1.1rem',
                                backgroundColor: '#e2e8f0',
                                cursor: 'pointer',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                WebkitTouchCallout: 'none'
                            }}
                        >
                            {category}
                        </h3>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: '#cbd5e0'}}>
                            {groupedItems[category].map(item => (
                                <div key={item._id} style={{
                                    display: 'flex',
                                    backgroundColor: '#fff'
                                }}>
                                    <div
                                        onPointerDown={() => startHold(item._id)}
                                        onPointerUp={cancelHold}
                                        onPointerLeave={cancelHold}

                                        onPointerCancel={cancelHold}
                                        style={{
                                            flex: '0 0 110px',
                                            padding: '0.75rem 1rem',
                                            backgroundColor: '#f8fafc',
                                            fontWeight: 'bold',
                                            borderRight: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
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
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '400px'
                    }}>
                        <h3 style={{marginTop: 0}}>Move {editingItem.name}</h3>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            maxHeight: '50vh',
                            overflowY: 'auto',
                            marginBottom: '1rem'
                        }}>
                            {Object.entries(categoriesDict).map(([cat, weight]) => (
                                <button
                                    key={cat}
                                    onClick={() => updateItemCategory(editingCategoryId, cat, weight)}
                                    style={{
                                        padding: '0.75rem',
                                        textAlign: 'left',
                                        border: '1px solid #ddd',
                                        background: '#fafafa',
                                        cursor: 'pointer',
                                        borderRadius: '4px'
                                    }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                        <div style={{display: 'flex', gap: '0.5rem', borderTop: '1px solid #ddd', paddingTop: '1rem'}}>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                placeholder="New category..."
                                style={{flex: 1, padding: '0.5rem'}}
                            />
                            <button
                                onClick={() => {
                                    if (newCategoryName.trim()) {
                                        updateItemCategory(editingCategoryId, newCategoryName.trim(), 199);
                                    }
                                }}
                                style={{padding: '0.5rem 1rem'}}
                            >
                                Add
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                setEditingCategoryId(null);
                                setNewCategoryName('');
                            }}
                            style={{
                                marginTop: '1rem',
                                width: '100%',
                                padding: '0.75rem',
                                background: '#eee',
                                border: '5px solid gold',
                                cursor: 'pointer',
                                borderRadius: '4px',

                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {editingCategoryToRename && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>Rename Category</h3>
                        <input
                            type="text"
                            value={renamedCategoryValue}
                            onChange={e => setRenamedCategoryValue(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={renameCategory} style={{ flex: 1, padding: '0.75rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                            <button onClick={() => setEditingCategoryToRename(null)} style={{ flex: 1, padding: '0.75rem', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}