import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, updateDoc, increment, deleteDoc, runTransaction } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sendNotification } from '../lib/firebase';
import { trackActivity, ActivityType } from '../lib/activity';
import { Listing, UserProfile, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatPKR, cn } from '../lib/utils';
import { MapPin, Phone, User, MessageCircle, AlertTriangle, ShieldCheck, Share2, Package, Truck, CheckCircle, ShoppingCart, X, Zap, Heart, Clock, ArrowRight, Trash2 } from 'lucide-react';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { CATEGORY_FIELDS } from '../lib/categoryFields';

export function ListingDetails() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [buyerDetails, setBuyerDetails] = useState({
    name: '',
    address: '',
    contact: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const { user, isBlocked, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  useEffect(() => {
    if (user && id) {
      const checkFavorite = async () => {
        try {
          const favRef = doc(db, `users/${user.uid}/favorites`, id);
          const snapshot = await getDoc(favRef);
          if (snapshot.exists()) {
            setIsFavorite(true);
          }
        } catch (e) {
          console.error("Error checking favorite:", e);
        }
      };
      checkFavorite();
    }
  }, [user, id]);

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isBlocked) {
      alert("Your account is restricted. You cannot perform this action.");
      return;
    }
    if (!listing || !id || togglingFavorite || isSold || listing.quantity <= 0) return;

    setTogglingFavorite(true);
    const favRef = doc(db, `users/${user.uid}/favorites`, id);
    const listingRef = doc(db, 'listings', id);
    
    try {
      if (isFavorite) {
        await deleteDoc(favRef);
        setIsFavorite(false);
        // Engagement rule allows +/- 1
        await updateDoc(listingRef, {
          saves: increment(-1),
          updatedAt: serverTimestamp()
        }).catch(e => console.warn("Could not decrement saves:", e));
      } else {
        await setDoc(favRef, {
          listingId: id,
          savedAt: serverTimestamp(),
          title: listing.title,
          price: listing.price,
          image: listing.images?.[0] || null
        });
        setIsFavorite(true);
        // trackActivity handles stats and seller score
        await trackActivity(id, listing.ownerId, ActivityType.SAVE);
      }
    } catch (err) {
      console.error("Favorite toggle failed:", err);
      alert("Failed to update favorite. Please try again.");
    } finally {
      setTogglingFavorite(false);
    }
  };

  useEffect(() => {
    if (user) {
      setBuyerDetails(prev => ({
        ...prev,
        name: user.displayName || '',
        contact: user.phoneNumber || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    async function fetchListing() {
      if (!id) return;
      try {
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          let data = { id: docSnap.id, ...docSnap.data() } as Listing;
          
          // Check for booking/order expiration (24 hours)
          // We only allow the OWNER to perform this cleanup to avoid permission issues and unnecessary reads
          if (user && user.uid === data.ownerId) {
            try {
              const ordersRef = collection(db, 'orders');
              const expiredOrdersQuery = query(
                ordersRef, 
                where('listingId', '==', id),
                where('sellerId', '==', user.uid), // Added sellerId to satisfy rules
                where('status', '==', 'PENDING'),
                where('expiresAt', '<=', new Date())
              );
              
              const expiredOrdersSnap = await getDocs(expiredOrdersQuery);
              
              if (!expiredOrdersSnap.empty) {
                let restoredQty = 0;
                for (const orderDoc of expiredOrdersSnap.docs) {
                  const orderData = orderDoc.data();
                  restoredQty += (orderData.quantity || 1);
                  
                  // Mark order as EXPIRED
                  await updateDoc(doc(db, 'orders', orderDoc.id), {
                    status: 'EXPIRED',
                    updatedAt: serverTimestamp()
                  });
                }

                if (restoredQty > 0) {
                  const listingRef = doc(db, 'listings', id);
                  await updateDoc(listingRef, {
                    status: 'LIVE',
                    quantity: increment(restoredQty),
                    bookedAt: null, 
                    updatedAt: serverTimestamp()
                  });
                  
                  data.status = 'LIVE';
                  data.quantity = (data.quantity || 0) + restoredQty;
                }
              }
            } catch (cleanupErr) {
              console.warn("Background order cleanup failed:", cleanupErr);
              // We don't throw here to avoid crashing the whole page load
            }
          }

          setListing(data);
          
          if (!user || user.uid !== data.ownerId) {
            trackActivity(id, data.ownerId, ActivityType.VIEW);
          }
          
          if (data.ownerId && data.ownerId !== 'guest') {
            const userRef = doc(db, 'users', data.ownerId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const uData = userSnap.data() as UserProfile;
              setSellerProfile(uData);
              
              // Fetch seller listing count
              const q = query(collection(db, 'listings'), where('ownerId', '==', data.ownerId), where('status', '==', 'LIVE'));
              const qSnap = await getDocs(q);
              (uData as any).listingCount = qSnap.size;
              setSellerProfile({ ...uData });
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `listings/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchListing();
  }, [id, user]);

  const updateBookingDetails = (field: string, value: string) => {
    setBuyerDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleBookOrder = async () => {
    if (!user) {
      alert("Please login to book this item.");
      return;
    }
    if (isBlocked) {
      alert("Your account is restricted. You cannot place orders.");
      return;
    }
    if (!listing) return;

    if (!buyerDetails.name || !buyerDetails.address || !buyerDetails.contact) {
      alert("Please fill in all buyer details.");
      return;
    }

    setBooking(true);
    try {
      const listingRef = doc(db, 'listings', id!);
      const orderRef = doc(collection(db, 'orders'));

      await runTransaction(db, async (transaction) => {
        const listingDoc = await transaction.get(listingRef);
        if (!listingDoc.exists()) {
          throw new Error("Listing does not exist!");
        }

        const listingData = listingDoc.data() as Listing;
        const currentQuantity = listingData.quantity || 0;

        if (currentQuantity < quantity) {
          throw new Error(`Only ${currentQuantity} items available. Please reduce your quantity.`);
        }

        const newStock = currentQuantity - quantity;
        const totalPrice = (listingData.price * quantity) + (listingData.shippingCharges || 0);

        const orderData: Order = {
          listingId: id || listingDoc.id || '',
          listingTitle: listingData.title || 'Untitled',
          listingImage: (listingData.images && listingData.images.length > 0) ? listingData.images[0] : '',
          buyerId: user.uid,
          sellerId: listingData.ownerId || '',
          quantity: quantity,
          unitPrice: listingData.price || 0,
          shippingCharges: listingData.shippingCharges || 0,
          totalAmount: totalPrice,
          status: 'PENDING',
          buyerName: buyerDetails.name || '',
          buyerAddress: buyerDetails.address || '',
          buyerContact: buyerDetails.contact || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        // 1. Create Order
        transaction.set(orderRef, orderData);

        // 2. Update Listing
        transaction.update(listingRef, {
          quantity: newStock,
          status: newStock === 0 ? 'BOOKED' : 'LIVE',
          bookedAt: newStock === 0 ? serverTimestamp() : null,
          lastReservedQuantity: newStock === 0 ? quantity : 0,
          updatedAt: serverTimestamp()
        });
      });

      // After transaction success, send notification
      const totalPrice = (listing.price * quantity) + (listing.shippingCharges || 0);
      await sendNotification(
        listing.ownerId,
        "New Order Received! 🛒",
        `You have a new booking request for "${listing.title}" (Qty: ${quantity}). Total Amount: ${formatPKR(totalPrice)}. Check your sales dashboard to ship it!`,
        "NEW_ORDER",
        orderRef.id
      );

      setBookingSuccess(true);
      setShowBookingForm(false);
      setQuantity(1); // Reset local quantity
      
      // Update local listing state since transaction is done
      setListing(prev => prev ? { 
        ...prev, 
        quantity: prev.quantity - quantity,
        status: (prev.quantity - quantity) === 0 ? 'BOOKED' : 'LIVE'
      } : null);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "An error occurred during booking.");
    } finally {
      setBooking(false);
    }
  };

  const handleStartBooking = () => {
    if (!user) {
      alert("Please login to book this item.");
      return;
    }
    if (!listing) return;
    if (listing.ownerId === user.uid) {
      alert("You cannot book your own listing.");
      return;
    }
    if (quantity > listing.quantity) {
      alert("Requested quantity is more than available stock.");
      return;
    }
    setShowBookingForm(true);
  };

  const handleStartChat = async () => {
    if (!user) {
      alert("Please login to chat with seller.");
      return;
    }
    if (isBlocked) {
      alert("Your account is restricted. You cannot start new chats.");
      return;
    }
    if (!listing) return;
    
    try {
      const q = query(
        collection(db, 'chats'),
        where('listingId', '==', listing.id),
        where('buyerId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      
      let chatId: string;
      
      if (snapshot.empty) {
        const chatRef = doc(collection(db, 'chats'));
        chatId = chatRef.id;
        
        const initialText = `Hello, I'm interested in your item: "${listing.title}". Here is the link: ${window.location.origin}/listings/${listing.id}`;
        
        await setDoc(chatRef, {
          listingId: listing.id,
          buyerId: user.uid,
          sellerId: listing.ownerId,
          lastMessage: initialText,
          updatedAt: serverTimestamp(),
          unreadCountSeller: 1,
          unreadCountBuyer: 0,
          isArchivedBuyer: false,
          isArchivedSeller: false,
          isDeletedBuyer: false,
          isDeletedSeller: false,
          isBlocked: false
        });

        // Add the initial message to the subcollection
        const msgRef = doc(collection(db, 'chats', chatId, 'messages'));
        await setDoc(msgRef, {
          senderId: user.uid,
          text: initialText,
          isOffer: false,
          createdAt: serverTimestamp()
        });
      } else {
        chatId = snapshot.docs[0].id;
      }
      
      navigate(`/messages`, { state: { activeChatId: chatId } });
    } catch (e) {
      console.error(e);
      alert("Failed to start chat.");
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    const url = window.location.href;
    const title = listing.title;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
        trackActivity(listing.id, listing.ownerId, ActivityType.SHARE);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          setShowToast(true);
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      setShowToast(true);
      trackActivity(listing.id, listing.ownerId, ActivityType.SHARE);
    }
  };

  const handleReport = () => {
    if (!user) {
      alert("Please login to report this listing.");
      return;
    }
    if (isBlocked) {
      alert("Your account is restricted. You cannot report listings.");
      return;
    }
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!listing || !user || !reportReason.trim()) return;

    setIsSubmittingReport(true);
    try {
      const reportRef = doc(collection(db, 'reports'));
      await setDoc(reportRef, {
        listingId: listing.id,
        listingTitle: listing.title,
        listingImage: listing.images?.[0] || null,
        listingPrice: listing.price,
        ownerId: listing.ownerId,
        reporterId: user.uid,
        reason: reportReason.trim(),
        status: 'OPEN',
        createdAt: serverTimestamp()
      });
      alert('Report submitted successfully. Our team will review it.');
      setShowReportModal(false);
      setReportReason('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'reports');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleMarkAsSold = async () => {
    if (!listing || !id) return;
    const confirmSold = window.confirm("Are you sure you want to mark this item as SOLD? This action cannot be undone.");
    if (!confirmSold) return;

    try {
      const listingRef = doc(db, 'listings', id);
      await updateDoc(listingRef, {
        status: 'SOLD',
        updatedAt: serverTimestamp()
      });
      setListing(prev => prev ? { ...prev, status: 'SOLD' } : null);
      alert("Item successfully marked as SOLD.");
    } catch (err) {
      console.error(err);
      alert("Failed to mark item as sold.");
    }
  };

  const openLightbox = (index: number) => {
    setPhotoIndex(index);
    setLightboxOpen(true);
  };

  if (loading) return <div className="py-20 text-center text-stone-500">Loading...</div>;
  if (!listing) return <div className="py-20 text-center text-stone-500">Listing not found</div>;

  const slides = listing.images ? listing.images.map(url => ({ src: url })) : [];
  
  const displaySellerName = sellerProfile?.name || listing.sellerName;
  const displayCity = sellerProfile?.city || listing.city;
  const totalPrice = (listing.price * quantity) + (listing.shippingCharges || 0);

  const isSold = listing.status === 'SOLD';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="text-amber-600 hover:text-amber-700 mb-6 flex items-center gap-2 font-medium w-fit">
        &larr; Back to listings
      </Link>
      
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-[55%] p-4 sm:p-6 bg-stone-50 border-r border-stone-100 flex flex-col">
            {listing.images && listing.images.length > 0 ? (
              <div 
                className="w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer shadow-sm border border-stone-200 bg-black flex group items-center justify-center relative"
                onClick={() => openLightbox(0)}
              >
                <img 
                   src={listing.images[0]} 
                   alt={listing.title} 
                   referrerPolicy="no-referrer"
                   className="w-full h-full object-contain bg-black/5 group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                   <div className="bg-white/90 text-stone-800 px-4 py-2 rounded-full font-medium text-sm shadow-lg flex items-center gap-2">
                     Click to enlarge
                   </div>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-stone-100 flex items-center justify-center text-stone-400 rounded-xl border border-stone-200 shadow-sm">No Image Available</div>
            )}
            
            {listing.images && listing.images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-thin">
                 {listing.images.map((img, idx) => (
                    <img 
                       key={idx} 
                       src={img} 
                       referrerPolicy="no-referrer"
                       onClick={() => openLightbox(idx)}
                       className={`w-24 h-24 object-cover rounded-lg shadow-sm border-2 cursor-pointer transition-all hover:opacity-100 ${idx === photoIndex ? 'border-amber-500 opacity-100' : 'border-transparent opacity-70 hover:border-amber-300'}`} 
                       alt={`Thumbnail ${idx + 1}`} 
                    />
                 ))}
              </div>
            )}
          </div>
          
          <div className="w-full lg:w-[45%] p-6 sm:p-8 flex flex-col">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-extrabold text-stone-900 mb-2 leading-tight flex items-center gap-3">
                  {listing.title}
                  {isSold && (
                    <span className="bg-red-500 text-white text-[10px] px-3 py-1 rounded-full uppercase italic tracking-widest animate-pulse">SOLD OUT</span>
                  )}
                  {listing.status === 'BOOKED' && (
                    <span className="bg-amber-500 text-stone-900 text-[10px] px-3 py-1 rounded-full uppercase italic tracking-widest animate-pulse">BOOKED</span>
                  )}
                </h1>
                <div className="text-4xl font-black text-amber-600 drop-shadow-sm">{formatPKR(listing.price)}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-8 text-sm">
              <div className="flex items-center gap-2 bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full border border-stone-200 shadow-sm">
                <Package className="w-4 h-4 text-amber-600" />
                <span className="font-black text-xs uppercase tracking-wider">{listing.quantity} Units Available</span>
              </div>
              <div className="flex items-center gap-2 bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full border border-stone-200 shadow-sm">
                <Truck className="w-4 h-4 text-amber-600" />
                <span className="font-black text-xs uppercase tracking-wider">{listing.shippingCharges ? `Shipping: ${formatPKR(listing.shippingCharges)}` : 'Free Delivery'}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-8 text-xs font-bold uppercase tracking-wider">
                <span className="bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1 rounded">{listing.category}</span>
                {listing.subcategory && <span className="bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1 rounded">{listing.subcategory}</span>}
                {listing.condition && <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-1 rounded">{listing.condition}</span>}
            </div>
            
            {listing.customFields && Object.keys(listing.customFields).length > 0 && CATEGORY_FIELDS[listing.category] && (
               <div className="mb-8 grid grid-cols-2 gap-y-4 gap-x-6 bg-stone-50 p-5 rounded-xl border border-stone-100">
                 {CATEGORY_FIELDS[listing.category]
                   .filter(field => listing.customFields![field.name])
                   .map(field => (
                   <div key={field.name} className="flex flex-col">
                     <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{field.label}</span>
                     <span className="text-base font-semibold text-stone-900">{listing.customFields![field.name]}</span>
                   </div>
                 ))}
               </div>
            )}
            
            <div className="prose prose-stone max-w-none mb-4">
                <h3 className="text-lg font-bold text-stone-900 border-b pb-2 mb-3">Item Description</h3>
                <p className="whitespace-pre-wrap text-stone-700 leading-relaxed text-sm">{listing.description}</p>
            </div>

            {user?.uid !== listing.ownerId && (
              <div className="flex justify-end mb-6">
                <button 
                  onClick={handleReport}
                  className="text-[11px] text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1.5 font-medium"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Report Listing
                </button>
              </div>
            )}

            {/* Favorite and Share Buttons - Available if not sold and has quantity */}
            <div className="flex items-center gap-4 mb-8">
                {(!isSold && listing.quantity > 0) && (
                  <button 
                    onClick={toggleFavorite}
                    disabled={togglingFavorite}
                    id="favorite-button"
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm border active:scale-95 disabled:opacity-50",
                      isFavorite 
                        ? "bg-red-500 border-red-500 text-white" 
                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", (isFavorite || togglingFavorite) && "fill-white")} />
                    {togglingFavorite ? 'Processing...' : (isFavorite ? 'In Favorites' : 'Add to Favorite')}
                  </button>
                )}
                <button 
                  onClick={handleShare}
                  id="share-button"
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 px-6 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95",
                    (isSold || listing.quantity <= 0) ? "w-full" : "flex-1"
                  )}
                >
                  <Share2 className="w-4 h-4" />
                  Share Ad
                </button>
            </div>

            <div className="mt-auto space-y-6 pt-6 border-t border-stone-200">
               {/* Order Section */}
               {user?.uid !== listing.ownerId && (
                 <div className="space-y-4">
                   {listing.status === 'BOOKED' ? (
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 border-dashed text-center">
                         <Clock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                         <h3 className="font-black text-stone-900 uppercase tracking-tighter italic text-xl mb-1">Item Reserved</h3>
                         <p className="text-sm text-stone-600 font-medium">This item is currently booked by another buyer. If it's not shipped within 24 hours, it will become available again.</p>
                      </div>
                   ) : (isSold || listing.quantity <= 0) ? (
                      <div className="bg-red-50 p-6 rounded-2xl border border-red-200 border-dashed text-center">
                         <X className="w-8 h-8 text-red-500 mx-auto mb-3" />
                         <h3 className="font-black text-stone-900 uppercase tracking-tighter italic text-xl mb-1 text-red-600">Out of Stock</h3>
                         <p className="text-sm text-stone-600 font-medium">This item is currently sold out or no longer available for booking.</p>
                      </div>
                   ) : (
                     <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-4">
                        <div className="flex justify-between items-center mb-1">
                           <h3 className="font-bold text-stone-900 flex items-center gap-2">
                              <ShoppingCart className="w-5 h-5" /> Book Your Order
                           </h3>
                           <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                             {listing.quantity} Left
                           </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3 border bg-white rounded-lg p-1">
                              <button 
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                className="w-8 h-8 flex items-center justify-center font-bold hover:bg-stone-100 rounded"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-stone-800">{quantity}</span>
                              <button 
                                onClick={() => setQuantity(q => Math.min(listing.quantity, q + 1))}
                                className="w-8 h-8 flex items-center justify-center font-bold hover:bg-stone-100 rounded"
                              >
                                +
                              </button>
                           </div>
                           <div className="text-right">
                              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Total Amount</p>
                              <p className="text-xl font-black text-amber-600">{formatPKR(totalPrice)}</p>
                           </div>
                        </div>

                        <div className="text-[10px] text-stone-500 italic">
                           * Includes {formatPKR(listing.shippingCharges || 0)} shipping charges. Payment via Cash on Delivery.
                        </div>

                        {bookingSuccess ? (
                          <div className="space-y-4 animate-in zoom-in-95">
                            <div className="bg-emerald-500 text-white p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg">
                              <CheckCircle className="w-6 h-6" /> You have booked your order
                            </div>
                            {listing && listing.quantity > 0 && listing.status !== 'BOOKED' && !isSold && (
                              <button 
                                onClick={() => {
                                  setBookingSuccess(false);
                                  setShowBookingForm(true);
                                }}
                                className="w-full bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 py-3 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest active:scale-95"
                              >
                                <ShoppingCart className="w-4 h-4" /> Book More Orders
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <button 
                              disabled={booking || listing.quantity <= 0}
                              onClick={handleStartBooking}
                              className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white py-4 rounded-xl font-black transition-all shadow-lg flex items-center justify-center gap-2 text-lg active:scale-95"
                            >
                              Book Your Order (COD)
                            </button>

                            {showBookingForm && (
                              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                                   <div className="flex justify-between items-center mb-6">
                                      <h2 className="text-xl font-bold text-stone-900">Delivery Details</h2>
                                      <button onClick={() => setShowBookingForm(false)} className="text-stone-400 hover:text-stone-600">
                                         <X className="w-6 h-6" />
                                      </button>
                                   </div>
                                   <p className="text-sm text-stone-500 mb-6">Please provide your details for Cash on Delivery (COD).</p>
                                   
                                   <div className="space-y-4">
                                      <div>
                                         <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Name</label>
                                         <input 
                                           type="text" 
                                           value={buyerDetails.name}
                                           onChange={(e) => setBuyerDetails({...buyerDetails, name: e.target.value})}
                                           className="w-full border-stone-200 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                                           placeholder="Your name"
                                         />
                                      </div>
                                      <div>
                                         <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Delivery Address</label>
                                         <textarea 
                                           value={buyerDetails.address}
                                           onChange={(e) => setBuyerDetails({...buyerDetails, address: e.target.value})}
                                           className="w-full border-stone-200 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                                           rows={3}
                                           placeholder="House #, Street, Area, City"
                                         />
                                      </div>
                                      <div>
                                         <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Contact Number</label>
                                         <input 
                                           type="tel" 
                                           value={buyerDetails.contact}
                                           onChange={(e) => setBuyerDetails({...buyerDetails, contact: e.target.value})}
                                           className="w-full border-stone-200 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                                           placeholder="03xx xxxxxxx"
                                         />
                                      </div>

                                      <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 grid grid-cols-2 gap-4 mt-6">
                                         <div>
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Unit Price</p>
                                            <p className="font-bold text-stone-800">{formatPKR(listing.price)}</p>
                                         </div>
                                         <div className="text-right">
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Quantity</p>
                                            <p className="font-bold text-stone-800">{quantity} Units</p>
                                         </div>
                                         <div>
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Shipping</p>
                                            <p className="font-bold text-stone-800">{formatPKR(listing.shippingCharges || 0)}</p>
                                         </div>
                                         <div className="text-right">
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Amount</p>
                                            <p className="text-xl font-black text-amber-600">{formatPKR(totalPrice)}</p>
                                         </div>
                                      </div>

                                      <button 
                                        onClick={handleBookOrder}
                                        disabled={booking}
                                        className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white py-4 rounded-xl font-black transition-all shadow-lg flex items-center justify-center gap-2 text-lg mt-6"
                                      >
                                        {booking ? 'Processing...' : 'Confirm Order'}
                                      </button>
                                      <button onClick={() => setShowBookingForm(false)} className="w-full text-stone-500 font-bold text-sm py-2">
                                         Cancel
                                      </button>
                                   </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                     </div>
                   )}
                 </div>
               )}

               <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                   <div className="p-6">
                      <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Seller Information</h3>
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-16 h-16 bg-white border-2 border-stone-100 rounded-2xl flex items-center justify-center text-stone-300 shadow-sm overflow-hidden shrink-0">
                           {sellerProfile?.photoURL ? (
                             <img src={sellerProfile.photoURL} alt={displaySellerName} className="w-full h-full object-cover" />
                           ) : (
                             <User className="w-8 h-8" />
                           )}
                         </div>
                         <div className="flex-grow">
                            <div className="font-black text-xl text-stone-900 flex items-center gap-2 leading-none mb-1">
                              {displaySellerName}
                              {sellerProfile?.isVerified && (
                                 <ShieldCheck 
                                   className={`w-5 h-5 ${sellerProfile.verifiedBadgeType === 'GOLDEN' ? 'text-amber-500' : sellerProfile.verifiedBadgeType === 'PREMIUM' ? 'text-amber-600' : 'text-blue-500'}`} 
                                   title={`${sellerProfile.verifiedBadgeType || 'BASIC'} Verified Seller`} 
                                 />
                              )}
                            </div>
                            <div className="text-xs font-bold text-stone-500 flex flex-col gap-1.5">
                               <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5" /> {listing.locationArea ? `${listing.locationArea}, ` : ''}{displayCity}
                               </div>
                               <div className="flex items-center gap-2">
                                  <Phone className="w-3.5 h-3.5" /> {listing.phoneNumber}
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="bg-white p-3 rounded-xl border border-stone-100 text-center">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total Listings</p>
                            <p className="font-black text-stone-900">{(sellerProfile as any)?.listingCount || 0}</p>
                         </div>
                         <div className="bg-white p-3 rounded-xl border border-stone-100 text-center">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Seller Status</p>
                            <p className="font-black text-emerald-600 text-xs uppercase tracking-tighter">Active Now</p>
                         </div>
                      </div>

                      <Link 
                        to={`/user/${listing.ownerId}`}
                        className="block w-full text-center py-3 border-2 border-stone-900 text-stone-900 rounded-xl font-black text-sm hover:bg-stone-900 hover:text-white transition-all active:scale-95"
                      >
                         View Full Profile
                      </Link>
                   </div>
                </div>
                               {/* Communication and Seller Actions */}
                <div className="space-y-4">
                  {user?.uid !== listing.ownerId && !isSold && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button 
                        onClick={handleStartChat}
                        className="col-span-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-stone-900 py-4 rounded-xl font-black transition-all shadow-md active:scale-[0.98]"
                      >
                        <MessageCircle className="w-6 h-6" /> Chat in App
                      </button>
                      
                      <a 
                        href={`tel:${listing.phoneNumber.replace(/[^0-9]/g, '')}`}
                        className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 py-4 rounded-xl font-black transition-all border border-stone-200 shadow-sm"
                      >
                        <Phone className="w-5 h-5" /> Call Seller
                      </a>
                      
                      <a 
                        href={`https://wa.me/${listing.phoneNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-xl font-black transition-all shadow-sm"
                      >
                        <MessageCircle className="w-5 h-5" /> WhatsApp
                      </a>
                    </div>
                  )}

                  {user?.uid === listing.ownerId && !isSold && (
                    <div className="space-y-3">
                       <button 
                         onClick={handleMarkAsSold}
                         className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black transition-all shadow-md w-full uppercase tracking-widest text-xs active:scale-[0.98]"
                       >
                         <CheckCircle className="w-5 h-5" /> Mark As Sold Out
                       </button>

                       <Link 
                         to={`/promotions?listingId=${listing.id}&type=FEATURED`}
                         className="flex items-center justify-center gap-2 bg-stone-900 hover:bg-amber-500 hover:text-stone-900 text-white py-4 rounded-xl font-black transition-all shadow-md w-full uppercase italic tracking-tighter active:scale-[0.98]"
                       >
                         <Zap className="w-6 h-6" /> Promote This Ad
                       </Link>
                       <div className="text-center">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${listing.promotionStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : listing.promotionStatus === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-stone-50 text-stone-400 border-stone-100'}`}>
                             Promotion Status: {listing.promotionStatus || 'Not Promoted'}
                          </span>
                       </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="space-y-3 pt-4 border-t border-stone-200">
                      <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center">Admin Controls</h4>
                      <button 
                        onClick={async () => {
                          if (window.confirm("Are you sure, after confirmation the listings/ listed items will remove from this website.")) {
                            try {
                              await deleteDoc(doc(db, 'listings', listing.id));
                              alert("✅ Listing removed forever from this website.");
                              navigate('/admin');
                            } catch (error) {
                              handleFirestoreError(error, OperationType.DELETE, `listings/${listing.id}`);
                            }
                          }
                        }}
                        className="flex items-center justify-center gap-2 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white py-4 rounded-xl font-black transition-all shadow-md w-full uppercase tracking-widest text-xs active:scale-[0.98]"
                      >
                        <Trash2 className="w-5 h-5" /> Remove Listing
                      </button>
                    </div>
                  )}
                </div>
               
               {user?.uid !== listing.ownerId && (
                 <div className="pt-8 border-t border-stone-100 flex justify-center">
                    <button 
                      onClick={handleReport} 
                      className="group flex items-center gap-3 px-8 py-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-100 hover:border-red-600 rounded-2xl transition-all duration-300 font-black text-xs uppercase tracking-[0.2em] shadow-sm active:scale-95"
                    >
                       <AlertTriangle className="w-4 h-4 group-hover:animate-bounce" /> Report This Advertisement
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      
      {slides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={photoIndex}
          slides={slides}
          plugins={[Zoom]}
          carousel={{ padding: 0 }}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="bg-red-600 p-8 text-white relative">
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                >
                   <X className="w-6 h-6" />
                </button>
                <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Report Advertisement</h2>
                <p className="text-red-100/80 text-sm font-bold uppercase tracking-widest mt-1">Professional Violation Check</p>
             </div>
             
             <div className="p-8 space-y-6">
                <div>
                   <p className="text-stone-500 font-medium text-sm leading-relaxed mb-6">
                      Are you sure you want to report <span className="font-black text-stone-900 italic">"{listing.title}"</span>? 
                      Please provide a detailed reason for this report. False reporting may lead to account suspension.
                   </p>
                   
                   <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-4">Violation Details</label>
                   <textarea 
                     className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 font-medium text-stone-900 focus:ring-2 focus:ring-red-500 transition-all"
                     rows={5}
                     placeholder="Explain why this listing is being reported (e.g., fraudulent item, illegal goods, duplicate ad, etc.)"
                     value={reportReason}
                     onChange={(e) => setReportReason(e.target.value)}
                   />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                   <button 
                     onClick={() => setShowReportModal(false)}
                     className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                   >
                      Cancel Action
                   </button>
                   <button 
                     onClick={submitReport}
                     disabled={isSubmittingReport || !reportReason.trim()}
                     className="flex-[1.5] bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-red-200 flex items-center justify-center gap-2"
                   >
                      {isSubmittingReport ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : 'Confirm & Submit Report'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

       {/* Related Listings Section */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-stone-100">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
             <div>
                <h2 className="text-4xl font-black text-stone-900 uppercase italic tracking-tighter leading-none mb-3">Similar <span className="text-amber-500">Market</span> Picks</h2>
                <p className="text-stone-500 font-medium uppercase tracking-[0.2em] text-[10px]">Hand-picked quality from our verified farmers</p>
             </div>
             <Link to="/listings" className="group flex items-center gap-3 bg-stone-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-xl shadow-stone-900/10 active:scale-95">
                Explore All Listings <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
             </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             {/* We would fetch similar items here, for now using a placeholder layout */}
             <div className="col-span-full py-20 text-center bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200">
                <div className="relative inline-block mb-6">
                   <div className="absolute -inset-4 bg-amber-500/10 blur-2xl rounded-full" />
                   <Package className="w-16 h-16 text-stone-300 relative z-10" />
                </div>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Discovering related items in your area...</p>
             </div>
          </div>
       </div>

      {/* Copy Toast */}
      {showToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-stone-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-widest text-white">Link Copied to Clipboard</span>
          </div>
        </div>
      )}
    </div>
  );
}
