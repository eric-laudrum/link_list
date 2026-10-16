import { useEffect, useState } from 'react';

interface GroceryList {
  _id: string;
  name: string;
  items: any[];
}

export default function App() {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [newListName, setNewListName] = useState('');

  // Fetch existing lists from the backend on mount
  useEffect(() => {
    fetch('http://localhost:3001/lists')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setLists(data);
        })
        .catch(console.error);
  }, []);

  // Post a new list to the database and update local state
  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await fetch('http://localhost:3001/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName })
      });
      const newList = await res.json();
      setLists([...lists, newList]);
      setNewListName('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>LinkList</h1>

        <form onSubmit={createList} style={{ marginBottom: '2rem' }}>
          <input
              type="text"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              placeholder="New list name..."
              style={{ padding: '0.5rem', marginRight: '0.5rem' }}
          />
          <button type="submit" style={{ padding: '0.5rem 1rem' }}>Create List</button>
        </form>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {lists.map(list => (
              <div key={list._id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px' }}>
                <h2>{list.name}</h2>
                <p>{list.items.length} items</p>
              </div>
          ))}
          {lists.length === 0 && <p>No lists yet. Create one above.</p>}
        </div>
      </div>
  );
}