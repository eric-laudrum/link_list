import {useEffect, useState} from "react";
import {DictionaryView} from "./components/DictionaryView.tsx";
import {ListView} from "./components/ListView.tsx";
import {Dashboard} from "./components/Dashboard.tsx";

export default function App() {
    const [activeListId, setActiveListId] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('list');
    });
    const [showDict, setShowDict] = useState(false);

    useEffect(() => {
        if (activeListId) {
            const url = new URL(window.location.href);
            url.searchParams.set('list', activeListId);
            window.history.replaceState({}, '', url.toString());

            const saved = JSON.parse(localStorage.getItem('joinedListIds') || '[]');
            if (!saved.includes(activeListId)) {
                localStorage.setItem('joinedListIds', JSON.stringify([...saved, activeListId]));
            }
        } else {
            const url = new URL(window.location.href);
            url.searchParams.delete('list');
            window.history.replaceState({}, '', url.toString());
        }
    }, [activeListId]);

    if (showDict) {
        return <DictionaryView onBack={() => setShowDict(false)} />;
    }
    if (activeListId) {
        return <ListView listId={activeListId} onBack={() => setActiveListId(null)} onOpenDictionary={() => setShowDict(true)} />;
    }
    return <Dashboard onSelectList={setActiveListId} onOpenDictionary={() => setShowDict(true)} />;
}