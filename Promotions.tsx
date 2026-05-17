import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PROMOTION_PACKAGES, PAYMENT_DETAILS } from '../lib/promotionPackages';
import { formatPKR } from '../lib/utils';
import { ShieldCheck, Rocket, Zap, Upload, CheckCircle, Info, ArrowLeft, Loader2, CreditCard } from 'lucide-react';
import { Listing } from '../types';

export function Promotions() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialListingId = searchParams.get('listingId');

  const [activeTab, setActiveTab] = useState<'FEATURED' | 'BOOST' | 'VERIFIED'>(
    (searchParams.get('type') as any) || 'FEATURED'
  );
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState(initialListingId || '');
  const [proofImage, setProofImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/profile');
      return;
    }
    fetchUserListings();
  }, [user]);

  const fetchUserListings = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'listings'), where('ownerId', '==', user.uid), where('status', '==', 'LIVE'));
      const snapshot = await getDocs(q);
      setUserListings(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Listing)));
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPlan) return;
    if (activeTab !== 'VERIFIED' && !selectedListingId) {
      alert('Please select a listing to promote');
      return;
    }
    if (!proofImage) {
      alert('Please upload payment proof');
      return;
    }

    setSubmitting(true);
    try {
      const requestData = {
        userId: user.uid,
        targetId: activeTab === 'VERIFIED' ? user.uid : selectedListingId,
        type: activeTab,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        durationDays: selectedPlan.days,
        paymentProofImage: proofImage,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'promotionRequests'), requestData);
      
      // Also update the listing/profile with a pending flag
      if (activeTab !== 'VERIFIED') {
        await updateDoc(doc(db, 'listings', selectedListingId), {
           promotionStatus: 'PENDING',
           promotionType: activeTab
        });
      } else {
        await updateDoc(doc(db, 'users', user.uid), {
           verificationStatus: 'PENDING'
        });
      }

      setSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'promotionRequests');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
           <CheckCircle className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black text-stone-900 mb-4 italic uppercase">Request Submitted!</h1>
        <p className="text-lg text-stone-600 mb-8 font-medium">Your request has been sent for review. Our team will verify your payment and activate your item/badge within 24 hours.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-stone-900 text-white px-10 py-4 rounded-2xl font-black text-lg hover:bg-stone-800 transition-all shadow-xl active:scale-95"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-stone-900 italic uppercase leading-none tracking-tighter mb-4">
          Upgrade Your <span className="text-amber-500 underline decoration-stone-900">Visibility</span>
        </h1>
        <p className="text-stone-500 text-lg font-medium max-w-2xl mx-auto">Get more clicks, more trust, and more sales with our premium featured and boosting options.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <button 
          onClick={() => { setActiveTab('FEATURED'); setSelectedPlan(null); }}
          className={`flex-1 min-w-[200px] p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-3 ${activeTab === 'FEATURED' ? 'border-amber-500 bg-amber-50 shadow-xl shadow-amber-200/50 scale-105' : 'border-stone-200 bg-white hover:border-stone-300'}`}
        >
          <div className={`p-3 rounded-2xl ${activeTab === 'FEATURED' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
            <Zap className="w-8 h-8" />
          </div>
          <span className="font-black text-lg uppercase tracking-tighter italic">Featured Listings</span>
        </button>

        <button 
          onClick={() => { setActiveTab('BOOST'); setSelectedPlan(null); }}
          className={`flex-1 min-w-[200px] p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-3 ${activeTab === 'BOOST' ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-200/50 scale-105' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
          <div className={`p-3 rounded-2xl ${activeTab === 'BOOST' ? 'bg-blue-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
            <Rocket className="w-8 h-8" />
          </div>
          <span className="font-black text-lg uppercase tracking-tighter italic">Boosted Ads</span>
        </button>

        <button 
          onClick={() => { setActiveTab('VERIFIED'); setSelectedPlan(null); }}
          className={`flex-1 min-w-[200px] p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-3 ${activeTab === 'VERIFIED' ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-200/50 scale-105' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
          <div className={`p-3 rounded-2xl ${activeTab === 'VERIFIED' ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
            <ShieldCheck className="w-8 h-8" />
          </div>
          <span className="font-black text-lg uppercase tracking-tighter italic">Premium & Verified Seller</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: Select Plan */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm">
            <h2 className="text-2xl font-black text-stone-900 uppercase italic mb-6">1. Choose your Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PROMOTION_PACKAGES[activeTab].map((plan: any) => (
                <button 
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${selectedPlan?.id === plan.id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-100 bg-stone-50 hover:border-stone-300'}`}
                >
                   {selectedPlan?.id === plan.id && <div className="absolute top-0 right-0 p-2"><CheckCircle className="w-5 h-5 text-amber-500" /></div>}
                   <div className={`text-sm font-black uppercase tracking-widest mb-1 ${selectedPlan?.id === plan.id ? 'text-stone-400' : 'text-stone-500'}`}>{plan.name}</div>
                   <div className="text-3xl font-black mb-2">{formatPKR(plan.price)}</div>
                   <p className={`text-xs font-medium leading-relaxed ${selectedPlan?.id === plan.id ? 'text-stone-300' : 'text-stone-500'}`}>{plan.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-sm">
            <h2 className="text-2xl font-black text-stone-900 uppercase italic mb-6">2. Payment Method</h2>
            <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-3xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><CreditCard className="w-32 h-32" rotate={12}/></div>
               <div className="flex items-center gap-4 mb-6">
                  <div className="bg-amber-500 text-white p-3 rounded-2xl font-black text-xl italic uppercase">Easypaisa</div>
                  <div className="h-px bg-amber-200 flex-grow" />
               </div>
               
               <div className="space-y-4 relative z-10">
                  <div>
                    <span className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-0.5">Account Number</span>
                    <span className="text-3xl font-black text-stone-900 tracking-tighter">{PAYMENT_DETAILS.accountNumber}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-0.5">Account Name</span>
                    <span className="text-xl font-bold text-stone-800">{PAYMENT_DETAILS.accountName}</span>
                  </div>
               </div>
               
               <div className="mt-8 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex gap-3 text-sm text-amber-800 font-medium">
                  <Info className="w-5 h-5 shrink-0" />
                  <p>Send the exact amount for your chosen plan and take a screenshot of the confirmation page.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Step 3: Checkout Sidebar */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[32px] border border-stone-200 shadow-xl sticky top-24">
            <h2 className="text-2xl font-black text-stone-900 uppercase italic mb-6">3. Confirmation</h2>
            
            <div className="space-y-6">
              {activeTab !== 'VERIFIED' && (
                <div>
                  <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-3 italic">Promote Item</label>
                  {fetching ? (
                    <div className="animate-pulse h-12 bg-stone-100 rounded-xl" />
                  ) : userListings.length === 0 ? (
                    <div className="text-sm text-red-500 font-bold bg-red-50 p-4 rounded-xl border border-red-100">You have no active listings to promote.</div>
                  ) : (
                    <select 
                      value={selectedListingId}
                      onChange={(e) => setSelectedListingId(e.target.value)}
                      className="w-full bg-stone-50 border-stone-200 rounded-xl focus:ring-amber-500 focus:border-amber-500 p-4 text-stone-900 font-bold text-sm"
                      required
                    >
                      <option value="">Select a listing</option>
                      {userListings.map(listing => (
                        <option key={listing.id} value={listing.id}>{listing.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {activeTab === 'VERIFIED' && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                   <div className="bg-emerald-500 text-white p-2 rounded-lg"><ShieldCheck className="w-5 h-5" /></div>
                   <div className="text-xs font-bold text-emerald-800 uppercase leading-snug">Verification for: <br/> <span className="text-stone-900">{userProfile?.name || user?.email}</span></div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-3 italic">Upload Receipt</label>
                {!proofImage ? (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-stone-200 bg-stone-50 rounded-2xl cursor-pointer hover:bg-stone-100 transition-colors group">
                    <Upload className="w-8 h-8 text-stone-300 group-hover:text-amber-500 transition-colors mb-2" />
                    <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Select Photo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="relative group rounded-2xl overflow-hidden border-2 border-stone-100">
                    <img src={proofImage} alt="Receipt" className="w-full aspect-[4/3] object-cover" />
                    <button 
                      type="button"
                      onClick={() => setProofImage('')}
                      className="absolute top-2 right-2 bg-stone-900/80 text-white p-2 rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Change Photo
                    </button>
                    <div className="absolute inset-0 ring-4 ring-amber-500/20 pointer-events-none" />
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-stone-100">
                <div className="flex justify-between items-center mb-4">
                   <span className="text-stone-400 font-bold uppercase text-xs tracking-widest">Total to Pay</span>
                   <span className="text-2xl font-black text-stone-900">{selectedPlan ? formatPKR(selectedPlan.price) : 'PKR 0'}</span>
                </div>
                
                <button 
                  type="submit"
                  disabled={submitting || !selectedPlan || (!selectedListingId && activeTab !== 'VERIFIED')}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:grayscale text-stone-900 font-black py-5 rounded-2xl text-xl italic uppercase tracking-tighter transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
                <p className="text-[10px] text-stone-400 text-center mt-4 font-medium italic">By clicking submit, I confirm that I have made the payment via Easypaisa and provided the authentic proof.</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
