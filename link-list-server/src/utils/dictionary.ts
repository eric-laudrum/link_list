export let CATEGORY_WEIGHTS: Record<string, number> = {};
export let ITEM_DICTIONARY: Record<string, string> = {};
export let ITEM_VARIANTS: Record<string, string[]> = {};

const RAW_DICT = {
    "Produce": {
        weight: 10,
        items: {
            "bell pepper, bell peppers": ["Red", "Green", "Yellow", "Mix"],
            "onion, onions": ["Yellow", "White", "Spanish"],
            "tomato, tomatoes": ["Vine", "Roma"],
            "apple, apples": ["Gala", "Honeycrisp", "Pink Lady"],
            "berry, berries": ["Strawberries", "Raspberries", "Blueberries"],
            "green onion": [], "broccoli": [], "asparagus": [], "brussels sprouts": [],
            "garlic": [], "cucumber": [], "banana, bananas": [], "pear, pears": [],
            "peach, peaches": [], "cabbage": [], "lettuce": ["Romaine", "Iceberg"],
            "spinach": [], "arugula": []
        }
    },
    "Bakery": {
        weight: 20,
        items: {
            "bread": ["White", "Rye", "Multigrain"],
            "tortilla, tortillas": ["Corn"]
        }
    },
    "Meat & Fish": {
        weight: 30,
        items: {
            "fish": ["Salmon", "Tilapia", "Halibut"],
            "shrimp": ["Jumbo", "Lil"],
            "chicken": ["Thighs", "Breasts"],
            "pork": ["Ground", "Sausages"],
            "beef": ["Ground"],
            "lunch meat, deli meat": ["Honey Ham", "Black Forest Ham", "Chicken", "Turkey", "Corned Beef"],
            "hotdog, hotdogs": [], "hamburger, hamburgers": [], "pepperette, pepperettes": []
        }
    },
    "Tea & Juice": { weight: 40, items: { "tea": ["Orange Pekoe", "Green", "Chamomile", "Earl Grey"] } },
    "Snacks": {
        weight: 50,
        items: {
            "granola bar, granola bars": ["Chocolate", "Fruit n nut"],
            "fruit cups": ["Blended", "Chunks"],
            "gluten free": ["Breton Cracker", "Pretzel", "Mary something crackers"],
            "sesame crackers": [], "real fruit": [],
            "chocolate bar, chocolate": ["Aero", "Reeces", "Kitkat", "Coffee Crisp", "Fruit & Nut"]
        }
    },
    "Breakfast Foods": {
        weight: 60,
        items: {
            "cereal": ["Vector", "Cheerios"],
            "oats": ["Instant", "Slow"],
            "peanut butter": ["Crunchy", "Smooth"],
            "jam": ["Strawberry", "Mixed Berry", "Raspberry"],
            "honey": [], "waffles": []
        }
    },
    "Dairy": {
        weight: 70,
        items: {
            "cheese": ["Cheddar", "Marbled", "Mozzarella", "Cottage", "Cream Cheese"],
            "specialty cheese": ["Feta", "Goat", "Blue", "Brie", "Aged Cheddar"],
            "yogurt": ["Plain Greek", "Vanilla Greek", "Coconut Greek", "Regular"],
            "egg, eggs": [], "milk": ["Oat", "3%"], "nog, eggnog": ["Oat", "Regular"]
        }
    },
    "International": {
        weight: 80,
        items: { "rice": ["Brown", "Jasmine", "White", "Sticky", "Quick"], "chili crisp": [], "kewpie mayo": [], "soy sauce, soy sauce (gf)": [] }
    },
    "Pasta": {
        weight: 90,
        items: { "noodles, pasta": ["Rotini", "Penne", "Spaghetti", "Macaroni"], "tomato sauce": [], "pesto": [], "sun dried tomatoes": [] }
    },
    "Baking / Dry Goods": {
        weight: 100,
        items: {
            "sugar": ["Brown", "White"],
            "spice, spices": ["Black Pepper", "Cinnamon", "Cumin", "Rosemary", "Thyme", "Paprika", "Chili Flakes"],
            "cooking oil, oil": ["Olive", "Sunflower", "Vegetable", "Canola"],
            "flour": [], "baking soda": [], "baking powder": [], "corn starch": [], "marshmallow, marshmallows": [],
            "ketchup": [], "relish": [], "mustard": [], "pickle, pickles": [], "olive, olives": [], "mayo, mayonnaise": [],
            "can tuna, tuna": [], "soup": ["Chicken", "Mushroom", "Tomato", "Beef"], "mac n cheese, macaroni and cheese": []
        }
    },
    "Chips & Soda": { weight: 110, items: { "chips": ["Tortilla"], "club soda": [], "bubbly": ["Raspberry", "Cherry", "Pineapple", "Peach", "Grapefruit"] } },
    "House Goods": { weight: 120, items: { "toilet paper, tp": [], "cat food": [], "cat litter": [], "toothpaste": [], "deodorant": [], "kleenex, tissues": [] } },
    "Frozen": { weight: 130, items: { "frozen fruit": ["Radiant Reds", "Raspberries", "Strawberries", "Pineapple", "Blueberries"], "ice cream": [] } },
    "Other": { weight: 200, items: {} }
};

