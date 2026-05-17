import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogIn, 
  Menu, 
  X, 
  MessageCircle, 
  User, 
  Bell, 
  LogOut, 
  LayoutDashboard as LayoutDashboardIcon, 
  PlusCircle, 
  BookOpen, 
  ArrowRight, 
  Zap,
  Search,
  MapPin,
  Heart,
  ChevronDown,
  Home as HomeIcon,
  Compass,
  PlusSquare,
  Package,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  Grid,
  ShieldAlert
} from 'lucide-react';
import { doc, getDocs, collection, query, where, setDoc, serverTimestamp, onSnapshot, orderBy, limit, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES, LOCATIONS } from '../constants';
import { CATEGORIES_WITH_SUBCATEGORIES } from '../lib/categories';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MyNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
}

import { Footer } from './Footer';

import { SearchAutocomplete } from './SearchAutocomplete';
import { SearchSuggestion, saveRecentSearch, updateListingIndex } from '../services/searchService';

export function Layout() {
  const { user, isAdmin, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [notifications, setNotifications] = useState<MyNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'All Pakistan');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get('subcategory') || '');
  const [selectedCondition, setSelectedCondition] = useState(searchParams.get('condition') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  
  const navigate = useNavigate();
  const location = useLocation();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const categoriesMenuRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const subcategories = selectedCategory ? (CATEGORIES_WITH_SUBCATEGORIES[selectedCategory] || []) : [];

  // Sync marketplace titles with search index
  useEffect(() => {
    const q = query(collection(db, 'listings'), where('status', '==', 'LIVE'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const titles = snapshot.docs.map(doc => doc.data().title as string);
      updateListingIndex(titles);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MyNotification)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setShowProfileMenu(false);
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) setShowLocationMenu(false);
      if (categoriesMenuRef.current && !categoriesMenuRef.current.contains(event.target as Node)) setShowCategoriesMenu(false);
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) setShowAutocomplete(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    // Immediately mark as read in local state
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    for (const n of unread) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowAutocomplete(false);
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
    }
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedLocation !== 'All Pakistan') params.set('location', selectedLocation);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
    if (selectedCondition) params.set('condition', selectedCondition);
    if (sortBy) params.set('sort', sortBy);
    navigate(`/listings?${params.toString()}`);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text);
    setShowAutocomplete(false);
    saveRecentSearch(suggestion.text);
    
    const params = new URLSearchParams(searchParams);
    params.set('q', suggestion.text);
    
    if (suggestion.type === 'category') {
      params.set('category', suggestion.text);
    } else if (suggestion.type === 'subcategory') {
      if (suggestion.category) params.set('category', suggestion.category);
      params.set('subcategory', suggestion.text);
    }
    
    navigate(`/listings?${params.toString()}`);
  };

  useEffect(() => {
    // Reset subcategory if category changes manually in state
    setSelectedSubcategory('');
  }, [selectedCategory]);

  useEffect(() => {
    // Sync state with URL params
    setSearchQuery(searchParams.get('q') || '');
    setSelectedLocation(searchParams.get('location') || 'All Pakistan');
    setSelectedCategory(searchParams.get('category') || '');
    setSelectedSubcategory(searchParams.get('subcategory') || '');
    setSelectedCondition(searchParams.get('condition') || '');
    setSortBy(searchParams.get('sort') || 'newest');
  }, [searchParams]);

  const isListingsPage = location.pathname === '/listings';
  const hasSearchParams = !!searchParams.get('category') || !!searchParams.get('subcategory') || !!searchParams.get('q');
  const isSearchMode = isListingsPage || (location.pathname === '/' && hasSearchParams);

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-stone-900">
      {/* Top Banner / Notification Bar */}
      {/* Premium Sticky Header */}
      {!isSearchMode && (
        <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-stone-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] transition-all duration-300">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="flex items-center justify-between h-16 lg:h-20 gap-4">
              
              {/* Logo - Far Left */}
              <Link to="/" className="shrink-0 flex items-center group transition-transform duration-300 hover:scale-105">
                <img src="/logo.png" alt="Mandi.pk" className="h-8 lg:h-11 w-auto object-contain" />
              </Link>

              {/* SEARCH BAR RESTORED */}
              <div className="hidden md:flex flex-grow max-w-2xl mx-10">
                <form 
                  onSubmit={handleSearch}
                  className="w-full flex items-center bg-stone-50 border border-stone-200 rounded-2xl p-1 shadow-inner focus-within:ring-2 focus-within:ring-amber-500/20 transition-all"
                >
                  <div className="relative group px-3 border-r border-stone-200">
                    <button 
                      type="button"
                      onClick={() => setShowLocationMenu(!showLocationMenu)}
                      className="flex items-center gap-2 py-2 text-xs font-black text-stone-600 uppercase tracking-widest whitespace-nowrap"
                    >
                      <MapPin className="w-4 h-4 text-amber-500" />
                      {selectedLocation.split(',')[0]}
                      <ChevronDown className="w-3 h-3 text-stone-400 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                    {showLocationMenu && (
                      <div ref={locationMenuRef} className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-100 z-[110] py-4 max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-4 mb-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">Select Location</div>
                        {LOCATIONS.map(loc => (
                          <button
                            key={loc}
                            onClick={() => { setSelectedLocation(loc); setShowLocationMenu(false); }}
                            className={cn(
                              "w-full text-left px-4 py-2 text-xs font-bold transition-all",
                              selectedLocation === loc ? "text-amber-600 bg-amber-50" : "text-stone-600 hover:bg-stone-50"
                            )}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow flex items-center px-4 relative">
                    <Search className="w-4 h-4 text-stone-400 mr-2" />
                    <input 
                      type="text" 
                      placeholder="What are you trading today?"
                      className="w-full bg-transparent border-none text-sm font-medium focus:ring-0 placeholder:text-stone-300"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setShowAutocomplete(true);
                      }}
                      onFocus={() => setShowAutocomplete(true)}
                    />
                    
                    {showAutocomplete && searchQuery.length > 0 && (
                      <div ref={autocompleteRef}>
                        <SearchAutocomplete 
                          query={searchQuery} 
                          onSelect={handleSuggestionSelect}
                          onClose={() => setShowAutocomplete(false)}
                        />
                      </div>
                    )}
                  </div>
                  <button 
                    type="submit"
                    className="bg-stone-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-md active:scale-95"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* Navigation Actions Group - Far Right */}
              <div className="flex items-center gap-2 lg:gap-4">
                
                {/* Main Navigation Pill */}
                <nav className="flex items-center bg-stone-50 border border-stone-200 rounded-full p-1 shadow-inner gap-1">
                  
                  {/* 1. Home Button (Reading order LTR: 1st in group) */}
                  <Link 
                    to="/" 
                    className={cn(
                      "p-2.5 rounded-full transition-all duration-300 flex items-center justify-center group",
                      location.pathname === "/" 
                        ? "bg-white text-amber-600 shadow-md border border-stone-100" 
                        : "text-stone-400 hover:bg-white hover:text-stone-900 border border-transparent"
                    )}
                    title="Home"
                  >
                    <HomeIcon className="w-5 h-5" />
                  </Link>

                  {/* 2. Premium & Verified Seller List (Highlighted) */}
                  <Link 
                    to="/verified" 
                    className={cn(
                      "px-4 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2 group",
                      location.pathname === "/verified" 
                        ? "bg-amber-500 text-stone-900 shadow-lg shadow-amber-500/20" 
                        : "bg-white text-stone-600 hover:bg-amber-50 hover:text-amber-600 border border-stone-100 hover:border-amber-100 shadow-sm"
                    )}
                  >
                    <ShieldCheck className={cn("w-5 h-5", location.pathname === "/verified" ? "text-stone-900" : "text-amber-500")} /> 
                    <span className="hidden xl:inline text-[10px] font-black uppercase tracking-widest">Premium</span>
                  </Link>

                  {/* 3. Chat icon */}
                  <Link 
                    to="/messages" 
                    className={cn(
                      "p-2.5 rounded-full transition-all duration-300 flex items-center justify-center group",
                      location.pathname === "/messages" 
                        ? "bg-white text-amber-600 shadow-md border border-stone-100" 
                        : "text-stone-400 hover:bg-white hover:text-stone-900 border border-transparent"
                    )}
                    title="Chat"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Link>

                  {/* 4. Notification Bell icon */}
                  <div className="relative">
                    <button 
                      onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllAsRead(); }}
                      className={cn(
                        "p-2.5 rounded-full transition-all duration-300 flex items-center justify-center relative group",
                        showNotifications 
                          ? "bg-white text-amber-600 shadow-md border border-stone-100" 
                          : "text-stone-400 hover:bg-white hover:text-stone-900 border border-transparent"
                      )}
                      title="Notifications"
                    >
                      <Bell className="w-5 h-5" /> 
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white ring-2 ring-amber-500/20 animate-pulse" />
                      )}
                    </button>
                    
                    {showNotifications && (
                      <div className="absolute right-0 mt-4 w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] border border-stone-100 z-[210] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-5 bg-stone-50/50 border-b border-stone-100 flex justify-between items-center">
                          <h3 className="font-black text-[10px] uppercase tracking-widest text-stone-400">Activity Center</h3>
                          <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-stone-200 rounded-lg transition-colors"><X className="w-4 h-4 text-stone-400" /></button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-16 text-center text-stone-300 text-[10px] uppercase font-black italic tracking-widest">Nothing Here Yet</div>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} className={cn("p-6 border-b border-stone-50 transition-all hover:bg-stone-50/80", !n.read && "bg-amber-50/30 font-bold")}>
                                <p className="text-xs text-stone-900 mb-1.5 leading-tight">{n.title}</p>
                                <p className="text-[11px] text-stone-500 leading-relaxed font-normal">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Menu icon (3 lines) - Extreme Right in group */}
                  <button 
                    onClick={() => setMobileMenuOpen(true)} 
                    className="p-2.5 rounded-full text-stone-400 hover:bg-white hover:text-stone-900 border border-transparent hover:shadow-md transition-all duration-300 flex items-center justify-center group"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                </nav>

                {/* Login/Register Buttons (Desktop) */}
                <div className="hidden sm:flex items-center gap-2 ml-2">
                  {!user || user.isAnonymous ? (
                    <>
                      <button onClick={handleLogin} className="px-4 py-2.5 text-xs font-black text-stone-500 uppercase tracking-widest hover:text-stone-900 transition-colors">Sign In</button>
                      <button onClick={handleLogin} className="px-6 py-2.5 text-xs font-black text-white bg-stone-900 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-stone-900/10 uppercase tracking-widest">Join now</button>
                    </>
                  ) : (
                    <div className="relative">
                      <button 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="w-10 h-10 rounded-full border-2 border-stone-100 overflow-hidden hover:border-amber-400 transition-all"
                        title="Account"
                      >
                        {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400"><User className="w-5 h-5" /></div>}
                      </button>

                      {showProfileMenu && (
                        <div className="absolute right-0 mt-4 w-64 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] border border-stone-100 z-[210] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500 py-3">
                           <div className="px-6 py-4 border-b border-stone-50 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-amber-500 font-black italic shadow-inner">
                                 {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className="min-w-0">
                                 <p className="font-black text-stone-900 truncate text-sm">{user.displayName || 'Farmer'}</p>
                                 <p className="text-[10px] text-stone-400 font-bold uppercase truncate">{user.email}</p>
                              </div>
                           </div>
                           <div className="p-2 space-y-1">
                              <Link to="/profile" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all uppercase tracking-widest">
                                 <User className="w-4 h-4 text-amber-500" /> Account Settings
                              </Link>
                              <Link to="/dashboard" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all uppercase tracking-widest">
                                 <LayoutDashboardIcon className="w-4 h-4 text-amber-500" /> Seller Dashboard
                              </Link>
                              <Link to="/my-listings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all uppercase tracking-widest">
                                 <Grid className="w-4 h-4 text-amber-500" /> Manage Ads
                              </Link>
                              {isAdmin && (
                                <Link to="/admin" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-amber-600 bg-amber-50/30 hover:bg-stone-900 hover:text-white transition-all uppercase tracking-widest italic group">
                                   <ShieldAlert className="w-4 h-4 group-hover:animate-pulse" /> Platform Admin
                                </Link>
                              )}
                           </div>
                           <div className="p-2 border-t border-stone-50 mt-2">
                              <button 
                                onClick={() => { logout(); setShowProfileMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest"
                              >
                                 <LogOut className="w-4 h-4" /> Sign Out
                              </button>
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Prominent Quick Actions Bar */}
      {!isSearchMode && location.pathname !== '/messages' && (
        <div className="bg-white border-b border-stone-100 py-2.5 lg:py-4">
          <div className="max-w-[1440px] mx-auto px-3 flex items-center justify-center gap-2 md:gap-6 flex-nowrap">
             <Link to="/listings" className="flex-1 flex items-center justify-center gap-1 md:gap-2 bg-stone-900 text-white px-2 py-2.5 rounded-xl font-black uppercase text-[9px] md:text-xs tracking-tight md:tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-lg active:scale-95 whitespace-nowrap overflow-hidden">
               <Compass className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Marketplace</span>
             </Link>
             <Link to="/submit" className="flex-1 flex items-center justify-center gap-1 md:gap-2 bg-amber-500 text-stone-900 px-2 py-2.5 rounded-xl font-black uppercase text-[9px] md:text-xs tracking-tight md:tracking-widest hover:bg-stone-900 hover:text-white transition-all shadow-lg active:scale-95 whitespace-nowrap overflow-hidden">
               <PlusCircle className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Post your ad</span>
             </Link>
          </div>
        </div>
      )}

      {/* Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200]">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)}></div>
           <div className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto elastic-scroll">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                 <Link to="/" onClick={() => setMobileMenuOpen(false)}><img src="/logo.png" className="h-10 w-auto" /></Link>
                 <button onClick={() => setMobileMenuOpen(false)} className="p-3 bg-white border border-stone-200 rounded-2xl shadow-sm"><X className="w-6 h-6 text-stone-400" /></button>
              </div>
              
              <div className="p-6 flex flex-col gap-2">
                 {user && !user.isAnonymous && (
                   <div className="bg-stone-900 rounded-3xl p-6 mb-4 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                         <User className="w-24 h-24" />
                      </div>
                      <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 bg-stone-800">
                          {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-stone-500" />}
                        </div>
                        <div>
                          <p className="font-black text-lg leading-none mb-1">{user.displayName || 'Seller'}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest text-stone-500 opacity-80">CONNECTED ACTIVE</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 relative z-10">
                         <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="bg-white/10 hover:bg-white/20 text-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">View Profile</Link>
                         <Link to="/submit" onClick={() => setMobileMenuOpen(false)} className="bg-amber-500 hover:bg-amber-600 text-stone-900 text-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">Post your ad</Link>
                      </div>
                   </div>
                 )}

                 <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><HomeIcon className="w-5 h-5" /></div>
                    Home
                 </Link>
                 <Link to="/listings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><Compass className="w-5 h-5" /></div>
                    Marketplace
                 </Link>
                 {isAdmin && (
                   <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-amber-600 hover:bg-stone-50 rounded-3xl transition-all group">
                      <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 transition-colors"><AlertCircle className="w-5 h-5" /></div>
                      Admin Dashboard
                   </Link>
                 )}
                 <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><LayoutDashboardIcon className="w-5 h-5" /></div>
                    Seller Hub
                 </Link>
                 <Link to="/verified" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><ShieldCheck className="w-5 h-5" /></div>
                    Premium & verified sellers
                 </Link>
                 <Link to="/dashboard?tab=bookings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><Zap className="w-5 h-5" /></div>
                    Offers
                 </Link>

                 <div className="border-t border-stone-100 my-6"></div>
                 
                 <div className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-stone-400 italic">Communication & Legal</div>
                 <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 text-xs font-black text-stone-500 hover:text-stone-900 transition-colors group">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full group-hover:scale-150 transition-transform"></div>
                    Chat
                 </Link>
                 <Link to="/support" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 text-xs font-black text-stone-500 hover:text-stone-900 transition-colors group">
                    <div className="w-1.5 h-1.5 bg-stone-300 rounded-full group-hover:scale-150 transition-transform"></div>
                    Help & Feedback
                 </Link>
                 <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 text-xs font-black text-stone-500 hover:text-stone-900 transition-colors group">
                    <div className="w-1.5 h-1.5 bg-stone-300 rounded-full group-hover:scale-150 transition-transform"></div>
                    Contact Us
                 </Link>

                 <div className="mt-8 px-2">
                    {user && !user.isAnonymous ? (
                      <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full bg-red-50 text-red-600 font-black py-5 rounded-3xl text-sm uppercase tracking-widest hover:bg-red-100 transition-colors">Logout</button>
                    ) : (
                      <button onClick={() => { handleLogin(); setMobileMenuOpen(false); }} className="w-full bg-stone-900 text-white font-black py-5 rounded-3xl text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-stone-900/20">Login / Create Account</button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Content Area */}
      <main className="flex-grow z-10 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative pb-20">
        <div className={cn(location.pathname !== "/messages" && "pb-8")}>
          <Outlet />
        </div>
      </main>

      {/* Parallax Revealed Footer */}
      {location.pathname !== '/messages' && <Footer />}

      {/* Modern Bottom Navigation Bar (Always Visible) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-stone-900 backdrop-blur-xl border-t border-stone-800 h-20 px-4 md:px-8 flex items-center justify-between z-[150] shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className={cn("flex flex-col items-center gap-1.5 transition-all group relative", location.pathname === "/" ? "text-amber-500 scale-110" : "text-stone-400 hover:text-stone-300")}>
            {location.pathname === "/" && <span className="absolute -top-[22px] w-8 h-1 bg-amber-500 rounded-full blur-[2px]" />}
            <HomeIcon className={cn("w-6 h-6", location.pathname === "/" ? "fill-amber-500/10" : "")} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Home</span>
          </Link>
          <Link to="/listings" className={cn("flex flex-col items-center gap-1.5 transition-all group relative", location.pathname === "/listings" ? "text-amber-500 scale-110" : "text-stone-400 hover:text-stone-300")}>
            {location.pathname === "/listings" && <span className="absolute -top-[22px] w-8 h-1 bg-amber-500 rounded-full blur-[2px]" />}
            <Search className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Explore</span>
          </Link>
          
          {/* Mobile POST Button Center */}
          <Link to="/submit" className="relative -top-8 flex flex-col items-center justify-center">
             <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[22px] shadow-[0_15px_40px_rgba(245,158,11,0.4)] flex items-center justify-center border-4 border-stone-900 rotate-45 group hover:rotate-[225deg] transition-all duration-700">
                <PlusSquare className="w-8 h-8 text-stone-900 -rotate-45 group-hover:rotate-[225deg] transition-all duration-700" />
             </div>
             <span className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400 mt-3 hidden xs:block">Post your ad</span>
          </Link>
  
          <Link to="/messages" className={cn("flex flex-col items-center gap-1.5 transition-all group relative", location.pathname === "/messages" ? "text-amber-500 scale-110" : "text-stone-400 hover:text-stone-300")}>
            {location.pathname === "/messages" && <span className="absolute -top-[22px] w-8 h-1 bg-amber-500 rounded-full blur-[2px]" />}
            <MessageCircle className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Chat</span>
          </Link>
          <Link to="/profile" className={cn("flex flex-col items-center gap-1.5 transition-all group relative", location.pathname === "/profile" ? "text-amber-500 scale-110" : "text-stone-400 hover:text-stone-300")}>
            {location.pathname === "/profile" && <span className="absolute -top-[22px] w-8 h-1 bg-amber-500 rounded-full blur-[2px]" />}
            <User className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
