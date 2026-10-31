import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Item, GroceryList, Store } from '../types';
import { SwipeableVariant } from './SwipeableVariant';
import { API_URL } from '../config';
import { getClientId } from "../utils/client.ts";

export function ListView({ listId, onBack, onOpenDictionary }: { listId: string, onBack: () => void, onOpenDictionary: () => void }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [list, setList] = useState<GroceryList | null>(null);
    const [itemName, setItemName] = useState('');
    const [variantName, setVariantName] = useState('');
    const [variantsDict, setVariantsDict] = useState<Record<string, string[]>>({});
    const [categoriesDict, setCategoriesDict] = useState<Record<string, number>>({});
    const [stores, setStores] = useState<Store[]>([]);
    const [activeStoreWeights, setActiveStoreWeights] = useState<Record<string, number>>({});
    const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);

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

    const completeShop = () => {
        if (window.confirm("Done Shopping? The list will be cleared and saved to your history.")) {
            socket?.emit('complete-shop', { listId });
        }
    };

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
        const clientId = getClientId();
        const joinedIds = JSON.parse(localStorage.getItem('joinedListIds') || '[]');
        const joinedQuery = joinedIds.length > 0 ? `&joinedIds=${joinedIds.join(',')}` : '';

        fetch(`${API_URL}/stores?clientId=${clientId}${joinedQuery}`)
            .then(res => res.json())
            .then(setStores)
            .catch(() => {});
    }, []);

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

    if (!list) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

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

    const totalItems = list.items.reduce((sum, item) => sum + (item.variants?.length || 0), 0);
    const checkedItems = list.items.reduce((sum, item) => sum + (item.variants?.filter(v => v.checked).length || 0), 0);
    const unavailableItems = list.items.reduce((sum, item) => sum + (item.variants?.filter(v => v.unavailable).length || 0), 0);

    const checkedPercentage = totalItems === 0 ? 0 : (checkedItems / totalItems) * 100;
    const unavailablePercentage = totalItems === 0 ? 0 : (unavailableItems / totalItems) * 100;
    const totalCompleted = checkedItems + unavailableItems;
    const isComplete = totalItems > 0 && totalCompleted === totalItems;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            width: '100%',
            maxWidth: '600px',
            margin: '0 auto',
            padding: '0',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif',

        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',


            }}>
                <button onClick={onBack} aria-label="Back" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    background: 'var(--primary-teal)',
                    border: '1px solid #cbd5e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,

                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
                         strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"/>
                        <polyline points="12 19 5 12 12 5"/>
                    </svg>
                </button>

                <div style={{
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    alignItems: 'center',


                    position: 'relative',

                }}>
                    {/* Dropdown */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            gap: '0.25rem' ,

                        }}
                        onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
                    >
                        <h2 style={{
                            margin: 0,
                            paddingLeft: '2rem',
                            fontSize: '1.5rem',
                            textAlign: 'center',
                            color: 'var(--primary-teal)',
                            textShadow: '0.2px 0.2px var(--primary-dark-grey)',
                        }}>
                            {list.name}
                        </h2>
                        <svg
                            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{
                                transition: 'transform 0.2s ease',
                                transform: isLayoutDropdownOpen ? 'rotate(90deg)' : 'rotate(0deg)'
                            }}
                        >
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </div>

                    {isLayoutDropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            marginTop: '0.5rem',
                            width: 'max-content',
                            minWidth: '200px',
                            backgroundColor: '#fff',
                            border: '1px solid #cbd5e0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <button
                                onClick={() => {
                                    changeStore('');
                                    setIsLayoutDropdownOpen(false);
                                }}
                                style={{
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    background: !list.storeId ? '#f8fafc' : 'transparent',
                                    border: 'none',
                                    borderBottom: '1px solid #e2e8f0',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: !list.storeId ? 'bold' : 'normal',
                                }}
                            >
                                Default Store Layout
                            </button>

                            {stores.map(s => (
                                <button
                                    key={s._id}
                                    onClick={() => {
                                        changeStore(s._id);
                                        setIsLayoutDropdownOpen(false);
                                    }}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        textAlign: 'left',
                                        background: list.storeId === s._id ? '#f8fafc' : 'transparent',
                                        border: 'none',
                                        borderBottom: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: list.storeId === s._id ? 'bold' : 'normal',
                                    }}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button onClick={onOpenDictionary} aria-label="Manage Dictionary" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: 0,

                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-teal)" strokeWidth="2"
                             strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path
                                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                    </button>
                    <button onClick={copyShareLink} aria-label="Share List" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        background: 'var(--primary-teal)',
                        border: '1px solid var(--primary-teal)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        padding: 0
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"
                             strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8l5 5-5 5"/>
                            <path d="M23 13H11a7 7 0 0 0-7 7v1"/>
                        </svg>
                    </button>
                </div>
            </div>

            <form onSubmit={e => addItem(e)}
                  style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      padding: '0 1rem 1rem 1rem',
                      marginTop: '1em'
                  }}
            >
                <input type="text" value={itemName} onChange={e => setItemName(e.target.value)}
                       placeholder="Item (e.g. Apples)" style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e0'
                }}/>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <input type="text" value={variantName} onChange={e => setVariantName(e.target.value)}
                           placeholder="Type (e.g. Honeycrisp)" style={{
                        flex: 1,
                        padding: '0.75rem',
                        fontSize: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e0'
                    }}/>
                    <button type="submit" style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        background: 'var(--primary-teal)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer'
                    }}>Add
                    </button>
                </div>
                {suggestions.length > 0 && (
                    <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                        {suggestions.map(sug => (
                            <button key={sug} type="button" onClick={(e) => addItem(e, sug)} style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: '1rem',
                                border: '1px solid #cbd5e0',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}>
                                + {sug}
                            </button>
                        ))}
                    </div>
                )}
            </form>

            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backgroundColor: '#ffffff',
                padding: '1rem',
                borderBottom: '1px solid #cbd5e0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem',
                    color: isComplete ? 'var(--primary-teal)' : 'var(--primary-dark-grey)',
                    fontWeight: isComplete ? 'bold' : 'normal',
                    transition: 'all 0.3s ease'
                }}>
                    <span>{isComplete ? 'Complete!' : 'Progress'}</span>
                    <span>{totalCompleted} / {totalItems}</span>
                </div>
                <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: isComplete ? 'pulse-glow 1.8s infinite' : 'none'
                }}>
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: `${checkedPercentage}%`,
                        height: '100%',
                        backgroundColor: 'var(--primary-teal)',
                        transition: 'width 0.3s ease'
                    }}/>
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        width: `${unavailablePercentage}%`,
                        height: '100%',
                        backgroundColor: '#ef4444',
                        transition: 'width 0.3s ease'
                    }}/>
                </div>
                <style>{`
                    @keyframes pulse-glow {
                        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
                        70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                    }
                `}</style>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem'}}>
                {sortedCategories.map(category => (
                    <div
                        key={category}
                        style={{
                            backgroundColor: '#f8f9fa',
                            borderTop: '1px solid #cbd5e0',
                            borderBottom: '1px solid #cbd5e0',

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
                                color: 'white',
                                fontWeight: 'bold',
                                textShadow: '0.5px 0.5px var(--primary-dark-grey)',
                                fontSize: '1.1rem',
                                backgroundColor: 'var(--primary-teal)',
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
                                    <ul style={{listStyle: 'none', padding: 0, margin: 0, flex: 1}}>
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

            {list.items.length > 0 && (
                <div
                    style={{
                        marginTop: 'auto',
                        padding: '3rem',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                    <button
                        onClick={completeShop}
                        style={{
                            padding: '0.75rem 2rem',
                            backgroundColor: 'var(--primary-dark-grey)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            width: '100%',
                            maxWidth: '300px'
                        }}
                    >
                        Complete Shop
                    </button>
                </div>
            )}

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
                                border: '1px solid var(--primary-dark-grey)',
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
                    <div style={{
                        backgroundColor: '#fff',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '400px'
                    }}>
                        <h3 style={{marginTop: 0}}>Rename Category</h3>
                        <input
                            type="text"
                            value={renamedCategoryValue}
                            onChange={e => setRenamedCategoryValue(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                marginBottom: '1rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button onClick={renameCategory} style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: '#22c55e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}>Save
                            </button>
                            <button onClick={() => setEditingCategoryToRename(null)} style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: '#eee',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}>Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}