import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock, ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react';

export function AdminVerifications() {
  const { isAdmin } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('verificationStatus', '==', 'PENDING')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserProfile));
      setPendingUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userProfile: UserProfile, action: 'APPROVE' | 'REJECT') => {
    setActioning(userProfile.id);
    try {
      const userRef = doc(db, 'users', userProfile.id);
      
      const updateData: any = {
        verificationStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        updatedAt: serverTimestamp()
      };

      if (action === 'APPROVE') {
        updateData.isPremiumVerified = true;
        updateData.verifiedBadgeType = 'GOLDEN';
        updateData.isVerified = true;
      }

      await updateDoc(userRef, updateData);

      // Notify User
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        userId: userProfile.id,
        title: action === 'APPROVE' ? 'Golden Badge Approved!' : 'Badge Request Rejected',
        message: action === 'APPROVE' 
          ? `Congratulations! You are now a Golden Verified Seller on Mandi.pk`
          : `Your request for the Golden Badge was rejected. Please contact support.`,
        type: 'VERIFICATION_STATUS',
        relatedId: userProfile.id,
        read: false,
        createdAt: serverTimestamp()
      });

      setPendingUsers(prev => prev.filter(u => u.id !== userProfile.id));
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userProfile.id}`);
    } finally {
      setActioning(null);
    }
  };

  if (!isAdmin) {
    return <div className="py-20 text-center text-red-500 font-bold">Access Denied. Admin only.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-900 italic uppercase">Seller Verifications</h1>
          <p className="text-stone-500">Review requests for Golden Verified Status</p>
        </div>
        <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-bold flex items-center gap-2 border border-emerald-200">
           <ShieldCheck className="w-5 h-5" /> {pendingUsers.length} Pending
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-stone-500">Loading requests...</div>
      ) : pendingUsers.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center shadow-sm">
           <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-bold text-stone-900 mb-2">Clean Slate</h2>
           <p className="text-stone-500">No pending verification requests at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingUsers.map(profile => (
            <div key={profile.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row border-stone-200">
               <div className="w-full md:w-48 aspect-square bg-stone-100 shrink-0 flex items-center justify-center p-4">
                 {profile.photoURL ? (
                   <img src={profile.photoURL} alt="" className="w-full h-full object-cover rounded-full" />
                 ) : (
                   <ShieldAlert className="w-12 h-12 text-stone-300" />
                 )}
               </div>
               
               <div className="p-6 flex-grow flex flex-col md:flex-row gap-6">
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold text-stone-900 mb-2">{profile.name}</h3>
                    <p className="text-stone-500 text-sm mb-4">Member since: {new Date(profile.createdAt as any).toLocaleDateString()}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-stone-500 border-t pt-4">
                       <div>
                         <span className="block text-[10px] font-bold text-stone-400 uppercase">City</span>
                         <span className="font-semibold text-stone-800">{profile.city}</span>
                       </div>
                       <div>
                         <span className="block text-[10px] font-bold text-stone-400 uppercase">Phone</span>
                         <span className="font-semibold text-stone-800">{profile.phoneNumber}</span>
                       </div>
                    </div>
                  </div>

                  <div className="w-full md:w-64 space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold text-stone-400 uppercase mb-2">Identity Proof (Referral Code / Note)</span>
                      <div className="bg-stone-50 border rounded-lg p-4 text-sm text-stone-600 italic">
                         User requested premium verification for Golden Badge.
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <button 
                         onClick={() => handleAction(profile, 'REJECT')}
                         disabled={actioning === profile.id}
                         className="flex-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                       >
                         <XCircle className="w-4 h-4" /> Reject
                       </button>
                       <button 
                         onClick={() => handleAction(profile, 'APPROVE')}
                         disabled={actioning === profile.id}
                         className="flex-1 bg-amber-500 hover:bg-amber-600 text-stone-900 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                       >
                         <CheckCircle className="w-4 h-4" /> Approve Golden
                       </button>
                    </div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
