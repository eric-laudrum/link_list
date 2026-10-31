import { useEffect, useState } from 'react';
import type { GroceryList } from '../types';
import { API_URL } from '../config';
import '../index.css';

// Generates and saves a unique ID for this specific phone/browser
const getClientId = () => {
    let id = localStorage.getItem('link_list_client_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('link_list_client_id', id);
    }
    return id;
};

export function Dashboard({ onSelectList, onOpenDictionary }: { onSelectList: (id: string) => void, onOpenDictionary: () => void }) {
    const [lists, setLists] = useState<GroceryList[]>([]);
    const [name, setName] = useState('');
    const [joinInput, setJoinInput] = useState('');

    useEffect(() => {
        const clientId = getClientId();
        // Grab any shared lists the user has visited
        const joinedIds = JSON.parse(localStorage.getItem('joinedListIds') || '[]');
        const joinedQuery = joinedIds.length > 0 ? `&joinedIds=${joinedIds.join(',')}` : '';

        // Ask server for lists created and lists joined
        fetch(`${API_URL}/lists?clientId=${clientId}${joinedQuery}`)
            .then(res => res.json())
            .then(data => Array.isArray(data) && setLists(data))
            .catch(err => console.error('Failed to load lists:', err));
    }, []);

    const createList = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            const clientId = getClientId();
            const res = await fetch(`${API_URL}/lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), clientId })
            });

            if (!res.ok) throw new Error('Server rejected the list');

            const newList = await res.json();
            setLists([newList, ...lists]);
            setName('');
        } catch (error) {
            console.error('Error creating list:', error);
            alert('Failed to create list. Please check your connection.');
        }
    };

    const deleteList = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        if (!window.confirm("Are you sure you want to delete this list?")) return;

        const savedJoined = JSON.parse(localStorage.getItem('joinedListIds') || '[]');
        const updatedJoined = savedJoined.filter((joinedId: string) => joinedId !== id);
        localStorage.setItem('joinedListIds', JSON.stringify(updatedJoined));

        try {
            const clientId = getClientId();
            await fetch(`${API_URL}/lists/${id}?clientId=${clientId}`, { method: 'DELETE' });
        } catch (error) {
            console.error('Error removing list:', error);
        }

        setLists(lists.filter(l => l._id !== id));
    };

    const handleSelectList = (id: string) => {
        const accessTimes = JSON.parse(localStorage.getItem('listAccessTimes') || '{}');
        accessTimes[id] = Date.now();
        localStorage.setItem('listAccessTimes', JSON.stringify(accessTimes));
        onSelectList(id);
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinInput.trim()) return;

        let targetId = joinInput.trim();
        if (targetId.includes('list=')) {
            const extracted = new URLSearchParams(targetId.split('?')[1]).get('list');
            if (extracted) targetId = extracted;
        }

        handleSelectList(targetId);
        setJoinInput('');
    };

    const accessTimes = JSON.parse(localStorage.getItem('listAccessTimes') || '{}');
    const sortedLists = [...lists].sort((a, b) => {
        const timeA = accessTimes[a._id] || 0;
        const timeB = accessTimes[b._id] || 0;
        return timeB - timeA;
    });

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '600px',
            flex: 1,
            margin: '0 auto',
            padding: '1rem',
            boxSizing: 'border-box',
            fontFamily: 'sans-serif',

        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
            }}>

                <div style={{
                    width: '10rem',


                }}>
                    <img src="/public/LinkList-NameLogo.svg" alt="image"/>
                </div>
                <button onClick={onOpenDictionary} aria-label="Manage Dictionary" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '44px',
                    height: '44px',
                    background: '#f1f5f9',
                    border: '1 px solid #cbd5e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    padding: 0
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"
                         strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path
                            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                </button>
            </div>

            <form onSubmit={createList} style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="New list name..."
                       style={{
                           flex: 1,
                           padding: '0.75rem',
                           fontSize: '1rem',
                           borderRadius: '8px',
                           border: '1px solid #cbd5e0'
                       }}/>
                <button type="submit" style={{
                    padding: '0.75rem 1.25rem',
                    fontSize: '1rem',
                    borderRadius: '8px',
                    background: '#86B7B7',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                }}>
                    Create List
                </button>
            </form>

            <form onSubmit={handleJoin} style={{display: 'flex', gap: '0.5rem', marginBottom: '2.5rem'}}>
                <input type="text" value={joinInput} onChange={e => setJoinInput(e.target.value)}
                       placeholder="Paste shared link or ID..." style={{
                    flex: 1,
                    padding: '0.75rem',
                    fontSize: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e0'
                }}/>
                <button type="submit" style={{
                    padding: '0.75rem 1.25rem',
                    fontSize: '1rem',
                    borderRadius: '8px',
                    background: '#506a75',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer'
                }}>
                    Join List
                </button>
            </form>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                {sortedLists.map((list, index) => (
                    <div
                        key={list._id}
                        onClick={() => handleSelectList(list._id)}
                        className="list-container"
                        style={{
                            padding: '1rem',
                            border: '1px solid #ccc',
                            borderRadius: '15px',
                            cursor: 'pointer',
                            color: 'white',
                            textShadow: '0.5px 0.5px var(--primary-dark-grey)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: ['var(--primary-teal)', 'var(--primary-grey)', 'var(--primary-dark-grey)'][index % 3]
                        }}
                    >
                        <div>
                            <h3 style={{margin: '0 0 0.5rem 0'}}>{list.name}</h3>
                            <span>{list.items.length} items</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteList(e, list._id);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                padding: '0 0.5rem'
                            }}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>

            <div
                style={{
                    marginTop: 'auto',
                    paddingTop: '1em',
                }}>
                <img alt="link list ad"/>
                <img
                    src="/public/LinkList-ad.png"
                    alt={'link list ad'}
                    style={{
                        width: '100%',
                        borderRadius: '15px',
                        marginTop: '10px'
                    }}
                />
            </div>
        </div>
    );
}