import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Listing } from '../types';
import { formatPKR } from '../lib/utils';
import { 
  MapPin, 
  CheckCircle, 
  Trash2, 
  Rocket, 
  Zap, 
  Clock,
  ShieldCheck,
  Star,
  MoreHorizontal,
  ArrowRight,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp, deleteDoc, setDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ListingCardProps {
  listing: Listing;
  onUpdate?: () => void;
  premium?: boolean;
  dark?: boolean;
  imageAspect?: string;
  key?: any;
}

import { motion } from 'motion/react';

export function ListingCard({ listing, onUpdate, premium, dark, imageAspect }: ListingCardProps) {
  const { user, isAdmin, isBlocked } = useAuth();
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();
  
  const isOwner = Boolean(user && user.uid && listing.ownerId && user.uid === listing.ownerId);
  const isBoosted = listing.isBoosted || listing.isFeatured;

  const removeListing = async () => {
    if (isBlocked && !isAdmin) {
      alert("Your account is restricted. You cannot remove listings.");
      return;
    }
    
    if (isAdmin) {
       if (!confirm('Are you sure, after confirmation the listings/ listed items will remove from this website.')) return;
    } else {
       if (!confirm('Are you sure you want to remove this listing? This action cannot be undone.')) return;
    }
    
    setUpdating(true);
    try {
      await deleteDoc(doc(db, 'listings', listing.id));
      if (onUpdate) onUpdate();
      else window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `listings/${listing.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const markAsCompleted = async () => {
    if (isBlocked && !isAdmin) {
      alert("Your account is restricted. You cannot perform this action.");
      return;
    }
    if (!confirm('Are you sure you want to mark this item as SOLD OUT? It will be moved to the Sold Out category and you will no longer be able to promote or remove it.')) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        status: 'SOLD',
        updatedAt: serverTimestamp()
      });
      if (onUpdate) onUpdate();
      else window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `listings/${listing.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const timeAgo = () => {
    if (!listing.createdAt) return 'Just now';
    const date = listing.createdAt.toDate?.() || new Date(listing.createdAt.seconds * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "group relative flex flex-col h-full rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden transition-all duration-500",
        dark ? "bg-white/5 border border-white/10 hover:bg-white/10" : "bg-white border border-stone-100 shadow-sm hover:shadow-2xl hover:shadow-stone-200/50 hover:-translate-y-1",
        premium && "ring-2 ring-amber-500/20 shadow-xl shadow-amber-500/10"
      )}
    >
      
      {/* Image Container */}
      <div 
        className={cn("relative overflow-hidden cursor-pointer", imageAspect || "aspect-[4/3]")}
        onClick={() => navigate(`/listings/${listing.id}`)}
      >
        {listing.images && listing.images[0] ? (
            <img 
              src={listing.images[0]} 
              alt={listing.title} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center">
            <Zap className="w-8 h-8 text-stone-200" />
          </div>
        )}

        {/* Top Badges Overlay (Left) */}
        <div className="absolute top-0 left-0 flex flex-col gap-1.5 z-10 pointer-events-none">
          {isBoosted && (
             <div className="bg-amber-500 text-stone-900 text-[8px] font-black px-2 py-1 rounded-br-lg flex items-center gap-1 shadow-md shadow-amber-500/20 uppercase tracking-widest">
                <Zap className="w-2.5 h-2.5 fill-stone-900" /> Featured
             </div>
          )}
          {(listing.status === 'SOLD' || listing.quantity <= 0) && (
             <div className="bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-br-lg flex items-center gap-1 shadow-md uppercase tracking-widest">
                <CheckCircle className="w-2.5 h-2.5" /> Sold out
             </div>
          )}
          {listing.status === 'BOOKED' && (
             <div className="bg-amber-100 text-amber-600 text-[8px] font-black px-2 py-1 rounded-br-lg flex items-center gap-1 shadow-md shadow-amber-500/10 uppercase tracking-[0.2em]">
                <Clock className="w-2.5 h-2.5" /> Booked
             </div>
          )}
        </div>

        {/* Top Badges Overlay (Right) */}
        <div className="absolute top-0 right-0 flex z-10 pointer-events-none">
           <div className="bg-white/90 backdrop-blur-md flex items-center gap-1 rounded-bl-lg px-2 py-1 shadow-md">
              <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
              <span className="text-[8px] font-black text-stone-700 uppercase">4.8</span>
           </div>
        </div>

        {/* Footer info overlay */}
        {premium && (
           <div className="absolute bottom-4 right-4 flex items-center pointer-events-none">
               <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-white">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
               </div>
           </div>
        )}
      </div>

      {/* Content */}
      <div 
        className="flex flex-col flex-1 p-2 pb-1 lg:p-3 lg:pb-1 cursor-pointer"
        onClick={() => navigate(`/listings/${listing.id}`)}
      >
        <div className="flex justify-between items-start gap-1 lg:gap-2 mb-0">
           <h3 className={cn(
             "font-black text-[10px] lg:text-xs line-clamp-2 italic uppercase tracking-tighter transition-colors",
             dark ? "text-white" : "text-stone-900 group-hover:text-amber-600"
           )}>
             {listing.title}
           </h3>
        </div>

        <p className="text-[11px] lg:text-[13px] font-black text-amber-500 mb-0 drop-shadow-sm leading-tight">
           {formatPKR(listing.price)}
        </p>

        <div className="mt-0.5">
           <div className="flex items-center justify-between gap-1 lg:gap-2 text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-stone-400">
              <div className="flex items-center gap-1 truncate">
                 <MapPin className="w-2.5 h-2.5 text-stone-400 group-hover:text-amber-500 transition-colors" />
                 <span className="truncate">{listing.city}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                 <Clock className="w-2.5 h-2.5 text-stone-400" />
                 <span>{timeAgo()}</span>
              </div>
           </div>

           {/* Owner / Admin Tools */}
           {(isOwner || isAdmin) && (
              <div className="flex flex-wrap gap-2 pt-2" onClick={e => e.stopPropagation()}>
                 {isOwner && listing.status === 'LIVE' && (
                    <Link 
                      to={`/promotions?listingId=${listing.id}`}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-stone-900 font-black py-2 lg:py-3 rounded-xl text-[9px] lg:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 lg:gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                      <Zap className="w-3 h-3 lg:w-3.5 lg:h-3.5 fill-stone-900" /> Promote
                    </Link>
                 )}
                 {isOwner && listing.status === 'LIVE' && (
                    <button 
                      onClick={markAsCompleted}
                      disabled={updating}
                      className="flex-1 border border-stone-200 text-stone-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 font-black py-2 lg:py-3 rounded-xl text-[9px] lg:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 lg:gap-2 transition-all disabled:opacity-50"
                    >
                       {updating ? '...' : 'Mark Sold'}
                    </button>
                 )}
                 {(isAdmin || (isOwner && listing.status !== 'SOLD')) && (
                   <button 
                     onClick={removeListing}
                     disabled={updating}
                     className={cn(
                       "flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 active:scale-95 translate-y-0.5",
                       (!isOwner && isAdmin) ? "flex-[2] py-2 lg:py-3 gap-1.5 lg:gap-2 text-[9px] lg:text-[10px] uppercase tracking-widest font-black" : "w-10 h-10 lg:w-12 lg:h-12"
                     )}
                     title={(!isOwner && isAdmin) ? "Remove Listing Forever" : "Delete Listing"}
                   >
                      <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                      {(!isOwner && isAdmin) && "Remove Listing"}
                   </button>
                 )}
              </div>
           )}
           
           {/* Public Contact Action (Only if not owner, not sold, and has quantity) */}
        </div>
      </div>
      
      {/* Decorative corner */}
      <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-amber-500/5 rotate-45 pointer-events-none" />
    </motion.div>
  );
}
