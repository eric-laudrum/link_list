import { useEffect, useState } from 'react';
import type { GroceryList } from '../types';
import { API_URL } from '../config';

// Generates and saves a unique ID for this specific phone/browser
const getClientId = () => {
    let id = localStorage.getItem('link_list_client_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('link_list_client_id', id);
    }
    return id;
};

export function Dashboard({ onSelectList, onOpenDict }: { onSelectList: (id: string) => void, onOpenDict: () => void }) {
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

        // Remove from local storage
        const savedJoined = JSON.parse(localStorage.getItem('joinedListIds') || '[]');
        const updatedJoined = savedJoined.filter((joinedId: string) => joinedId !== id);
        localStorage.setItem('joinedListIds', JSON.stringify(updatedJoined));

        // Tell the server to drop user's ownership of the list
        try {
            const clientId = getClientId();
            await fetch(`${API_URL}/lists/${id}?clientId=${clientId}`, { method: 'DELETE' });
        } catch (error) {
            console.error('Error removing list:', error);
        }

        // Remove from the screen
        setLists(lists.filter(l => l._id !== id));
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinInput.trim()) return;

        let targetId = joinInput.trim();
        if (targetId.includes('list=')) {
            const extracted = new URLSearchParams(targetId.split('?')[1]).get('list');
            if (extracted) targetId = extracted;
        }

        onSelectList(targetId);
        setJoinInput('');
    };

    return (
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', padding: '1rem', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>LinkList</h1>
                <button onClick={onOpenDict} style={{ padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.95rem' }}>
                    Manage Dictionary
                </button>
            </div>

            <form onSubmit={createList} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="New list name..." style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e0' }} />
                <button type="submit" style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '8px', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Create List
                </button>
            </form>

            <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem' }}>
                <input type="text" value={joinInput} onChange={e => setJoinInput(e.target.value)} placeholder="Paste shared link or ID..." style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', borderRadius: '8px', border: '1px solid #cbd5e0' }} />
                <button type="submit" style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', borderRadius: '8px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Join List
                </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {lists.map(list => (
                    <div key={list._id} onClick={() => onSelectList(list._id)} style={{
                        padding: '1rem',
                        border: '1px solid #ccc',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <h3 style={{margin: '0 0 0.5rem 0'}}>{list.name}</h3>
                            <span>{list.items.length} items</span>
                        </div>
                        <button onClick={(e) => deleteList(e, list._id)} style={{
                            background: 'none',
                            border: 'none',
                            color: 'red',
                            cursor: 'pointer',
                            fontSize: '1.5rem',
                            padding: '0 0.5rem'
                        }}>
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}