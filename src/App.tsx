import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Variant { _id: string; name: string; checked: boolean; quantity: number; }
interface Item { _id: string; name: string; category: string; orderWeight: number; variants: Variant[]; }
interface GroceryList { _id: string; name: string; items: Item[]; }

export default function App() {
    const [activeListId, setActiveListId] = useState<string | null>(null);

    if (activeListId) {
        return <ListView listId={activeListId} onBack={() => setActiveListId(null)} />;
    }
    return <Dashboard onSelectList={setActiveListId} />;
}

function Dashboard({ onSelectList }: { onSelectList: (id: string) => void }) {
    const [lists, setLists] = useState<GroceryList[]>([]);
    const [name, setName] = useState('');

    useEffect(() => {
        fetch('http://localhost:3001/lists')
            .then(res => res.json())
            .then(data => Array.isArray(data) && setLists(data))
            .catch(() => {});
    }, []);

    const createList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const res = await fetch('http://localhost:3001/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
        });
        const newList = await res.json();
        setLists([newList, ...lists]);
        setName('');
    };

    const deleteList = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await fetch(`http://localhost:3001/lists/${id}`, { method: 'DELETE' });
        setLists(lists.filter(l => l._id !== id));
    };

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
            <h1>LinkList</h1>
            <form onSubmit={createList} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="New list name..." style={{ flex: 1, padding: '0.5rem' }} />
                <button type="submit" style={{ padding: '0.5rem 1rem' }}>Create List</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {lists.map(list => (
                    <div key={list._id} onClick={() => onSelectList(list._id)} style={{ padding: '1rem', border: '1px solid #ccc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0' }}>{list.name}</h3>
                            <span>{list.items.length} items</span>
                        </div>
                        <button onClick={(e) => deleteList(e, list._id)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '1.5rem', padding: '0 0.5rem' }}>
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ListView({ listId, onBack }: { listId: string, onBack: () => void }) {
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

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
            <button onClick={onBack} style={{ marginBottom: '1rem' }}>&larr; Back to Lists</button>
            <h2>{list.name}</h2>

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
                                <div key={item._id} style={{ border: '1px solid #eee', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div
                                        onPointerDown={() => startHold(item._id)}
                                        onPointerUp={cancelHold}
                                        onPointerLeave={cancelHold}
                                        onPointerMove={cancelHold}
                                        onPointerCancel={cancelHold}
                                        style={{ padding: '0.5rem 0.75rem', backgroundColor: '#f5f5f5', fontWeight: 'bold', borderBottom: '1px solid #eee', cursor: 'pointer', userSelect: 'none' }}
                                    >
                                        {item.name}
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {(item.variants || []).map(variant => (
                                            <SwipeableVariant
                                                key={variant._id}
                                                itemId={item._id}
                                                variant={variant}
                                                updateQuantity={updateQuantity}
                                                toggleCheck={toggleCheck}
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

function SwipeableVariant({ itemId, variant, updateQuantity, toggleCheck, removeVariant }: { itemId: string, variant: Variant, updateQuantity: (i: string, v: string, q: number) => void, toggleCheck: (i: string, v: string, c: boolean) => void, removeVariant: (i: string, v: string) => void }) {
    const [startX, setStartX] = useState<number | null>(null);
    const [offsetX, setOffsetX] = useState(0);

    const onPointerDown = (e: React.PointerEvent) => setStartX(e.clientX);

    const onPointerMove = (e: React.PointerEvent) => {
        if (startX === null) return;
        const diff = e.clientX - startX;
        if (diff > 0 && diff < 120) setOffsetX(diff);
    };

    const onPointerUp = () => {
        if (offsetX > 60) toggleCheck(itemId, variant._id, !variant.checked);
        setStartX(null);
        setOffsetX(0);
    };

    return (
        <li
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem',
                transform: `translateX(${offsetX}px)`,
                transition: startX === null ? 'transform 0.2s ease, background-color 0.2s ease' : 'none',
                backgroundColor: variant.checked ? '#e6ffe6' : '#fff',
                color: variant.checked ? '#999' : '#000',
                borderBottom: '1px solid #eee',
                touchAction: 'pan-y'
            }}
        >
            <div
                onPointerDown={e => e.stopPropagation()}
                style={{ display: 'flex', alignItems: 'center', marginRight: '1rem', gap: '0.5rem' }}
            >
                <button onClick={() => updateQuantity(itemId, variant._id, (variant.quantity || 1) - 1)} disabled={(variant.quantity || 1) <= 1}>-</button>
                <input
                    type="number"
                    value={variant.quantity || 1}
                    onChange={e => updateQuantity(itemId, variant._id, parseInt(e.target.value) || 1)}
                    style={{ width: '40px', textAlign: 'center', backgroundColor: variant.checked ? '#e6ffe6' : '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
                    min="1"
                />
                <button onClick={() => updateQuantity(itemId, variant._id, (variant.quantity || 1) + 1)}>+</button>
            </div>

            <span style={{ flex: 1, textDecoration: variant.checked ? 'line-through' : 'none' }}>
        {variant.name}
      </span>

            <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => removeVariant(itemId, variant._id)}
                style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '1.5rem', padding: '0 0.5rem' }}
            >
                &times;
            </button>
        </li>
    );
}