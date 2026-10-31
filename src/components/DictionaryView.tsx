import { useEffect, useState } from 'react';
import type { Store } from '../types';
import { API_URL } from '../config';


interface DictionaryData {
    categoryWeights: Record<string, number>;
    itemDictionary: Record<string, string>;
    itemVariants: Record<string, string[]>;
}

export function DictionaryView({ onBack }: { onBack: () => void }) {
    const [dict, setDict] = useState<DictionaryData | null>(null);
    const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'variants' | 'stores'>('items');
    const [newItem, setNewItem] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('');
    const [newCatName, setNewCatName] = useState('');
    const [newCatWeight, setNewCatWeight] = useState(100);
    const [newVariantItem, setNewVariantItem] = useState('');
    const [newVariantName, setNewVariantName] = useState('');
    const [sortField, setSortField] = useState<string>('key');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [stores, setStores] = useState<Store[]>([]);
    const [newStoreName, setNewStoreName] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

    const getClientId = () => {
        let id = localStorage.getItem('clientId');
        if (!id) {
            id = 'client_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('clientId', id);
        }
        return id;
    };

    useEffect(() => {
        const clientId = getClientId();
        const joinedIds = JSON.parse(localStorage.getItem('joinedListIds') || '[]');
        const joinedQuery = joinedIds.length > 0 ? `&joinedIds=${joinedIds.join(',')}` : '';

        fetch(`${API_URL}/stores?clientId=${clientId}${joinedQuery}`)
            .then(res => res.json())
            .then(setStores)
            .catch(() => {});

        fetch(`${API_URL}/dictionary`)
            .then(res => res.json())
            .then(data => setDict({
                categoryWeights: data.categoryWeights || {},
                itemDictionary: data.itemDictionary || {},
                itemVariants: data.itemVariants || {}
            }))
            .catch(err => console.error('Failed to load dictionary:', err));
    }, []);


    const createStore = async () => {
        if (!newStoreName.trim() || !dict) return;
        const res = await fetch(`${API_URL}/stores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newStoreName.trim(), categoryWeights: dict.categoryWeights })
        });
        const created = await res.json();
        setStores([...stores, created]);
        setNewStoreName('');
    };

    const updateStoreWeight = async (storeId: string, category: string, weight: number) => {
        const store = stores.find(s => s._id === storeId);
        if (!store) return;
        const updatedWeights = { ...store.categoryWeights, [category]: weight };
        setStores(stores.map(s => s._id === storeId ? { ...s, categoryWeights: updatedWeights } : s));
    };

    const save = async () => {
        if (!dict) return;
        await fetch(`${API_URL}/dictionary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dict)
        });
        onBack();
    };

    if (!dict) return <div style={{ padding: '2rem' }}>Loading...</div>;

    const addCategory = () => {
        if (!newCatName.trim()) return;
        setDict({
            ...dict,
            categoryWeights: { ...dict.categoryWeights, [newCatName.trim()]: Number(newCatWeight) }
        });
        setNewCatName('');
    };

    const deleteCategory = (cat: string) => {
        const next = { ...dict.categoryWeights };
        delete next[cat];
        setDict({ ...dict, categoryWeights: next });
    };

    const addItem = () => {
        if (!newItem.trim() || !newItemCategory.trim()) return;
        setDict({
            ...dict,
            itemDictionary: { ...dict.itemDictionary, [newItem.trim().toLowerCase()]: newItemCategory.trim() }
        });
        setNewItem('');
    };

    const deleteItem = (itemKey: string) => {
        const next = { ...dict.itemDictionary };
        delete next[itemKey];
        setDict({ ...dict, itemDictionary: next });
    };

    const addVariant = () => {
        if (!newVariantItem.trim() || !newVariantName.trim()) return;
        const parent = newVariantItem.trim();
        const current = dict.itemVariants[parent] || [];
        setDict({
            ...dict,
            itemVariants: { ...dict.itemVariants, [parent]: [...current, newVariantName.trim()] }
        });
        setNewVariantName('');
    };

    const deleteVariant = (parent: string, vIndex: number) => {
        const current = [...(dict.itemVariants[parent] || [])];
        current.splice(vIndex, 1);
        const next = { ...dict.itemVariants };
        if (current.length === 0) {
            delete next[parent];
        } else {
            next[parent] = current;
        }
        setDict({ ...dict, itemVariants: next });
    };

    const toggleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const updateItemKey = (oldKey: string, newKey: string) => {
        const trimmed = newKey.trim().toLowerCase();
        if (!trimmed || trimmed === oldKey) return;
        const next = { ...dict.itemDictionary };
        const val = next[oldKey];
        delete next[oldKey];
        next[trimmed] = val;
        setDict({ ...dict, itemDictionary: next });
    };

    const updateItemCategory = (key: string, newCat: string) => {
        setDict({
            ...dict,
            itemDictionary: { ...dict.itemDictionary, [key]: newCat }
        });
    };

    const updateCategoryName = (oldCat: string, newCat: string) => {
        const trimmed = newCat.trim();
        if (!trimmed || trimmed === oldCat) return;
        const next = { ...dict.categoryWeights };
        const val = next[oldCat];
        delete next[oldCat];
        next[trimmed] = val;
        setDict({ ...dict, categoryWeights: next });
    };

    const updateCategoryWeight = (cat: string, weight: number) => {
        setDict({
            ...dict,
            categoryWeights: { ...dict.categoryWeights, [cat]: weight }
        });
    };

    const updateVariantParentKey = (oldParent: string, newParent: string) => {
        const trimmed = newParent.trim();
        if (!trimmed || trimmed === oldParent) return;
        const next = { ...dict.itemVariants };
        const val = next[oldParent] || [];
        delete next[oldParent];
        next[trimmed] = val;
        setDict({ ...dict, itemVariants: next });
    };

    const updateVariantValue = (parent: string, vIndex: number, newValue: string) => {
        const trimmed = newValue.trim();
        if (!trimmed) return;
        const current = [...(dict.itemVariants[parent] || [])];
        current[vIndex] = trimmed;
        setDict({
            ...dict,
            itemVariants: { ...dict.itemVariants, [parent]: current }
        });
    };

    return (
        <div style={{maxWidth: '100%', padding: '1rem', boxSizing: 'border-box', fontFamily: 'sans-serif'}}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                gap: '0.5rem'
            }}>
                <button onClick={onBack} style={{padding: '0.5rem 0.75rem', fontSize: '0.9rem'}}>&larr; Back</button>
                <h2 style={{margin: 0, fontSize: '1.25rem'}}>Manage Items</h2>
                <button onClick={save} style={{
                    padding: '0.5rem 0.75rem',
                    background: 'var(--primary-teal)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}>
                    Save
                </button>
            </div>

            <div style={{
                display: 'flex',
                gap: '0.25rem',
                marginBottom: '1rem',
                borderBottom: '2px solid #eee',
                paddingBottom: '0.5rem',
                overflowX: 'auto'
            }}>
                <button onClick={() => setActiveTab('items')} style={{
                    fontWeight: activeTab === 'items' ? 'bold' : 'normal',
                    padding: '0.5rem 0.75rem',
                    flexShrink: 0
                }}>Items ({Object.keys(dict.itemDictionary).length})
                </button>
                <button onClick={() => setActiveTab('categories')} style={{
                    fontWeight: activeTab === 'categories' ? 'bold' : 'normal',
                    padding: '0.5rem 0.75rem',
                    flexShrink: 0
                }}>Categories ({Object.keys(dict.categoryWeights).length})
                </button>
                <button onClick={() => setActiveTab('variants')} style={{
                    fontWeight: activeTab === 'variants' ? 'bold' : 'normal',
                    padding: '0.5rem 0.75rem',
                    flexShrink: 0
                }}>Variants ({Object.keys(dict.itemVariants).length})
                </button>
                <button onClick={() => setActiveTab('stores')} style={{
                    fontWeight: activeTab === 'stores' ? 'bold' : 'normal',
                    padding: '0.5rem 0.75rem',
                    flexShrink: 0
                }}>Stores ({stores.length})
                </button>
            </div>

            {activeTab === 'items' && (
                <div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem'}}>
                        <input type="text" placeholder="Item name (e.g. apples)" value={newItem}
                               onChange={e => setNewItem(e.target.value)} style={{
                            padding: '0.65rem',
                            fontSize: '1rem',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                        }}/>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} style={{
                                flex: 1,
                                padding: '0.65rem',
                                fontSize: '1rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}>
                                <option value="">Select Category</option>
                                {Object.keys(dict.categoryWeights).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <button onClick={addItem}
                                    style={{padding: '0.65rem 1rem', fontSize: '1rem', borderRadius: '4px'}}>Add
                            </button>
                        </div>
                    </div>
                    <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem'}}>
                            <thead>
                            <tr style={{background: '#f5f5f5', textAlign: 'left'}}>
                                <th onClick={() => toggleSort('key')} style={{
                                    padding: '0.65rem',
                                    border: '1px solid #ddd',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}>
                                    Item {sortField === 'key' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th onClick={() => toggleSort('category')} style={{
                                    padding: '0.65rem',
                                    border: '1px solid #ddd',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}>
                                    Category {sortField === 'category' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th style={{
                                    padding: '0.65rem',
                                    border: '1px solid #ddd',
                                    width: '50px',
                                    textAlign: 'center'
                                }}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {Object.entries(dict.itemDictionary)
                                .sort(([keyA, catA], [keyB, catB]) => {
                                    const valA = sortField === 'category' ? catA : keyA;
                                    const valB = sortField === 'category' ? catB : keyB;
                                    const comp = valA.localeCompare(valB);
                                    return sortDirection === 'asc' ? comp : -comp;
                                })
                                .map(([itemKey, cat]) => (
                                    <tr key={itemKey}>
                                        <td style={{padding: '0.35rem 0.65rem', border: '1px solid #ddd'}}>
                                            <input
                                                type="text"
                                                defaultValue={itemKey}
                                                onBlur={e => updateItemKey(itemKey, e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    fontSize: '0.95rem'
                                                }}
                                            />
                                        </td>
                                        <td style={{padding: '0.35rem 0.65rem', border: '1px solid #ddd'}}>
                                            <select
                                                value={cat}
                                                onChange={e => updateItemCategory(itemKey, e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    fontSize: '0.95rem'
                                                }}
                                            >
                                                {Object.keys(dict.categoryWeights).map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{padding: '0.65rem', border: '1px solid #ddd', textAlign: 'center'}}>
                                            <button onClick={() => deleteItem(itemKey)} style={{
                                                color: 'red',
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.25rem'
                                            }}>&times;</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem'}}>
                        <input type="text" placeholder="Category Name" value={newCatName}
                               onChange={e => setNewCatName(e.target.value)} style={{
                            padding: '0.65rem',
                            fontSize: '1rem',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                        }}/>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <input type="number" placeholder="Weight Order" value={newCatWeight}
                                   onChange={e => setNewCatWeight(Number(e.target.value))} style={{
                                flex: 1,
                                padding: '0.65rem',
                                fontSize: '1rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}/>
                            <button onClick={addCategory}
                                    style={{padding: '0.65rem 1rem', fontSize: '1rem', borderRadius: '4px'}}>Add
                            </button>
                        </div>
                    </div>
                    <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem'}}>
                            <thead>
                            <tr style={{background: '#f5f5f5', textAlign: 'left'}}>
                                <th onClick={() => toggleSort('category')} style={{
                                    padding: '0.65rem',
                                    border: '1px solid #ddd',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}>
                                    Category {sortField === 'category' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th onClick={() => toggleSort('weight')} style={{
                                    padding: '0.65rem',
                                    border: '1px solid #ddd',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                }}>
                                    Weight {sortField === 'weight' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                                </th>
                                <th style={{
                                    padding: '0.65rem',
                                    border: '1px solid #ddd',
                                    width: '50px',
                                    textAlign: 'center'
                                }}></th>
                            </tr>
                            </thead>
                            <tbody>
                            {Object.entries(dict.categoryWeights)
                                .sort(([catA, wA], [catB, wB]) => {
                                    if (sortField === 'weight') {
                                        return sortDirection === 'asc' ? wA - wB : wB - wA;
                                    }
                                    const comp = catA.localeCompare(catB);
                                    return sortDirection === 'asc' ? comp : -comp;
                                })
                                .map(([cat, weight]) => (
                                    <tr key={cat}>
                                        <td style={{padding: '0.35rem 0.65rem', border: '1px solid #ddd'}}>
                                            <input
                                                type="text"
                                                defaultValue={cat}
                                                onBlur={e => updateCategoryName(cat, e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    fontSize: '0.95rem'
                                                }}
                                            />
                                        </td>
                                        <td style={{padding: '0.35rem 0.65rem', border: '1px solid #ddd'}}>
                                            <input
                                                type="number"
                                                value={weight}
                                                onChange={e => updateCategoryWeight(cat, Number(e.target.value))}
                                                style={{
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    fontSize: '0.95rem'
                                                }}
                                            />
                                        </td>
                                        <td style={{padding: '0.65rem', border: '1px solid #ddd', textAlign: 'center'}}>
                                            <button onClick={() => deleteCategory(cat)} style={{
                                                color: 'red',
                                                border: 'none',
                                                background: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.25rem'
                                            }}>&times;</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'variants' && (
                <div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem'}}>
                        <input type="text" placeholder="Parent Item (e.g. Apples)" value={newVariantItem}
                               onChange={e => setNewVariantItem(e.target.value)} style={{
                            padding: '0.65rem',
                            fontSize: '1rem',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                        }}/>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <input type="text" placeholder="Variant Name (e.g. Honeycrisp)" value={newVariantName}
                                   onChange={e => setNewVariantName(e.target.value)} style={{
                                flex: 1,
                                padding: '0.65rem',
                                fontSize: '1rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}/>
                            <button onClick={addVariant}
                                    style={{padding: '0.65rem 1rem', fontSize: '1rem', borderRadius: '4px'}}>Add
                            </button>
                        </div>
                    </div>
                    <div style={{overflowX: 'auto'}}>
                        <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem'}}>
                            <thead>
                            <tr style={{background: '#f5f5f5', textAlign: 'left'}}>
                                <th style={{padding: '0.65rem', border: '1px solid #ddd'}}>Parent Item</th>
                                <th style={{padding: '0.65rem', border: '1px solid #ddd'}}>Variants</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Object.entries(dict.itemVariants).map(([parent, variants]) => (
                                <tr key={parent}>
                                    <td style={{
                                        padding: '0.35rem 0.65rem',
                                        border: '1px solid #ddd',
                                        fontWeight: 'bold'
                                    }}>
                                        <input
                                            type="text"
                                            defaultValue={parent}
                                            onBlur={e => updateVariantParentKey(parent, e.target.value)}
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                background: 'transparent',
                                                fontSize: '0.95rem',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </td>
                                    <td style={{padding: '0.65rem', border: '1px solid #ddd'}}>
                                        <div style={{display: 'flex', gap: '0.35rem', flexWrap: 'wrap'}}>
                                            {variants.map((v, idx) => (
                                                <span key={idx} style={{
                                                    background: '#f0f0f0',
                                                    padding: '0.3rem 0.5rem',
                                                    borderRadius: '4px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    fontSize: '0.9rem'
                                                }}>
                            <input
                                type="text"
                                defaultValue={v}
                                onBlur={e => updateVariantValue(parent, idx, e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '0.9rem',
                                    width: `${Math.max(v.length, 4)}ch`
                                }}
                            />
                            <button onClick={() => deleteVariant(parent, idx)} style={{
                                color: 'red',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                padding: '0 0.1rem'
                            }}>&times;</button>
                          </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'stores' && (
                <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Store Name (e.g. Walmart, Metro)"
                            value={newStoreName}
                            onChange={e => setNewStoreName(e.target.value)}
                            style={{ flex: 1, padding: '0.65rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <button onClick={createStore} style={{ padding: '0.65rem 1rem', fontSize: '1rem', borderRadius: '4px' }}>Create Store</button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <select
                            value={selectedStoreId || ''}
                            onChange={e => setSelectedStoreId(e.target.value || null)}
                            style={{ width: '100%', padding: '0.65rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                            <option value="">Select a Store to Edit Category Layout</option>
                            {stores.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedStoreId && (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                                <thead>
                                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                                    <th style={{ padding: '0.65rem', border: '1px solid #ddd' }}>Category</th>
                                    <th style={{ padding: '0.65rem', border: '1px solid #ddd' }}>Store Aisle Weight</th>
                                </tr>
                                </thead>
                                <tbody>
                                {Object.keys(dict.categoryWeights).map(cat => {
                                    const currentStore = stores.find(s => s._id === selectedStoreId);
                                    const weight = currentStore?.categoryWeights?.[cat] ?? dict.categoryWeights[cat] ?? 100;
                                    return (
                                        <tr key={cat}>
                                            <td style={{ padding: '0.65rem', border: '1px solid #ddd' }}>{cat}</td>
                                            <td style={{ padding: '0.35rem 0.65rem', border: '1px solid #ddd' }}>
                                                <input
                                                    type="number"
                                                    value={weight}
                                                    onChange={e => updateStoreWeight(selectedStoreId, cat, Number(e.target.value))}
                                                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.95rem' }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}