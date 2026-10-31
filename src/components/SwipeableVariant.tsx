import { useState } from 'react';
import type { Variant } from '../types';

export function SwipeableVariant({ itemId, variant, updateQuantity, toggleCheck, toggleUnavailable, removeVariant }: { itemId: string, variant: Variant, updateQuantity: (i: string, v: string, q: number) => void, toggleCheck: (i: string, v: string, c: boolean) => void, toggleUnavailable: (i: string, v: string, u: boolean) => void, removeVariant: (i: string, v: string) => void }) {
    const [startX, setStartX] = useState<number | null>(null);
    const [offsetX, setOffsetX] = useState(0);

    const onPointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setStartX(e.clientX);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (startX === null) return;
        const diff = e.clientX - startX;
        if (diff > -120 && diff < 120) {
            setOffsetX(diff);
        }
    };

    const endSwipe = (e: React.PointerEvent) => {
        if (startX !== null) {
            if (offsetX > 60) {
                toggleCheck(itemId, variant._id, !variant.checked);
            } else if (offsetX < -60) {
                toggleUnavailable(itemId, variant._id, !variant.unavailable);
            }
        }
        e.currentTarget.releasePointerCapture(e.pointerId);
        setStartX(null);
        setOffsetX(0);
    };

    const isChecked = variant.checked;
    const isUnavailable = variant.unavailable;

    let bgColor = isChecked ? 'rgba(134, 183, 183, 0.25)' : isUnavailable ? '#ffe6e6' : '#fff';
    if (offsetX > 60) bgColor = 'rgba(134, 183, 183, 0.25)';
    if (offsetX < -60) bgColor = '#ffe6e6';

    const textColor = (isChecked || isUnavailable) ? '#999' : '#000';
    const isStrikethrough = isChecked || isUnavailable || offsetX > 60 || offsetX < -60;

    return (
        <li
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endSwipe}
            onPointerCancel={endSwipe}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem',
                transform: `translateX(${offsetX}px)`,
                transition: startX === null ? 'transform 0.2s ease, background-color 0.2s ease' : 'none',
                backgroundColor: bgColor,
                color: textColor,
                borderBottom: '1px solid #eee',
                touchAction: 'pan-y',
                userSelect: 'none'
            }}
        >
            <div
                onPointerDown={e => e.stopPropagation()}
                style={{display: 'flex', alignItems: 'center', marginRight: '0.5rem', gap: '0.15rem'}}
            >
                <button
                    onClick={() => updateQuantity(itemId, variant._id, (variant.quantity || 1) - 1)}
                    disabled={(variant.quantity || 1) <= 1}
                    style={{width: '22px', height: '26px', padding: 0, fontSize: '0.85rem'}}
                >
                    -
                </button>
                <input
                    type="number"
                    value={variant.quantity || 1}
                    onChange={e => updateQuantity(itemId, variant._id, parseInt(e.target.value) || 1)}
                    style={{
                        width: '32px',
                        height: '22px',
                        textAlign: 'center',
                        backgroundColor: bgColor,
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                        fontSize: '0.85rem',
                        padding: 0
                    }}
                    min="1"
                />
                <button
                    onClick={() => updateQuantity(itemId, variant._id, (variant.quantity || 1) + 1)}
                    style={{width: '22px', height: '26px', padding: 0, fontSize: '0.85rem'}}
                >
                    +
                </button>
            </div>

            <span style={{flex: 1, textDecoration: isStrikethrough ? 'line-through' : 'none'}}>
                {variant.name}
            </span>

            <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => removeVariant(itemId, variant._id)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'red',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    padding: '0 0.5rem',

                }}
            >
                &times;
            </button>
        </li>
    );
}