Object.entries(RAW_DICT).forEach(([category, data]) => {
    CATEGORY_WEIGHTS[category] = data.weight;
    Object.entries(data.items).forEach(([keysString, variants]) => {
        const keys = keysString.split(',').map(k => k.trim());
        keys.forEach(k => {
            ITEM_DICTIONARY[k] = category;
            if (variants.length > 0) ITEM_VARIANTS[k] = variants;
        });
    });
});

export function getItemMetadata(itemName: string) {
    const normalizedName = itemName.toLowerCase().trim();
    const category = ITEM_DICTIONARY[normalizedName] || "Other";
    const orderWeight = CATEGORY_WEIGHTS[category] || 200;
    return { category, orderWeight };
}

export function resolveItemInput(inputName: string, inputVariant: string) {
    const lowerName = inputName.toLowerCase().trim();
    const finalName = inputName.trim();
    const finalVariant = inputVariant.trim();

    const normalize = (str: string) => str.toLowerCase().trim().replace(/es$/, '').replace(/s$/, '');
    const normalizedInput = normalize(lowerName);

    for (const parentItem of Object.keys(ITEM_VARIANTS)) {
        const normalizedParent = normalize(parentItem);
        if (normalizedInput === normalizedParent) {
            return { resolvedName: parentItem, resolvedVariant: finalVariant };
        }
    }

    for (const [parentItem, variants] of Object.entries(ITEM_VARIANTS)) {
        const normalizedParent = normalize(parentItem);
        for (const v of variants) {
            const lowerV = v.toLowerCase();
            if (lowerName === lowerV || normalizedInput === `${lowerV} ${normalizedParent}`) {
                return { resolvedName: parentItem, resolvedVariant: inputVariant ? `${v} ${inputVariant}` : v };
            }
        }
    }

    const words = lowerName.split(' ');
    if (words.length > 1) {
        const lastWord = words[words.length - 1];
        const normalizedLast = normalize(lastWord);
        for (const parentItem of Object.keys(ITEM_VARIANTS)) {
            if (normalizedLast === normalize(parentItem)) {
                const potentialVariant = words.slice(0, -1).join(' ');
                return { resolvedName: parentItem, resolvedVariant: inputVariant ? `${potentialVariant} ${inputVariant}` : potentialVariant };
            }
        }
    }

    return { resolvedName: finalName, resolvedVariant: finalVariant };
}

export function setDictionaryState(newCategories: any, newItems: any, newVariants: any) {
    CATEGORY_WEIGHTS = newCategories;
    ITEM_DICTIONARY = newItems;
    ITEM_VARIANTS = newVariants;
}