import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import { UserProfile, Listing } from "../types";
import {
  Camera,
  CheckCircle,
  Upload,
  LayoutDashboard,
  ShieldCheck,
  User as UserIcon,
  Share2,
  Users,
  Gift,
  Copy,
  Globe,
  Shield,
  Crown,
  Clock,
  Zap,
  Package,
} from "lucide-react";
import { Link } from "react-router-dom";

type ProfileTab = "profile" | "settings" | "badges" | "referrals";

export function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    city: "",
    address: "",
    photoURL: "",
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          setFormData({
            name: data.name || user.displayName || "",
            phoneNumber: data.phoneNumber || "",
            city: data.city || "",
            address: data.address || "",
            photoURL: data.photoURL || user.photoURL || "",
          });
        }

        const listingsQuery = query(
          collection(db, "listings"),
          where("ownerId", "==", user.uid),
          orderBy("createdAt", "desc"),
        );
        const listingsSnap = await getDocs(listingsQuery);
        setMyListings(
          listingsSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as Listing),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        alert("File size too large. Please select an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check for badge restriction
    const isBadgeActive =
      profile?.isVerified &&
      (!profile.verifiedUntil || profile.verifiedUntil.toDate() > new Date());

    if (isBadgeActive) {
      alert(
        "Profile information cannot be changed while your premium & verified seller badge is active. Please wait until it expires to modify your details.",
      );
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, "users", user.uid);
      const updateData: Partial<UserProfile> = {
        ...formData,
        email: user.email || "",
        updatedAt: serverTimestamp(),
      };

      if (!profile) {
        await setDoc(docRef, {
          ...updateData,
          id: user.uid,
          isVerified: false,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(docRef, updateData);
      }
      setProfile((prev) =>
        prev ? { ...prev, ...updateData } : ({ ...updateData } as UserProfile),
      );
      alert("Profile updated successfully!");
      setActiveTab("profile");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "users");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-black text-stone-900 mb-4 tracking-tighter uppercase italic">
          Mandi Identity Needed
        </h1>
        <p className="text-stone-600 mb-8 font-medium">
          Please sign in to access your professional profile and settings.
        </p>
        <Link
          to="/"
          className="inline-block bg-amber-500 text-stone-900 font-black px-8 py-3 rounded-xl shadow-lg active:scale-95"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (loading)
    return (
      <div className="py-20 text-center flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-stone-400 font-black text-[10px] uppercase tracking-[0.3em]">
          Loading Profile...
        </p>
      </div>
    );

  const TabButton = ({
    id,
    icon: Icon,
    label,
  }: {
    id: ProfileTab;
    icon: any;
    label: string;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black transition-all whitespace-nowrap shrink-0 border-2 active:scale-95 uppercase tracking-widest text-[10px] ${
        activeTab === id
          ? "bg-stone-900 text-white border-stone-900 shadow-xl"
          : "text-stone-500 bg-white border-stone-100 hover:border-amber-300"
      }`}
    >
      <Icon
        className={`w-4 h-4 ${activeTab === id ? "text-amber-500" : "text-stone-400"}`}
      />
      {label}
    </button>
  );

  const isBadgeActive =
    profile?.isVerified &&
    (!profile.verifiedUntil || profile.verifiedUntil.toDate() > new Date());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500 pb-24">
      {/* Profile Header */}
      <div className="flex flex-col mb-10 gap-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />

          <div className="w-24 h-24 rounded-3xl bg-stone-50 border-4 border-white shadow-xl overflow-hidden shrink-0 relative z-10">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-200">
                <UserIcon className="w-10 h-10" />
              </div>
            )}
          </div>

          <div className="flex-grow text-center sm:text-left relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-2 mb-1">
              <h1 className="text-3xl font-black text-stone-900 tracking-tighter uppercase italic leading-none">
                {profile?.name || "Anonymous User"}
              </h1>
              {profile?.isVerified && (
                <ShieldCheck
                  className={`w-6 h-6 ${profile.verifiedBadgeType === "PREMIUM" ? "text-amber-500" : "text-blue-500"}`}
                />
              )}
            </div>
            <p className="text-stone-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center sm:justify-start gap-2">
              <Globe className="w-3 h-3" /> Mandi.pk Merchant Since{" "}
              {profile?.createdAt?.toDate?.()?.getFullYear() || 2025}
            </p>
          </div>

          <div className="flex gap-2 relative z-10">
            <Link
              to="/dashboard"
              className="bg-stone-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-500" /> Seller Hub
            </Link>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <TabButton id="profile" icon={UserIcon} label="My Profile" />
          <TabButton id="settings" icon={Camera} label="Settings" />
          <TabButton id="badges" icon={ShieldCheck} label="My Badges" />
          <TabButton id="referrals" icon={Users} label="Referrals" />
        </div>
      </div>

      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <UserIcon className="w-32 h-32" />
              </div>
              <h2 className="text-2xl font-black text-stone-900 uppercase italic tracking-tighter mb-8 border-b border-stone-50 pb-4 flex justify-between items-center">
                Merchant Identity
                <Link
                  to="/submit"
                  className="bg-amber-500 hover:bg-amber-600 text-stone-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
                >
                  Post your ad
                </Link>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                <div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">
                    Full Legal Name
                  </span>
                  <p className="text-lg font-black text-stone-800 italic">
                    {profile?.name || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">
                    Registered Phone
                  </span>
                  <p className="text-lg font-black text-stone-800 italic">
                    {profile?.phoneNumber || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">
                    Operating City
                  </span>
                  <p className="text-lg font-black text-stone-800 italic">
                    {profile?.city || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">
                    Verified Address
                  </span>
                  <p className="text-lg font-black text-stone-800 italic">
                    {profile?.address || "-"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("settings")}
                className="mt-10 px-8 py-3 bg-stone-100 hover:bg-amber-500 hover:text-stone-900 text-stone-600 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95"
              >
                Update Identity Details
              </button>
            </div>

            {/* Local Listing Snapshot */}
            <div className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-stone-900 uppercase italic tracking-tighter">
                  Your Active Stock
                </h2>
                <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                  {myListings.length} Live Items
                </span>
              </div>

              {myListings.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                  <Package className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                  <p className="text-stone-400 font-bold text-xs uppercase tracking-widest">
                    No active stock in Mandi
                  </p>
                </div>
              ) : (
                <div className="relative group/scroll">
                   <motion.div 
                     className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory hide-scrollbar cursor-grab active:cursor-grabbing px-2"
                   >
                     <AnimatePresence mode='popLayout'>
                        {myListings.map((listing, idx) => (
                          <motion.div 
                            key={listing.id}
                            layout
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            transition={{ 
                               delay: idx * 0.05,
                               type: "spring",
                               stiffness: 300,
                               damping: 25
                            }}
                            className="snap-start shrink-0 w-[280px] flex gap-4 p-4 bg-white border border-stone-100 rounded-2xl hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5 transition-all group"
                          >
                            <div className="w-20 h-20 rounded-xl overflow-hidden border border-stone-100 shrink-0">
                               <img 
                                 src={listing.images?.[0]} 
                                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                               />
                            </div>
                            <div className="flex-grow flex flex-col justify-center overflow-hidden">
                               <h3 className="font-bold text-stone-900 text-sm mb-1 truncate">{listing.title}</h3>
                               <p className="text-amber-600 font-black text-md">Rs {listing.price.toLocaleString()}</p>
                               <Link to={`/promotions?listingId=${listing.id}&type=FEATURED`} className="text-[9px] font-black uppercase text-stone-400 hover:text-amber-500 transition-colors mt-2 flex items-center gap-1 group/btn">
                                  <Zap className="w-3 h-3 group-hover/btn:fill-amber-500" /> Promote Ad
                               </Link>
                            </div>
                          </motion.div>
                        ))}
                     </AnimatePresence>
                   </motion.div>
                   
                   {/* Scroll hint/gradient */}
                   <div className="absolute top-0 right-0 bottom-6 w-20 bg-gradient-to-l from-white to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-stone-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Shield className="w-48 h-48" />
              </div>
              <h3 className="text-xl font-black mb-6 uppercase tracking-tighter italic">
                Verification Hub
              </h3>
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center py-4 border-b border-stone-800">
                  <span className="text-stone-400 text-[10px] font-black uppercase tracking-widest">
                    Business Email
                  </span>
                  <span className="text-emerald-400 font-black text-[10px] uppercase flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Verified
                  </span>
                </div>
                <div className="flex justify-between items-center py-4 border-b border-stone-800">
                  <span className="text-stone-400 text-[10px] font-black uppercase tracking-widest">
                    Identity Status
                  </span>
                  <span
                    className={`font-black text-[10px] uppercase flex items-center gap-2 ${profile?.isVerified ? "text-emerald-400" : "text-amber-400 animate-pulse"}`}
                  >
                    {profile?.isVerified ? (
                      <>
                        <CheckCircle className="w-4 h-4" /> Verified
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" /> Pending
                      </>
                    )}
                  </span>
                </div>
                <div className="pt-4">
                  {profile?.isPremiumVerified && isBadgeActive ? (
                    <div className="block text-center py-3 bg-stone-800 text-stone-500 rounded-xl font-black text-[10px] uppercase tracking-widest border border-stone-700 opacity-60 cursor-default flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500" /> Premium Profile Active
                    </div>
                  ) : (
                    <Link
                      to="/promotions?type=VERIFIED"
                      className="block text-center py-3 bg-amber-500 text-stone-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all active:scale-95 shadow-lg"
                    >
                      Upgrade to Premium Business
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm relative overflow-hidden">
            <h2 className="text-3xl font-black text-stone-900 mb-10 uppercase italic tracking-tighter flex items-center gap-4">
              <Camera className="w-8 h-8 text-amber-500" /> Identity Manager
            </h2>
            <form onSubmit={handleSave} className="space-y-10">
              {isBadgeActive && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-2">
                  <Shield className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                  <div>
                    <p className="text-amber-900 font-black uppercase tracking-tighter italic">
                      Identity Protection Active
                    </p>
                    <p className="text-amber-700 text-xs font-medium leading-relaxed mt-1">
                      Verified merchant profiles are locked to maintain
                      ecosystem trust. You can update these details once your
                      badge expires.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-col md:flex-row items-center gap-10 p-8 bg-stone-50 rounded-[2rem] border border-stone-100 group">
                <div className="shrink-0 w-40 h-40 rounded-[2.5rem] bg-white border-4 border-white shadow-2xl overflow-hidden relative group/avatar transition-all hover:rotate-3">
                  {formData.photoURL ? (
                    <img
                      src={formData.photoURL}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-stone-100">
                      <UserIcon className="w-16 h-16" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer backdrop-blur-md">
                    <Upload className="w-10 h-10 text-white" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
                <div className="flex-grow space-y-4">
                  <div>
                    <h3 className="font-black text-stone-900 uppercase italic text-lg leading-none mb-2">
                      Merchant Avatar
                    </h3>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest leading-loose max-w-sm">
                      A professional photo builds 3x more trust with premium
                      buyers in the Mandi ecosystem.
                    </p>
                  </div>
                  <label className="inline-block px-8 py-3 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-amber-500 hover:text-stone-900 transition-all shadow-xl active:scale-95">
                    Change Photo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <div className="group">
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3 group-focus-within:text-amber-600 transition-colors">
                    Merchant Name
                  </label>
                  <input
                    required
                    disabled={isBadgeActive}
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500/20 italic disabled:opacity-50"
                    placeholder="Your trading name"
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3 group-focus-within:text-amber-600 transition-colors">
                    Business Hotline
                  </label>
                  <input
                    required
                    disabled={isBadgeActive}
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500/20 italic disabled:opacity-50"
                    placeholder="03xx xxxxxxx"
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3 group-focus-within:text-amber-600 transition-colors">
                    Merchant City
                  </label>
                  <input
                    required
                    disabled={isBadgeActive}
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500/20 italic disabled:opacity-50"
                    placeholder="City of operation"
                  />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3 group-focus-within:text-amber-600 transition-colors">
                    Full Business Address
                  </label>
                  <input
                    disabled={isBadgeActive}
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500/20 italic disabled:opacity-50"
                    placeholder="Main Street, Office/Area"
                  />
                </div>
                <div className="group md:col-span-2">
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-3 group-focus-within:text-amber-600 transition-colors">
                    Merchant Biography
                  </label>
                  <textarea
                    rows={4}
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleChange}
                    className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500/20 italic"
                    placeholder="Tell your customers about your farming or trading history..."
                  />
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-stone-100">
                 <h3 className="text-xl font-black text-stone-900 uppercase italic tracking-tighter">Social & <span className="text-amber-500">Public</span> Presence</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="group">
                       <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">WhatsApp for Business</label>
                       <div className="flex items-center gap-3 bg-stone-50 p-4 rounded-2xl">
                          <input type="checkbox" className="w-5 h-5 rounded border-stone-200 text-amber-500 focus:ring-amber-500" />
                          <span className="text-xs font-bold text-stone-600">Primary contact method</span>
                       </div>
                    </div>
                    <div className="group">
                       <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Public Profile Visibility</label>
                       <div className="flex items-center gap-3 bg-stone-50 p-4 rounded-2xl">
                          <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-stone-200 text-amber-500 focus:ring-amber-500" />
                          <span className="text-xs font-bold text-stone-600">Visible to search engines</span>
                       </div>
                    </div>
                    <div className="group">
                       <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Website URL</label>
                       <input type="url" placeholder="https://..." className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                    <div className="group">
                       <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Facebook Business Page</label>
                       <input type="text" placeholder="fb.com/username" className="w-full bg-stone-50 border-none rounded-2xl p-4 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button
                  type="submit"
                  disabled={saving || isBadgeActive}
                  className="flex-grow bg-amber-500 hover:bg-amber-600 text-stone-900 font-black py-4 px-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs italic"
                >
                  {saving ? "Updating Mandi Identity..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className="px-8 py-4 bg-stone-100 text-stone-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-stone-200 transition-all"
                >
                  Discard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "badges" && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
              <div>
                <h2 className="text-3xl font-black text-stone-900 uppercase italic tracking-tighter leading-none mb-2">
                  Merchant Reputation
                </h2>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">
                  Higher badges unlock premium listing features
                </p>
              </div>
              <Link
                to="/promotions?type=VERIFIED"
                className="bg-amber-500 text-stone-900 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:shadow-amber-500/20 transition-all active:scale-95 italic"
              >
                Upgrade Reputation
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div
                className={`p-8 rounded-[2rem] border-4 transition-all hover:bg-white ${profile?.isVerified ? "border-emerald-100 bg-emerald-50/20" : "border-stone-50 bg-stone-50/50 grayscale"}`}
              >
                <div className="flex items-center gap-6 mb-6">
                  <div
                    className={`p-5 rounded-2xl ${profile?.isVerified ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" : "bg-stone-200 text-stone-400"}`}
                  >
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-900 uppercase italic tracking-tight text-xl leading-none mb-1">
                      Standard Trust
                    </h3>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      {profile?.isVerified
                        ? "Identity Confirmed"
                        : "Verification Required"}
                    </p>
                  </div>
                  {profile?.isVerified && (
                    <CheckCircle className="ml-auto w-8 h-8 text-emerald-500 fill-emerald-500/10" />
                  )}
                </div>
                <p className="text-sm text-stone-300 font-medium leading-relaxed">
                  Basic verification confirms your legal identity and enables
                  trading privileges on Mandi.pk.
                </p>
              </div>

              <div
                className={`p-8 rounded-[2rem] border-4 transition-all hover:bg-white group ${profile?.isPremiumVerified ? "border-amber-100 bg-amber-50/20 shadow-2xl shadow-amber-500/10" : "border-stone-50 bg-stone-50/50 grayscale relative"}`}
              >
                {!profile?.isPremiumVerified && (
                  <div className="absolute top-4 right-4 bg-amber-500 text-stone-900 font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full shadow-lg z-20">
                    Elite Feature
                  </div>
                )}
                <div className="flex items-center gap-6 mb-6">
                  <div
                    className={`p-5 rounded-2xl ${profile?.isPremiumVerified ? "bg-amber-500 text-stone-900 shadow-xl shadow-amber-500/20" : "bg-stone-200 text-stone-400"}`}
                  >
                    <Crown className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-900 uppercase italic tracking-tight text-xl leading-none mb-1">
                      Elite Merchant
                    </h3>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      {profile?.isPremiumVerified
                        ? "Professional Status Active"
                        : "Highlight Required"}
                    </p>
                  </div>
                  {profile?.isPremiumVerified && (
                    <CheckCircle className="ml-auto w-8 h-8 text-amber-500 fill-amber-500/10" />
                  )}
                </div>
                <p className="text-sm text-stone-300 font-medium leading-relaxed">
                  Elite merchants receive the golden crown badge, priority in
                  search listings, and 3x more chat requests.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-stone-900 text-stone-100 p-16 rounded-[4rem] text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-[120px] group-hover:scale-110 transition-transform duration-1000" />
            <div className="relative z-10">
              <Crown className="w-20 h-20 text-amber-500 mx-auto mb-8 animate-bounce transition-all [animation-duration:3s]" />
              <h3 className="text-5xl font-black uppercase italic tracking-tighter mb-6 leading-none">
                Dominate the <span className="text-amber-500">Mandi</span>
              </h3>
              <p className="text-stone-400 max-w-2xl mx-auto mb-10 font-bold text-lg leading-relaxed">
                Upgrade to ELITE status to unlock the Golden Badge, unlimited
                Premium Listings, and instant AI-powered marketing for your
                stock.
              </p>
              <Link
                to="/promotions?type=VERIFIED"
                className="bg-white text-stone-900 px-16 py-5 rounded-3xl font-black uppercase italic text-xl hover:bg-amber-500 transition-all shadow-2xl shadow-amber-500/20 active:scale-95 inline-block"
              >
                View Elite Packages
              </Link>
            </div>
          </div>
        </div>
      )}

      {activeTab === "referrals" && (
        <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-6 duration-500">
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-10 sm:p-20 rounded-[4rem] shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 p-12 opacity-5 transform translate-x-1/4 -translate-y-1/4 group-hover:rotate-12 transition-transform">
              <Gift className="w-80 h-80 text-amber-500 overflow-hidden" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-3 bg-amber-500/10 text-amber-500 font-black text-[10px] uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-8 border border-amber-500/20">
                <Users className="w-4 h-4" /> Growth Program
              </div>
              <h2 className="text-4xl sm:text-6xl font-black mb-6 tracking-tighter uppercase italic leading-[0.9]">
                Multiply Your <br />
                <span className="text-amber-500">Reputation</span>
              </h2>
              <p className="text-stone-400 font-bold mb-12 max-w-lg leading-relaxed text-lg">
                Invite professional traders to Mandi.pk. Help 10 peers join and
                secure the{" "}
                <span className="text-amber-500">Elite Merchant Status</span>{" "}
                for 6 months, absolutely free.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 max-w-2xl">
                <div className="flex-grow bg-white/5 backdrop-blur-3xl rounded-3xl p-5 flex items-center justify-between border border-white/10 group/code">
                  <div>
                    <span className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest block mb-1">
                      Your Referral Engine
                    </span>
                    <code className="font-black text-2xl tracking-[0.4em] text-white group-hover/code:text-amber-500 transition-colors uppercase">
                      {profile?.referralCode || "MANDI-PRO"}
                    </code>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(profile?.referralCode || "MANDI-PRO")
                    }
                    className="p-4 bg-white/10 hover:bg-amber-500 hover:text-stone-900 rounded-2xl transition-all"
                  >
                    <Copy className="w-6 h-6" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/?ref=${profile?.referralCode || "MANDI-PRO"}`;
                    if (navigator.share) {
                      navigator
                        .share({ title: "Grow with Mandi.pk", url: link })
                        .catch((err) => {
                          if (err.name !== "AbortError") console.error(err);
                        });
                    } else {
                      copyToClipboard(link);
                    }
                  }}
                  className="bg-amber-500 text-stone-900 px-10 py-6 rounded-3xl font-black flex items-center justify-center gap-4 shadow-2xl hover:bg-amber-400 transition-all active:scale-95 italic uppercase tracking-widest text-sm"
                >
                  <Share2 className="w-6 h-6" /> Share Mandi
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm group">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-500 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black text-stone-900 mb-1 leading-none">
                {profile?.referralCount || 0}
              </h3>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                Traders Joined
              </p>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm group">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                <Gift className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black text-stone-900 mb-1 leading-none">
                {Math.max(0, 10 - (profile?.referralCount || 0))}
              </h3>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                Goal Progress
              </p>
            </div>
            <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm group">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500 group-hover:scale-110 transition-transform">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black text-stone-900 mb-1 leading-none">
                180 Days
              </h3>
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                Elite Validity
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
