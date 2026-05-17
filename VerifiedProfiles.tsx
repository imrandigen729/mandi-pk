import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { CheckCircle, Award, Eye, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export function VerifiedProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifiedProfiles();
  }, []);

  const fetchVerifiedProfiles = async () => {
    setLoading(true);
    try {
      // Query profiles with isVerified == true, ordered by views descending
      const q = query(
        collection(db, 'users'),
        where('isVerified', '==', true),
        orderBy('views', 'desc')
      );
      const snap = await getDocs(q);
      const fetchedProfiles = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
      setProfiles(fetchedProfiles);
    } catch (e) {
      console.error("Failed to fetch verified profiles", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading verified profiles...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 flex-1 w-full">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-2xl mb-4">
          <Award className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">Verified Trusted Profiles</h1>
        <p className="text-lg text-stone-600 max-w-2xl mx-auto mb-8">
          Browse our most trusted, verified collectors and sellers. Profiles are ranked by community visits.
        </p>
        <Link 
          to="/promotions?type=VERIFIED" 
          className="inline-flex items-center gap-3 bg-stone-900 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-amber-500 hover:text-stone-900 transition-all active:scale-95 group border border-stone-800"
        >
          <Award className="w-5 h-5 text-amber-500 group-hover:text-stone-900 transition-colors" />
          Apply for Premium & Verified Seller
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile, index) => (
          <Link 
            key={profile.id} 
            to={`/user/${profile.id}`}
            className="group bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all hover:border-amber-300 relative overflow-hidden flex flex-col items-center text-center"
          >
            {/* Rank Badge */}
            <div className={`absolute top-0 right-0 px-3 py-1 font-bold text-sm shadow-sm rounded-bl-lg ${
              index < 3 ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600'
            }`}>
              #{index + 1}
            </div>

            <div className="relative mb-4 mt-2">
              <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-amber-400 bg-stone-100 shadow-sm">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-200 text-stone-400">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                {profile.verifiedBadgeType === 'GOLDEN' ? (
                   <Award className="w-7 h-7 text-amber-500 fill-amber-50" />
                ) : profile.verifiedBadgeType === 'PREMIUM' ? (
                   <div className="bg-amber-600 rounded-full p-1 shadow-lg">
                      <Award className="w-5 h-5 text-white" />
                   </div>
                ) : (
                   <CheckCircle className="w-7 h-7 text-blue-500 fill-blue-50" />
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold text-stone-900 mb-1 group-hover:text-amber-600 transition-colors">
              {profile.name || 'Anonymous User'}
            </h3>
            
            <p className="text-sm text-stone-500 mb-4">
              Joined {profile.createdAt?.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>

            <div className="mt-auto w-full flex items-center justify-center gap-2 text-stone-600 bg-stone-50 py-2 px-4 rounded-lg font-medium text-sm">
              <Eye className="w-4 h-4" /> {profile.views || 0} Profile Views
            </div>
          </Link>
        ))}
        
        {profiles.length === 0 && (
          <div className="col-span-full py-16 text-center text-stone-500 bg-white rounded-xl border border-stone-200">
            No verified profiles found yet.
          </div>
        )}
      </div>
    </div>
  );
}
