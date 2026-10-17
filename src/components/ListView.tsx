import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { getItemMetadata } from '../utils/dictionary';

interface Item {
    _id?: string;
    name: string;
    category: string;
    orderWeight: number;
    checked: boolean;
}

export default function ListView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [newItemName, setNewItemName] = useState('');

    useEffect(() => {
        const newSocket = io('http://localhost:3001');
        setSocket(newSocket);

        newSocket.emit('join-list', id);

        newSocket.on('initial-items', (fetchedItems: Item[]) => {
            setItems(fetchedItems.sort((a, b) => a.orderWeight - b.orderWeight));
        });

        newSocket.on('item-added', (item: Item) => {
            setItems(prev => [...prev, item].sort((a, b) => a.orderWeight - b.orderWeight));
        });

        newSocket.on('item-toggled', ({ itemId, checked }) => {
            setItems(prev => prev.map(item =>
                item._id === itemId ? { ...item, checked } : item
            ));
        });

        return () => {
            newSocket.disconnect();
        };
    }, [id]);

    const addItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim() || !socket) return;

        const { category, orderWeight } = getItemMetadata(newItemName);

        const itemData = {
            listId: id,
            name: newItemName.trim(),
            category,
            orderWeight,
            checked: false
        };

        socket.emit('add-item', itemData);
        setNewItemName('');
    };

    const toggleItem = (itemId: string | undefined, currentStatus: boolean) => {
        if (!socket || !itemId) return;

        setItems(prev => prev.map(item =>
            item._id === itemId ? { ...item, checked: !currentStatus } : item
        ));

        socket.emit('toggle-item', {
            listId: id,
            itemId,
            checked: !currentStatus
        });
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <button onClick={() => navigate('/')}>&larr; Back</button>
            <h2>List: {id}</h2>

            <form onSubmit={addItem} style={{ marginBottom: '2rem' }}>
                <input
                    type="text"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="Add an item..."
                    style={{ padding: '0.5rem', marginRight: '0.5rem' }}
                />
                <button type="submit" style={{ padding: '0.5rem 1rem' }}>Add</button>
            </form>

            <ul style={{ listStyle: 'none', padding: 0 }}>
                {items.map((item) => (
                    <li
                        key={item._id}
                        style={{
                            padding: '0.5rem 0',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            opacity: item.checked ? 0.5 : 1
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleItem(item._id, item.checked)}
                            style={{ width: '1.5rem', height: '1.5rem', cursor: 'pointer' }}
                        />
                        <span style={{ textDecoration: item.checked ? 'line-through' : 'none' }}>
              <strong>{item.name}</strong> <span style={{ color: '#666', fontSize: '0.8rem' }}>({item.category})</span>
            </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}