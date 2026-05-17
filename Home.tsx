import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, UserProfile } from '../types';
import { ListingCard } from '../components/ListingCard';
import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES, LOCATIONS, MARKETPLACE_CATEGORIES } from '../constants';
import { 
  Rocket, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Star, 
  Shield, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  Lock,
  Users,
  ChevronRight,
  Package,
  Smartphone, 
  Car, 
  Bed,
  Laptop as LaptopIcon,
  Search,
  Filter,
  MapPin,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  RotateCcw,
  LayoutGrid
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryGroup {
  id: string;
  name: string;
  listings: Listing[];
  icon?: any;
}

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [boostedListings, setBoostedListings] = useState<Listing[]>([]);
  const [recommendedListings, setRecommendedListings] = useState<Listing[]>([]);
  const [freshListings, setFreshListings] = useState<Listing[]>([]);
  const [categorySections, setCategorySections] = useState<CategoryGroup[]>([]);
  const [verifiedSellersListings, setVerifiedSellersListings] = useState<Listing[]>([]);
  const [soldOutListings, setSoldOutListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search Hub State
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'All Pakistan');
  const [selectedCondition, setSelectedCondition] = useState(searchParams.get('condition') || '');

  const handleSearch = () => {
    updateParams({
      category: selectedCategory || null,
      location: selectedLocation === 'All Pakistan' ? null : selectedLocation,
      condition: selectedCondition || null
    });
    setIsSearchActive(true);
  };
  const filterKeyword = searchParams.get('q') || '';
  const filterCat = searchParams.get('category') || '';
  const filterSubcat = searchParams.get('subcategory') || '';
  const filterLocation = searchParams.get('location') || '';
  const filterMinPrice = searchParams.get('minPrice') || '';
  const filterMaxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sort') || 'newest';
  const filterCondition = searchParams.get('condition') || '';

  const [localKeyword, setLocalKeyword] = useState(filterKeyword);
  const [localMin, setLocalMin] = useState(filterMinPrice);
  const [localMax, setLocalMax] = useState(filterMaxPrice);

  useEffect(() => {
    if (filterKeyword || filterCat || filterSubcat || filterLocation || filterMinPrice || filterMaxPrice || filterCondition) {
      setIsSearchActive(true);
    } else {
      setIsSearchActive(false);
    }
  }, [filterKeyword, filterCat, filterSubcat, filterLocation, filterMinPrice, filterMaxPrice, filterCondition]);

  useEffect(() => {
    async function fetchData() {
      try {
        const q = query(
          collection(db, 'listings'),
          where('status', 'in', ['LIVE', 'BOOKED', 'SOLD'])
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Listing));
        setAllListings(docs);
        
        // Boosted
        setBoostedListings(docs.filter(d => (d.isBoosted || d.isFeatured) && d.status === 'LIVE' && (d.quantity || 0) > 0).slice(0, 15));

        // Recommended
        setRecommendedListings(docs.filter(d => d.status === 'LIVE' && (d.quantity || 0) > 0).sort(() => 0.5 - Math.random()).slice(0, 16));

        // Fresh Listings (Market Pulse)
        const sortedByNewest = [...docs]
          .filter(d => d.status === 'LIVE' && (d.quantity || 0) > 0)
          .sort((a, b) => {
            const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return timeB - timeA;
          })
          .slice(0, 16);
        setFreshListings(sortedByNewest);

        // Category Preview Sections
        const reqSections = [
          { name: 'Mobiles', subcat: 'Mobile Phones', icon: Smartphone },
          { name: 'Cars', subcat: 'Cars', icon: Car },
          { name: 'Tabs', subcat: 'Tablets', icon: LayoutGrid },
          { name: 'Laptops', subcat: 'Laptops', icon: LaptopIcon },
          { name: 'Motorcycle & Bicycle', subcat: 'Motorcycles', icon: Car },
          { name: 'Home', cat: 'Home & Furniture', icon: Bed }
        ].map(s => ({
          id: s.name,
          name: s.name,
          listings: docs.filter(d => 
            (s.subcat ? d.subcategory === s.subcat : d.category === s.cat) && 
            d.status === 'LIVE' && (d.quantity || 0) > 0
          ).slice(0, 12)
        }));
        setCategorySections(reqSections);

        setVerifiedSellersListings(docs.filter(d => d.isFeatured && d.status === 'LIVE').slice(0, 15));
        setSoldOutListings(docs.filter(d => d.status === 'SOLD' || (d.quantity || 0) <= 0).slice(0, 12));

      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'home');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredResults = useMemo(() => {
    if (!isSearchActive) return [];
    
    let result = allListings.filter(d => {
      const isLive = d.status === 'LIVE' && (d.quantity || 0) > 0;
      const isSold = d.status === 'SOLD' || (d.quantity || 0) <= 0;
      
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

      if (filterKeyword) {
        const queryText = filterKeyword.toLowerCase().trim();
        const keywords = queryText.split(' ').filter(k => k.length > 0);
        const searchableContent = `${d.title} ${d.description} ${d.category} ${d.subcategory || ''} ${d.location || ''}`.toLowerCase();
        return keywords.every(kw => searchableContent.includes(kw));
      }
      return true;
    });

    result.sort((a, b) => {
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
  }, [allListings, isSearchActive, filterKeyword, filterCat, filterSubcat, filterLocation, filterMinPrice, filterMaxPrice, sortBy, filterCondition]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      q: localKeyword || null,
      minPrice: localMin || null,
      maxPrice: localMax || null
    });
    setIsSearchActive(true);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
    setLocalKeyword('');
    setLocalMin('');
    setLocalMax('');
    setIsSearchActive(false);
  };

  const getCategoryColor = (name: string) => {
    switch (name) {
      case 'Mobiles': return { icon: 'text-indigo-500', bg: 'bg-indigo-50', hover: 'group-hover:bg-indigo-500' };
      case 'Electronics': return { icon: 'text-blue-500', bg: 'bg-blue-50', hover: 'group-hover:bg-blue-500' };
      case 'Vehicles': return { icon: 'text-red-500', bg: 'bg-red-50', hover: 'group-hover:bg-red-500' };
      case 'Property': return { icon: 'text-emerald-500', bg: 'bg-emerald-50', hover: 'group-hover:bg-emerald-500' };
      case 'Fashion': return { icon: 'text-pink-500', bg: 'bg-pink-50', hover: 'group-hover:bg-pink-500' };
      case 'Furniture': return { icon: 'text-amber-700', bg: 'bg-amber-50', hover: 'group-hover:bg-amber-700' };
      case 'Grocery': return { icon: 'text-green-600', bg: 'bg-green-50', hover: 'group-hover:bg-green-600' };
      case 'Sports': return { icon: 'text-orange-500', bg: 'bg-orange-50', hover: 'group-hover:bg-orange-500' };
      case 'Kids': return { icon: 'text-purple-500', bg: 'bg-purple-50', hover: 'group-hover:bg-purple-500' };
      case 'Books': return { icon: 'text-indigo-500', bg: 'bg-indigo-50', hover: 'group-hover:bg-indigo-500' };
      case 'Jobs': return { icon: 'text-cyan-600', bg: 'bg-cyan-50', hover: 'group-hover:bg-cyan-600' };
      case 'Industrial': return { icon: 'text-stone-600', bg: 'bg-stone-50', hover: 'group-hover:bg-stone-600' };
      case 'Pets': return { icon: 'text-yellow-600', bg: 'bg-yellow-50', hover: 'group-hover:bg-yellow-600' };
      case 'Agriculture': return { icon: 'text-lime-600', bg: 'bg-lime-50', hover: 'group-hover:bg-lime-600' };
      case 'Events': return { icon: 'text-rose-500', bg: 'bg-rose-50', hover: 'group-hover:bg-rose-500' };
      case 'Collectibles': return { icon: 'text-violet-600', bg: 'bg-violet-50', hover: 'group-hover:bg-violet-600' };
      case 'Free': return { icon: 'text-teal-500', bg: 'bg-teal-50', hover: 'group-hover:bg-teal-500' };
      default: return { icon: 'text-stone-400', bg: 'bg-stone-50', hover: 'group-hover:bg-amber-500' };
    }
  };

  const selectedCategoryData = MARKETPLACE_CATEGORIES.find(c => c.name === filterCat);
  const subcategories = selectedCategoryData?.subcategories || [];

  return (
    <div className="bg-white min-h-screen">
      <AnimatePresence mode="wait">
        {isSearchActive ? (
          <motion.div 
            key="search-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-stone-50 min-h-screen"
          >
             <div className="max-w-[1440px] mx-auto px-4 lg:px-10 py-10">
                {/* ADVANCED FILTER BAR RESTORED */}
                <div className="mb-12 bg-white rounded-3xl border border-stone-200 p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 space-y-2">
                       <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Main Categories</label>
                       <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                          {CATEGORIES.map(cat => (
                            <button 
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.name === selectedCategory ? '' : cat.name)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                                selectedCategory === cat.name ? "bg-stone-900 text-white border-stone-900 shadow-lg" : "bg-white text-stone-500 border-stone-100 hover:border-amber-300"
                              )}
                            >
                              {cat.name}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="md:col-span-1 space-y-2">
                       <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Location Area</label>
                       <select 
                         value={selectedLocation}
                         onChange={(e) => setSelectedLocation(e.target.value)}
                         className="w-full bg-stone-50 border-stone-100 rounded-xl text-sm font-bold text-stone-900 focus:ring-amber-500/20"
                       >
                         {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                       </select>
                    </div>
                    <div className="md:col-span-1 space-y-2">
                       <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Condition</label>
                       <div className="grid grid-cols-2 gap-2">
                          {['NEW', 'USED'].map(cond => (
                            <button 
                               key={cond}
                               onClick={() => setSelectedCondition(cond === selectedCondition ? '' : cond)}
                               className={cn(
                                 "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                 selectedCondition === cond ? "bg-amber-500 text-stone-900 border-amber-600 shadow-md" : "bg-white text-stone-500 border-stone-100 hover:border-amber-300"
                               )}
                            >
                               {cond}
                            </button>
                          ))}
                       </div>
                    </div>
                    <div className="md:col-span-1 flex items-end">
                       <button 
                         onClick={handleSearch}
                         className="w-full bg-stone-900 hover:bg-amber-600 hover:text-stone-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                       >
                          <Search className="w-4 h-4" /> Apply Marketplace Filters
                       </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                   {subcategories.length > 0 && (
                     <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-8 overflow-hidden"
                     >
                        <div className="flex flex-wrap gap-2">
                           {subcategories.map(sub => (
                             <button 
                                key={sub}
                                onClick={() => updateParams({ subcategory: sub === filterSubcat ? null : sub })}
                                className={cn(
                                   "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                   filterSubcat === sub ? "bg-amber-500 border-amber-500 text-stone-900 shadow-lg" : "bg-white border-stone-200 text-stone-400 hover:border-stone-400"
                                )}
                             >
                                {sub}
                             </button>
                           ))}
                        </div>
                     </motion.div>
                   )}
                </AnimatePresence>

                {loading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                     {Array.from({ length: 8 }).map((_, i) => (
                       <div key={i} className="aspect-[4/5] bg-white rounded-3xl animate-pulse" />
                     ))}
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="py-24 text-center bg-white rounded-[3rem] border border-stone-100 shadow-sm">
                      <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                         <Search className="w-8 h-8 text-stone-200" />
                      </div>
                      <h3 className="text-xl font-black uppercase italic tracking-tighter text-stone-900 mb-2">No results matching filters</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-300 max-w-xs mx-auto">Try broadening your search criteria or reset filters.</p>
                      <button onClick={clearFilters} className="mt-8 px-8 py-3 bg-stone-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all">Clear Search</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-10">
                     {filteredResults.map(listing => (
                        <ListingCard key={listing.id} listing={listing} />
                     ))}
                  </div>
                )}
             </div>
          </motion.div>
        ) : (
          <motion.div 
            key="home-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 1. Featured Ads Section (Emerald Highlight) */}
            <section className="py-3 lg:py-6 bg-gradient-to-b from-emerald-50/40 to-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-200/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 relative z-10">
                <div className="flex items-center justify-between mb-4 lg:mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.4em] mb-2 lg:mb-3">
                       <Zap className="w-4 h-4 fill-emerald-500" /> Premium Curation
                    </div>
                    <h2 className="text-xl lg:text-3xl font-black italic uppercase tracking-tighter text-stone-900 leading-none">
                       Featured <span className="text-emerald-500">Discoveries</span>
                    </h2>
                  </div>
                  <Link to="/listings?filter=featured" className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-white border border-stone-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-emerald-500 hover:border-emerald-200 transition-all shadow-sm">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {loading ? (
                  <div className="h-80 flex items-center justify-center text-stone-400 font-black italic uppercase tracking-widest animate-pulse text-sm">Loading Treasures...</div>
                ) : boostedListings.length > 0 ? (
                  <div className="grid grid-rows-2 grid-flow-col gap-4 lg:gap-6 overflow-x-auto pb-4 lg:pb-6 scrollbar-none snap-x">
                     {boostedListings.map(listing => (
                        <div key={listing.id} className="w-[160px] sm:w-[240px] md:w-[320px] snap-start">
                           <ListingCard listing={listing} premium />
                        </div>
                     ))}
                  </div>
                ) : (
                  <div className="bg-white border-4 border-dashed border-stone-200 rounded-[3rem] p-20 text-center">
                     <Rocket className="w-16 h-16 text-stone-200 mx-auto mb-6" />
                     <p className="font-black text-stone-300 uppercase italic text-lg">Seeking the extraordinary...</p>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Recommended Picks Section (Blue Highlight) */}
            <section className="py-3 lg:py-6 bg-[#f8fbff] overflow-hidden relative">
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
              
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 relative z-10">
                <div className="flex items-center justify-between mb-4 lg:mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] mb-2 lg:mb-3">
                       <Star className="w-4 h-4 fill-blue-500" /> Precision Matching
                    </div>
                    <h2 className="text-xl lg:text-3xl font-black italic uppercase tracking-tighter text-stone-900 leading-none">
                       Recommended <span className="text-blue-500">Picks</span>
                    </h2>
                  </div>
                  <Link to="/listings" className="flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 bg-white border border-stone-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-blue-500 hover:border-blue-200 transition-all shadow-sm">
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="aspect-[4/5] bg-white rounded-3xl animate-pulse" />
                    ))}
                  </div>
                ) : recommendedListings.length > 0 ? (
                  <div className="grid grid-rows-2 grid-flow-col gap-4 lg:gap-6 overflow-x-auto pb-4 lg:pb-6 scrollbar-none snap-x">
                     {recommendedListings.map(listing => (
                        <div key={listing.id} className="w-[160px] sm:w-[240px] md:w-[320px] snap-start">
                           <ListingCard listing={listing} />
                        </div>
                     ))}
                  </div>
                ) : (
                  <div className="bg-white border-4 border-dashed border-stone-100 rounded-[3rem] p-20 text-center">
                     <Package className="w-16 h-16 text-stone-200 mx-auto mb-6" />
                     <p className="font-black text-stone-300 uppercase italic text-lg">Tailoring your experience...</p>
                  </div>
                )}
              </div>
            </section>

            {/* 3. All Categories Section */}
            <section className="py-4 lg:py-6 bg-stone-50">
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 mb-4">
                 <div className="flex items-center gap-2 text-stone-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                    <LayoutGrid className="w-3.5 h-3.5" /> Browse By Category
                 </div>
                 <h2 className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter text-stone-900 leading-none">
                    All <span className="text-stone-400">Categories</span>
                 </h2>
              </div>
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 overflow-x-auto pb-6 scrollbar-none snap-x">
                <div className="grid grid-rows-2 grid-flow-col gap-3 md:gap-4 min-w-max snap-mandatory">
                  {CATEGORIES.slice(0, 16).map(cat => {
                    const colors = getCategoryColor(cat.name);
                    return (
                      <button 
                        key={cat.id} 
                        onClick={() => updateParams({ category: cat.id, subcategory: null })}
                        className="snap-start w-[76px] md:w-[90px] group relative bg-white rounded-2xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-500 hover:shadow-xl border border-stone-100"
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-500 shadow-sm shadow-stone-200/50",
                          colors.bg,
                          colors.hover
                        )}>
                           <cat.icon className={cn("w-3 h-3 transition-colors", colors.icon, "group-hover:text-white")} />
                        </div>
                        <span className="text-[6px] md:text-[7px] font-black uppercase tracking-tight text-stone-900 text-center leading-tight">{cat.name}</span>
                      </button>
                    );
                  })}
                  <button 
                    onClick={() => setIsSearchActive(true)}
                    className="snap-start w-[76px] md:w-[90px] group relative bg-amber-500 rounded-2xl p-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-500 hover:shadow-xl border-none"
                  >
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white transition-all duration-500 shadow-sm">
                       <ArrowRight className="w-3 h-3 text-white group-hover:text-amber-500 transition-colors" />
                    </div>
                    <span className="text-[6px] md:text-[7px] font-black uppercase tracking-tight text-white text-center leading-tight">See More</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 3.1 Custom Category Previews */}
            {categorySections.map((section) => (
              <section key={section.id} className="py-3 lg:py-6 bg-white border-b border-stone-100">
                <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
                  <div className="flex items-center justify-between mb-4 lg:mb-8">
                    <div>
                      <div className="flex items-center gap-2 text-stone-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1 lg:mb-2">
                        {section.icon && (
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center",
                            section.name === 'Mobiles' ? "bg-indigo-50 text-indigo-500" :
                            section.name === 'Cars' ? "bg-red-50 text-red-500" :
                            section.name === 'Tabs' ? "bg-amber-50 text-amber-500" :
                            section.name === 'Laptops' ? "bg-indigo-50 text-indigo-500" :
                            section.name === 'Motorcycle & Bicycle' ? "bg-orange-50 text-orange-500" :
                            section.name === 'Home' ? "bg-emerald-50 text-emerald-500" : "bg-stone-50 text-stone-400"
                          )}>
                            <section.icon className="w-3.5 h-3.5" />
                          </div>
                        )} Direct From Market
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-black italic uppercase tracking-tighter text-stone-900 leading-none">
                        {section.name}
                      </h2>
                    </div>
                      <Link 
                        to={section.id === 'Home' 
                          ? `/listings?category=${encodeURIComponent('Home & Furniture')}` 
                          : section.name === 'Motorcycle & Bicycle'
                            ? `/listings?category=${encodeURIComponent('Vehicles')}&subcategory=${encodeURIComponent('Motorcycles')}`
                            : section.name === 'Cars'
                              ? `/listings?category=${encodeURIComponent('Vehicles')}&subcategory=${encodeURIComponent('Cars')}`
                              : section.name === 'Mobiles'
                                ? `/listings?category=${encodeURIComponent('Mobiles')}&subcategory=${encodeURIComponent('Mobile Phones')}`
                                : `/listings?category=${encodeURIComponent('Electronics')}&subcategory=${encodeURIComponent(section.name === 'Tabs' ? 'Tablets' : 'Laptops')}`
                        } 
                        className="flex items-center gap-2 text-[10px] lg:text-xs font-black uppercase tracking-widest text-stone-400 hover:text-amber-500 transition-colors"
                      >
                      View All <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {section.listings.length > 0 ? (
                    <div className="grid grid-rows-2 grid-flow-col gap-4 lg:gap-8 overflow-x-auto pb-4 lg:pb-6 scrollbar-none snap-x">
                       {section.listings.map(listing => (
                          <div key={listing.id} className="w-[160px] sm:w-[240px] md:w-[320px] snap-start">
                             <ListingCard listing={listing} />
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-stone-50 rounded-[2rem] border border-stone-100">
                       <Package className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">New {section.name} items coming soon</p>
                    </div>
                  )}
                </div>
              </section>
            ))}

            {/* 4. Market Pulse (Fresh Listings) Section */}
            <section className="py-6 lg:py-8 bg-stone-900 relative overflow-hidden">
              {/* High-end decorative accents */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4" />

              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 relative z-10 mb-10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-amber-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                       <TrendingUp className="w-3.5 h-3.5" /> Live Insights
                    </div>
                    <h2 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
                      Market <span className="text-stone-600">Pulse</span>
                    </h2>
                  </div>
                  <Link 
                    to="/listings?sort=newest" 
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-400 hover:text-amber-500 transition-colors"
                  >
                    View All <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 relative z-10">
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="aspect-[4/5] bg-white/5 rounded-[2rem] animate-pulse" />
                      ))}
                    </div>
                ) : freshListings.length > 0 ? (
                    <div className="grid grid-rows-2 grid-flow-col gap-4 lg:gap-6 overflow-x-auto pb-6 scrollbar-none snap-x">
                       {freshListings.map(listing => (
                          <div key={listing.id} className="w-[160px] sm:w-[240px] md:w-[320px] snap-start">
                             <ListingCard listing={listing} dark={true} />
                          </div>
                       ))}
                    </div>
                ) : (
                    <div className="py-24 text-center bg-stone-800/20 rounded-[4rem] border-2 border-dashed border-white/5">
                       <Clock className="w-16 h-16 text-stone-700 mx-auto mb-6" />
                       <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-600">Syncing with real-time arrivals...</p>
                    </div>
                )}
                

              </div>
            </section>

            {/* 5. Premium & Verified Sellers Section (Golden Highlight) */}
            <section className="py-3 lg:py-6 bg-[#fffef0] overflow-hidden relative border-y border-amber-100/50">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-100/20 rounded-full blur-[140px] pointer-events-none" />
               
               <div className="max-w-[1440px] mx-auto px-4 lg:px-8 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 lg:mb-8 gap-3 lg:gap-4">
                     <div>
                        <div className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-[0.4em] mb-2 lg:mb-3">
                           <ShieldCheck className="w-4 h-4 text-amber-500" /> Trusted Network
                        </div>
                        <h2 className="text-xl lg:text-3xl font-black italic uppercase tracking-tighter text-stone-900 leading-none">
                           Premium & <span className="text-amber-600">Verified Sellers</span>
                        </h2>
                     </div>
                     <Link to="/verified" className="inline-flex items-center justify-center gap-2 px-6 py-2.5 lg:py-3 bg-amber-500 text-stone-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-900 hover:text-white transition-all shadow-xl shadow-amber-200">
                        View All <ArrowRight className="w-4 h-4" />
                     </Link>
                  </div>

                  {loading ? (
                    <div className="h-48 flex items-center justify-center text-stone-400 animate-pulse font-black uppercase tracking-widest text-xs">Authenticating Sellers...</div>
                      ) : verifiedSellersListings.length > 0 ? (
                    <div className="grid grid-rows-2 grid-flow-col gap-4 lg:gap-6 overflow-x-auto pb-4 lg:pb-12 scrollbar-none snap-x">
                       {verifiedSellersListings.map(listing => (
                          <div key={listing.id} className="w-[160px] sm:w-[240px] md:w-[320px] snap-start">
                             <ListingCard listing={listing} />
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="py-24 text-center bg-white border border-stone-100 rounded-[3rem] shadow-sm">
                       <Users className="w-16 h-16 text-stone-200 mx-auto mb-6" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">New verified members incoming</p>
                    </div>
                  )}
               </div>
            </section>

            {/* 6. Sold Out Section */}
            <section className="py-4 lg:py-6 bg-white">
               <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <div className="flex items-center gap-2 text-stone-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
                           <Lock className="w-3.5 h-3.5" /> History
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter text-stone-900 leading-none">
                           Recently <span className="text-stone-400">Sold Out</span>
                        </h2>
                     </div>
                     <Link to="/listings?category=Sold Out" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-400 hover:text-amber-500 transition-colors">
                        View All <ArrowRight className="w-4 h-4" />
                     </Link>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="aspect-[4/5] bg-stone-50 rounded-3xl animate-pulse" />
                      ))}
                    </div>
                  ) : soldOutListings.length > 0 ? (
                    <div className="grid grid-rows-2 grid-flow-col gap-4 lg:gap-6 overflow-x-auto pb-4 lg:pb-6 scrollbar-none snap-x opacity-60">
                       {soldOutListings.map(listing => (
                          <div key={listing.id} className="w-[160px] sm:w-[240px] md:w-[320px] snap-start">
                             <ListingCard listing={listing} />
                          </div>
                       ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-stone-50 rounded-[2rem] border border-stone-100">
                       <Clock className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-stone-300">Nothing sold recently. Be the first!</p>
                    </div>
                  )}
               </div>
            </section>

            {/* Unique Book Your Order System Detail Section - Placed after Sold Out */}
            <section className="py-6 lg:py-10 bg-stone-50 overflow-hidden relative">
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
                 <div className="p-8 lg:p-16 bg-white rounded-[3rem] border border-stone-200 flex flex-col lg:flex-row items-center gap-10 shadow-2xl shadow-stone-200/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="w-24 h-24 bg-amber-500 rounded-3xl flex items-center justify-center shrink-0 shadow-xl shadow-amber-200 relative z-10">
                       <Zap className="w-12 h-12 text-stone-900" />
                    </div>
                    
                    <div className="relative z-10 text-center lg:text-left flex-1">
                      <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">Priority Feature</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      </div>
                      <h3 className="text-3xl lg:text-5xl font-black italic uppercase tracking-tighter text-stone-900 mb-6 leading-none">
                        Missed a Deal? <br className="hidden lg:block" />
                        <span className="text-amber-600">Book Your Order Now</span>
                      </h3>
                      <p className="text-lg text-stone-600 font-medium max-w-2xl leading-relaxed">
                        Experience Pakistan's first <span className="font-bold text-stone-900 italic">Priority Reserve Network</span>. 
                        If an item you wanted is marked as <span className="text-stone-400 font-black">SOLD OUT</span>, don't worry. 
                        Our unique system allows you to <span className="font-bold text-stone-900 underline decoration-amber-500 decoration-2 underline-offset-4">pre-book upcoming inventory</span>. 
                        Simply tell us what you missed, and we'll secure the next arrival specifically for you.
                      </p>
                    </div>
                    
                    <div className="lg:ml-auto relative z-10 shrink-0">
                       <Link to="/listings?available=true" className="inline-flex items-center gap-4 px-12 py-6 bg-stone-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-xl active:scale-95 group">
                          Reserve Next Slot <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                       </Link>
                    </div>
                 </div>
              </div>
            </section>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
