export interface Variant {
    _id: string;
    name: string;
    checked: boolean;
    unavailable: boolean;
    quantity: number;
}

export interface Item {
    _id: string;
    name: string;
    category: string;
    orderWeight: number;
    variants: Variant[];
}

export interface Store {
    _id: string;
    name: string;
    categoryWeights: Record<string, number>;
}

export interface GroceryList {
    _id: string;
    name: string;
    storeId?: string | null;
    items: Item[];
}