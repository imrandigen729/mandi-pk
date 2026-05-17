import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, UserProfile } from '../types';
import { ListingCard } from '../components/ListingCard';
import { useSearchParams, Link } from 'react-router-dom';
import { CATEGORIES, LOCATIONS, MARKETPLACE_CATEGORIES } from '../constants';
import { 
  Search, 
  User, 
  ArrowRight, 
  Filter, 
  ChevronDown, 
  X, 
  MapPin, 
  SlidersHorizontal,
  ArrowUpDown,
  RotateCcw,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { SearchAutocomplete } from '../components/SearchAutocomplete';
import { SearchSuggestion, saveRecentSearch } from '../services/searchService';

export function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [matchingProfiles, setMatchingProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Search Params
  const filterCat = searchParams.get('category') || '';
  const filterSubcat = searchParams.get('subcategory') || '';
  const filterCondition = searchParams.get('condition') || '';
  const filterKeyword = searchParams.get('q') || '';
  const filterMinPrice = searchParams.get('minPrice') || '';
  const filterMaxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sort') || 'newest';
  const filterLocation = searchParams.get('location') || '';
  const filterAvailableOnly = searchParams.get('available') === 'true';
  const filterSellerVerified = searchParams.get('verified') === 'true';
  const filterBrand = searchParams.get('brand') || '';

  // Local States for Inputs (Filters)
  const [localKeyword, setLocalKeyword] = useState(filterKeyword);
  const [localMin, setLocalMin] = useState(filterMinPrice);
  const [localMax, setLocalMax] = useState(filterMaxPrice);
  const [localBrand, setLocalBrand] = useState(filterBrand);
  const [localCat, setLocalCat] = useState(filterCat);
  const [localSubcat, setLocalSubcat] = useState(filterSubcat);
  const [localCondition, setLocalCondition] = useState(filterCondition);
  const [localLocation, setLocalLocation] = useState(filterLocation);
  const [localSort, setLocalSort] = useState(sortBy);
  const [localVerified, setLocalVerified] = useState(filterSellerVerified);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalKeyword(filterKeyword);
    setLocalMin(filterMinPrice);
    setLocalMax(filterMaxPrice);
    setLocalBrand(filterBrand);
    setLocalCat(filterCat);
    setLocalSubcat(filterSubcat);
    setLocalCondition(filterCondition);
    setLocalLocation(filterLocation);
    setLocalSort(sortBy);
    setLocalVerified(filterSellerVerified);
    setShowAutocomplete(false);
  }, [filterKeyword, filterMinPrice, filterMaxPrice, filterBrand, filterCat, filterSubcat, filterCondition, filterLocation, sortBy, filterSellerVerified]);

  const selectedCategoryData = MARKETPLACE_CATEGORIES.find(c => c.name === localCat);
  const subcategories = selectedCategoryData?.subcategories || [];

  const [sellers, setSellers] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'listings'),
          where('status', 'in', ['LIVE', 'SOLD', 'BOOKED']) 
        );

        const snapshot = await getDocs(q);
        let docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Listing));
        setListings(docs);

        // Fetch seller profiles for verification filtering
        const sellerIds = Array.from(new Set(docs.map(d => d.ownerId)));
        const sellerProfiles: Record<string, UserProfile> = {};
        
        // Batching fetches might be better if many sellers, but for now...
        for (const sid of sellerIds) {
          const sRef = query(collection(db, 'users'), where('id', '==', sid));
          const sSnap = await getDocs(sRef);
          if (!sSnap.empty) {
            sellerProfiles[sid] = { id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as UserProfile;
          }
        }
        setSellers(sellerProfiles);

        if (filterKeyword.trim()) {
           const qProfiles = query(
             collection(db, 'users'),
             where('name', '>=', filterKeyword),
             where('name', '<=', filterKeyword + '\uf8ff')
           );
           const pSnap = await getDocs(qProfiles);
           setMatchingProfiles(pSnap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile)));
        } else {
           setMatchingProfiles([]);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'listings');
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [filterKeyword]);

  const filteredListings = useMemo(() => {
    let result = listings.filter(d => {
      const isLive = d.status === 'LIVE' && (d.quantity || 0) > 0;
      const isSold = d.status === 'SOLD' || (d.quantity || 0) <= 0;
      const isBooked = d.status === 'BOOKED';

      if (filterAvailableOnly) {
        if (!isLive) return false;
      }

      if (filterCat === 'Sold Out') {
        if (!isSold) return false;
      } else {
        if (filterCat && d.category !== filterCat) return false;
        // Default behavior: Only show LIVE items. Exclude SOLD and BOOKED
        if (!isLive) return false;
      }

      if (filterSubcat && d.subcategory !== filterSubcat) return false;
      if (filterCondition && d.condition !== filterCondition) return false;
      if (filterLocation && filterLocation !== 'All Pakistan' && d.location !== filterLocation) return false;
      if (filterMinPrice && d.price < Number(filterMinPrice)) return false;
      if (filterMaxPrice && d.price > Number(filterMaxPrice)) return false;
      if (filterBrand && !d.title.toLowerCase().includes(filterBrand.toLowerCase())) return false;
      
      if (filterSellerVerified) {
        const seller = sellers[d.ownerId];
        if (!seller?.isVerified) return false;
      }

      if (filterKeyword) {
        const queryText = filterKeyword.toLowerCase().trim();
        const keywords = queryText.split(' ').filter(k => k.length > 0);
        const searchableContent = `${d.title} ${d.description} ${d.category} ${d.subcategory || ''} ${d.location || ''}`.toLowerCase();
        const isMatch = keywords.every(kw => searchableContent.includes(kw));
        if (!isMatch) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      if (a.status !== 'SOLD' && b.status !== 'SOLD') {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        if (a.isBoosted && !b.isBoosted) return -1;
        if (!a.isBoosted && b.isBoosted) return 1;
      }

      const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);

      switch (sortBy) {
        case 'price_low': return a.price - b.price;
        case 'price_high': return b.price - a.price;
        case 'oldest': return timeA - timeB;
        default: return timeB - timeA;
      }
    });

    return result;
  }, [listings, filterCat, filterSubcat, filterCondition, filterLocation, filterMinPrice, filterMaxPrice, filterKeyword, sortBy, filterSellerVerified, sellers, filterBrand]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
  };

  const handleSearchClick = (e?: React.FormEvent) => {
    e?.preventDefault();
    setShowAutocomplete(false);
    if (localKeyword.trim()) {
      saveRecentSearch(localKeyword.trim());
    }
    updateParams({
      q: localKeyword || null,
      minPrice: localMin || null,
      maxPrice: localMax || null,
      brand: localBrand || null,
      category: localCat || null,
      subcategory: localSubcat || null,
      condition: localCondition || null,
      location: localLocation || null,
      sort: localSort || null,
      verified: localVerified ? 'true' : null
    });
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setLocalKeyword('');
    setLocalMin('');
    setLocalMax('');
    setLocalBrand('');
    setLocalCat('');
    setLocalSubcat('');
    setLocalCondition('');
    setLocalLocation('');
    setLocalSort('newest');
    setLocalVerified(false);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setLocalKeyword(suggestion.text);
    setShowAutocomplete(false);
    saveRecentSearch(suggestion.text);
    
    const params: Record<string, string | null> = {
      q: suggestion.text,
      minPrice: localMin || null,
      maxPrice: localMax || null,
      brand: localBrand || null,
      category: localCat || null,
      subcategory: localSubcat || null,
      condition: localCondition || null,
      location: localLocation || null,
      sort: localSort || null,
      verified: localVerified ? 'true' : null
    };

    if (suggestion.type === 'category') {
      params.category = suggestion.text;
      params.subcategory = null;
    } else if (suggestion.type === 'subcategory') {
      if (suggestion.category) params.category = suggestion.category;
      params.subcategory = suggestion.text;
    }

    updateParams(params);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [filteredListings.length, filterKeyword, filterCat, filterSubcat, filterLocation, filterMinPrice, filterMaxPrice, sortBy]);

  return (
    <div className="min-h-screen bg-stone-50/50">
      {/* 1. Header Filter Section - Always Visible */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-10 py-4">
          <form onSubmit={handleSearchClick} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center bg-stone-100 rounded-2xl border border-stone-200 p-1 group focus-within:ring-4 focus-within:ring-amber-500/10 focus-within:border-amber-500 transition-all duration-300 relative">
                 <div className="pl-4 text-stone-400 group-focus-within:text-amber-500 transition-colors">
                    <Search className="w-5 h-5" />
                 </div>
                 <input 
                   type="text"
                   placeholder="Product name, brand, or search anything..."
                   className="flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-sm font-medium text-stone-800 placeholder:text-stone-400"
                   value={localKeyword}
                   onChange={(e) => {
                     setLocalKeyword(e.target.value);
                     setShowAutocomplete(true);
                   }}
                   onFocus={() => setShowAutocomplete(true)}
                 />

                 {showAutocomplete && localKeyword.length > 0 && (
                   <div ref={autocompleteRef} className="absolute top-[calc(100%+8px)] left-0 right-0 z-50">
                      <SearchAutocomplete 
                        query={localKeyword} 
                        onSelect={handleSuggestionSelect}
                        onClose={() => setShowAutocomplete(false)}
                      />
                   </div>
                 )}
              </div>
              <button 
                type="submit"
                className="hidden md:flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-amber-500 hover:text-stone-900 transition-all shadow-xl active:scale-95"
              >
                 <Search className="w-4 h-4" /> Search
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    showFilters ? "bg-amber-500 text-stone-900 shadow-inner" : "bg-stone-900 text-white shadow-lg"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4" /> 
                  Filter
                </button>
                <button 
                  type="button"
                  onClick={clearFilters}
                  className="px-6 py-3 bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-stone-200 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2 inline-block" />
                  Clear
                </button>
              </div>

              <div className="hidden lg:flex items-center gap-4 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
                <span>{filteredListings.length} Results Found</span>
              </div>
              
              <div className="md:hidden flex-grow">
                 <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-xl"
                >
                   <Search className="w-4 h-4" /> Search
                </button>
              </div>
            </div>

            {/* Expanded Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 pb-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Category */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Category</label>
                      <div className="relative">
                        <select 
                          value={localCat}
                          onChange={(e) => {
                            setLocalCat(e.target.value);
                            setLocalSubcat('');
                          }}
                          className="w-full appearance-none bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-stone-800 outline-none transition-all focus:ring-2 focus:ring-amber-500/20"
                        >
                          <option value="">All Categories</option>
                          {MARKETPLACE_CATEGORIES.filter(c => c.name !== 'Sold Out').map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sub Category */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Sub Category</label>
                      <div className="relative">
                        <select 
                          value={localSubcat}
                          disabled={!localCat || subcategories.length === 0}
                          onChange={(e) => setLocalSubcat(e.target.value)}
                          className="w-full appearance-none bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-stone-800 outline-none transition-all focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
                        >
                          <option value="">{localCat ? 'All Sub Categories' : 'Select Category'}</option>
                          {subcategories.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Condition</label>
                       <div className="flex gap-2">
                          {['All', 'New', 'Used'].map(cond => (
                            <button 
                              key={cond}
                              type="button"
                              onClick={() => setLocalCondition(cond === 'All' ? '' : cond)}
                              className={cn(
                                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                (cond === 'All' && !localCondition) || localCondition === cond ? "bg-stone-900 border-stone-900 text-white shadow-md active:scale-95" : "bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200"
                              )}
                            >
                              {cond}
                            </button>
                          ))}
                       </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Location</label>
                      <div className="relative">
                        <select 
                          value={localLocation}
                          onChange={(e) => setLocalLocation(e.target.value)}
                          className="w-full appearance-none bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-stone-800 outline-none transition-all focus:ring-2 focus:ring-amber-500/20"
                        >
                          {LOCATIONS.map(loc => (
                            <option key={loc} value={loc === 'All Pakistan' ? '' : loc}>{loc}</option>
                          ))}
                        </select>
                        <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Price (MIN - MAX)</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          placeholder="Min" 
                          value={localMin}
                          onChange={(e) => setLocalMin(e.target.value)}
                          className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                        />
                        <span className="text-stone-300 font-bold">-</span>
                        <input 
                          type="number" 
                          placeholder="Max" 
                          value={localMax}
                          onChange={(e) => setLocalMax(e.target.value)}
                          className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                        />
                      </div>
                    </div>

                    {/* Brand */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Brand (optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Apple, Toyota..." 
                        value={localBrand}
                        onChange={(e) => setLocalBrand(e.target.value)}
                        className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>

                    {/* Sorting */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Sort By Period/Price</label>
                      <div className="relative">
                        <select 
                          value={localSort}
                          onChange={(e) => setLocalSort(e.target.value)}
                          className="w-full appearance-none bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-xs font-bold uppercase text-stone-800 outline-none transition-all focus:ring-2 focus:ring-amber-500/20"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="price_low">Price: Low to High</option>
                          <option value="price_high">Price: High to Low</option>
                        </select>
                        <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Sellers */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Sellers Status</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setLocalVerified(!localVerified)}
                          className={cn(
                            "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                            localVerified ? "bg-emerald-500 border-emerald-500 text-white shadow-md active:scale-95" : "bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200"
                          )}
                        >
                          <div className={cn("w-3 h-3 rounded-full", localVerified ? "bg-white" : "bg-stone-300")} />
                          Verified Only
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end gap-3 pb-4">
                    <button 
                      type="submit"
                      className="px-10 py-3 bg-amber-500 text-stone-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-amber-600 transition-all active:scale-95"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </div>

      <div ref={resultsRef} className="max-w-[1440px] mx-auto px-4 lg:px-10 py-10 scroll-mt-32 md:scroll-mt-40">
        {matchingProfiles.length > 0 && (
          <section className="mb-12">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {matchingProfiles.map(profile => (
                  <Link 
                     key={profile.id} 
                     to={`/profile/${profile.id}`}
                     className="flex items-center gap-4 p-5 bg-white border border-stone-100 rounded-3xl hover:shadow-2xl transition-all group"
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-stone-100 border-2 border-white shadow-sm flex-shrink-0">
                      {profile.photoURL ? (
                        <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <User size={24} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-stone-900 truncate uppercase text-sm italic leading-none mb-1">{profile.name}</p>
                      <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {profile.city || 'Pakistan'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 transition-all" />
                  </Link>
                ))}
             </div>
          </section>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-10">
             {Array.from({ length: 8 }).map((_, i) => (
               <div key={i} className="aspect-[4/5] bg-white border border-stone-100 rounded-3xl animate-pulse" />
             ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-3xl border border-stone-100">
             <div className="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-stone-200" />
             </div>
             <h3 className="text-2xl font-black italic uppercase tracking-tighter text-stone-900 mb-2">Search Results not Found</h3>
             <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest max-w-sm mx-auto leading-relaxed px-6">
                Try adjusting your filters or search criteria.
             </p>
             <button 
               onClick={clearFilters}
               className="mt-8 px-10 py-3 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-amber-500 hover:text-stone-900 transition-all shadow-xl shadow-stone-900/10"
             >
               Clear Filters
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-10">
            {filteredListings.map(listing => (
                 <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
