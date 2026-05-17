import Fuse from 'fuse.js';
import { CATEGORIES, MARKETPLACE_CATEGORIES } from '../constants';

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'category' | 'subcategory' | 'brand' | 'product' | 'trending';
  category?: string;
  subcategory?: string;
}

const COMMON_BRANDS = [
  'Apple', 'Samsung', 'iPhone', 'iPad', 'MacBook', 'AirPods', 'Sony', 'PlayStation', 'PS5', 'Xbox', 'Nintendo',
  'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Toyota', 'Honda', 'Suzuki', 'Yamaha', 'Nike', 'Adidas', 'Puma',
  'Oppo', 'Vivo', 'Xiaomi', 'Huawei', 'OnePlus', 'Infinix', 'Realme', 'Tecno'
];

const SYNONYMS: Record<string, string> = {
  'aifon': 'iPhone',
  'air pods': 'AirPods',
  'ear buds': 'Earbuds',
  'mbp': 'MacBook Pro',
  'macb': 'MacBook',
  'ps5': 'PlayStation 5',
  'ps4': 'PlayStation 4',
  'xbox': 'Xbox',
  'bike': 'Motorcycle',
  'cycle': 'Bicycle',
  'hark': 'Haier',
  'frig': 'Refrigerator',
  'ac': 'Air Conditioner',
  'car': 'Cars',
  'mobile': 'Mobile Phones'
};

const TRENDING_SEARCHES = [
  'iPhone 13', 'iPhone 14 Pro', 'Samsung Galaxy S23', 'PS5 Console', 'Honda Civic', 'Toyota Corolla',
  'Nike Air Max', 'MacBook Air M2', 'iPad Pro', 'Suzuki GSX'
];

const RECENT_SEARCHES_KEY = 'mandi_recent_searches';
let dynamicProductTitles: string[] = [];

export function updateListingIndex(titles: string[]) {
  dynamicProductTitles = Array.from(new Set(titles)).filter(t => t.length > 2);
}

export function saveRecentSearch(query: string) {
  if (!query || query.length < 2) return;
  const recent = getRecentSearches();
  const updated = [query, ...recent.filter(r => r.toLowerCase() !== query.toLowerCase())].slice(0, 5);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

function getRecentSearches(): string[] {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function getSuggestions(query: string): SearchSuggestion[] {
  if (!query || query.length < 1) return [];

  const lowerQuery = query.toLowerCase().trim();
  const suggestions: SearchSuggestion[] = [];

  // 0. Recent Searches
  const recent = getRecentSearches();
  recent.forEach(r => {
    if (r.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        id: `recent-${r}`,
        text: r,
        type: 'trending'
      });
    }
  });

  // 0.1 Dynamic Product Titles (from Marketplace)
  dynamicProductTitles.forEach(title => {
    if (title.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        id: `dyn-${title}`,
        text: title,
        type: 'product'
      });
    }
  });

  // 1. Check Synonyms
  Object.entries(SYNONYMS).forEach(([key, value]) => {
    if (key.includes(lowerQuery) || lowerQuery.includes(key)) {
      suggestions.push({
        id: `syn-${value}`,
        text: value,
        type: 'trending'
      });
    }
  });

  // 2. Categories & Subcategories
  MARKETPLACE_CATEGORIES.forEach(cat => {
    if (cat.name.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        id: `cat-${cat.name}`,
        text: cat.name,
        type: 'category'
      });
    }
    cat.subcategories.forEach(sub => {
      if (sub.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          id: `sub-${sub}`,
          text: sub,
          type: 'subcategory',
          category: cat.name
        });
      }
    });
  });

  // 3. Brands
  COMMON_BRANDS.forEach(brand => {
    if (brand.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        id: `brand-${brand}`,
        text: brand,
        type: 'brand'
      });
    }
  });

  // 4. Trending
  TRENDING_SEARCHES.forEach(term => {
    if (term.toLowerCase().includes(lowerQuery)) {
      suggestions.push({
        id: `trending-${term}`,
        text: term,
        type: 'trending'
      });
    }
  });

  // Fuzzy Search using Fuse.js for better typo tolerance
  const allTerms = [
    ...COMMON_BRANDS.map(b => ({ text: b, type: 'brand' as const })),
    ...TRENDING_SEARCHES.map(t => ({ text: t, type: 'trending' as const })),
    ...dynamicProductTitles.map(t => ({ text: t, type: 'product' as const })),
    ...MARKETPLACE_CATEGORIES.map(c => ({ text: c.name, type: 'category' as const })),
    ...MARKETPLACE_CATEGORIES.flatMap(c => c.subcategories.map(s => ({ text: s, type: 'subcategory' as const, category: c.name })))
  ];

  const fuse = new Fuse(allTerms, {
    keys: ['text'],
    threshold: 0.4,
    includeMatches: true
  });

  const fuseResults = fuse.search(query);
  fuseResults.forEach(res => {
    const item = res.item;
    if (!suggestions.find(s => s.text === item.text)) {
      suggestions.push({
        id: `fuzzy-${item.text}`,
        text: item.text,
        type: item.type,
        category: (item as any).category
      });
    }
  });

  // Remove duplicates and limit
  const uniqueSuggestions = Array.from(new Map(suggestions.map(s => [s.text.toLowerCase(), s])).values());
  
  // Scoring / Priority Logic
  return uniqueSuggestions.sort((a, b) => {
    const aText = a.text.toLowerCase();
    const bText = b.text.toLowerCase();
    
    // Priority 1: Exact matches
    if (aText === lowerQuery) return -1;
    if (bText === lowerQuery) return 1;
    
    // Priority 2: Starts with
    if (aText.startsWith(lowerQuery) && !bText.startsWith(lowerQuery)) return -1;
    if (bText.startsWith(lowerQuery) && !aText.startsWith(lowerQuery)) return 1;
    
    // Priority 3: Type preference
    const typePriority = { category: 0, subcategory: 1, brand: 2, trending: 3, product: 4 };
    return (typePriority[a.type] || 5) - (typePriority[b.type] || 5);
  }).slice(0, 8);
}
