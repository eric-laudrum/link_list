import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { ListView } from './components/ListView';
import { DictionaryView } from './components/DictionaryView';

export default function App() {
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [showDict, setShowDict] = useState(false);

    if (showDict) {
        return <DictionaryView onBack={() => setShowDict(false)} />;
    }
    if (activeListId) {
        return <ListView listId={activeListId} onBack={() => setActiveListId(null)} />;
    }
    return <Dashboard onSelectList={setActiveListId} onOpenDict={() => setShowDict(true)} />;
}