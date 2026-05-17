import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, browserPopupRedirectResolver } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs, updateDoc, increment } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthorizedAdmin: boolean;
  isVerified: boolean;
  isBlocked: boolean;
  loading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [appealStatus, setAppealStatus] = useState<'NONE' | 'PENDING' | 'RESOLVED'>('NONE');
  const [appealMessage, setAppealMessage] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  const isSuperAdmin = user?.email?.toLowerCase() === 'imran7297510@gmail.com';
  const isAdmin = isSuperAdmin || isAuthorizedAdmin;

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      // Clear previous profile listener if any
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (currentUser) {
        try {
          // Check for authorized admin status regardless of whether profile exists
          const authAdminDoc = doc(db, 'authorizedAdmins', currentUser.email?.toLowerCase() || 'none');
          const authAdminSnap = await getDoc(authAdminDoc);
          setIsAuthorizedAdmin(authAdminSnap.exists());

          const userDoc = doc(db, 'users', currentUser.uid);
          
          // Initial fetch/creation if needed
          const snap = await getDoc(userDoc);
          if (!snap.exists()) {
             // ... existing signup logic ...
             const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
             const params = new URLSearchParams(window.location.search);
             const referredByCode = params.get('ref');
             let referredById = null;
             if (referredByCode) {
                const referrerQuery = query(collection(db, 'users'), where('referralCode', '==', referredByCode));
                const referrerSnap = await getDocs(referrerQuery);
                if (!referrerSnap.empty) {
                   const referrerDoc = referrerSnap.docs[0];
                   referredById = referrerDoc.id;
                   const currentCount = referrerDoc.data().referralCount || 0;
                   const newCount = currentCount + 1;
                   const updateData: any = { referralCount: increment(1) };
                   if (newCount === 10) {
                      updateData.isVerified = true;
                      updateData.verifiedBadgeType = 'PREMIUM';
                      const expiresAt = new Date();
                      expiresAt.setMonth(expiresAt.getMonth() + 6);
                      updateData.premiumExpiresAt = expiresAt;
                      const notifRef = doc(collection(db, 'notifications'));
                      await setDoc(notifRef, {
                         userId: referredById,
                         title: "🎉 Congratulations!",
                         message: "You've referred 10 people! You have been awarded the PREMIUM SELLER BADGE for 6 months.",
                         read: false,
                         createdAt: serverTimestamp()
                      });
                   } else {
                       const notifRef = doc(collection(db, 'notifications'));
                       await setDoc(notifRef, {
                          userId: referredById,
                          title: "New Referral Signup",
                          message: `Someone just joined using your code! Total: ${newCount}/10 for Premium.`,
                          read: false,
                          createdAt: serverTimestamp()
                       });
                   }
                   await updateDoc(doc(db, 'users', referredById), updateData);
                }
             }
             
             await setDoc(userDoc, {
               isVerified: false,
               name: currentUser.displayName || '',
               email: currentUser.email || '',
               photoURL: '', 
               referralCode: newReferralCode,
               referralCount: 0,
               referredBy: referredById,
               createdAt: serverTimestamp()
             });
             setIsVerified(false);
             setIsBlocked(false);
          }

          // Real-time listener for profile changes (Blocking, Verification, etc.)
          const { onSnapshot } = await import('firebase/firestore');
          profileUnsubscribe = onSnapshot(userDoc, (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              setIsVerified(userData.isVerified === true);
              setIsBlocked(userData.isBlocked === true);
              setBlockReason(userData.blockReason || 'General policy violation');
              setAppealStatus(userData.appealStatus || 'NONE');
            }
          }, (error) => {
            console.error("Profile listener error:", error);
          });

        } catch (error: any) {
          if (error?.message?.includes('client is offline')) {
            console.warn("Firestore is operating in offline mode.");
          } else {
            console.error("Error managing user profile", error);
          }
        }
      } else {
        setIsVerified(false);
        setIsBlocked(false);
        setIsAuthorizedAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    if (isAuthenticating) {
      console.log("Login already in progress, ignoring duplicate call.");
      return;
    }
    
    try {
        setAuthError(null);
        setIsAuthenticating(true);
        console.log("Login with Google initiated...");
        
        const provider = new GoogleAuthProvider();
        
        console.log("Calling signInWithPopup with browserPopupRedirectResolver...");
        const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        console.log("SignInWithPopup SUCCESS:", result.user.email);
        setUser(result.user);
    } catch (error: any) {
        console.error("Google auth failed", error);
        const errorCode = error.code;
        const errorMessage = error.message;
        setAuthError(`${errorCode}: ${errorMessage}`);
        
        if (errorCode === 'auth/unauthorized-domain') {
          alert('Firebase Configuration Error: This domain (' + window.location.hostname + ') is not authorized for Google Sign-In. \n\nAdmin Action Required: Go to your Firebase Console > Authentication > Settings > Authorized Domains and add "' + window.location.hostname + '".');
        } else if (errorCode === 'auth/popup-blocked') {
          alert('The login popup was blocked by your browser. Please allow popups for this site or open the app in a new tab using the icon at the top right.');
        } else if (errorCode === 'auth/operation-not-allowed') {
          alert('Google Login is not enabled in your Firebase Project. Admin must enable "Google" as a sign-in provider in the Firebase Console.');
        } else if (errorCode === 'auth/network-request-failed') {
          alert('Network Error (auth/network-request-failed): This usually happens if your browser is blocking third-party cookies or if an Ad-Blocker is interfering with the login. \n\nSolutions:\n1. Open this app in a NEW TAB (use the icon at the top right).\n2. Disable Ad-Blockers for this site.\n3. Ensure third-party cookies are allowed in your browser settings.');
        } else if (errorCode === 'auth/popup-closed-by-user') {
           // Normal cancellation, no alert needed
        } else {
          alert('Login Failed: ' + errorMessage + ' (Code: ' + errorCode + ') \n\nTip: Try opening the app in a new tab if you continue to encounter this error.');
        }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await auth.signOut();
  }

  const handleSendAppeal = async () => {
    if (!user || !appealMessage.trim()) return;
    setIsSubmittingAppeal(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        appealMessage: appealMessage.trim(),
        appealStatus: 'PENDING',
        updatedAt: serverTimestamp()
      });
      setAppealStatus('PENDING');
      alert('Your appeal has been sent to the administration. We will review it soon.');
    } catch (e) {
      console.error(e);
      alert('Failed to send appeal.');
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      isSuperAdmin,
      isAuthorizedAdmin,
      isVerified, 
      isBlocked,
      loading, 
      authError, 
      loginWithGoogle, 
      logout 
    }}>
      {!loading && (
        isBlocked && !isAdmin && window.location.pathname !== '/support' ? (
          <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
             <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center border-t-8 border-red-500 overflow-hidden">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                   </svg>
                </div>
                <h1 className="text-3xl font-black text-stone-900 uppercase italic tracking-tighter mb-2">Account Blocked</h1>
                <p className="text-red-500 font-bold text-xs uppercase tracking-[0.2em] mb-4">Reason: {blockReason}</p>
                
                <p className="text-stone-500 font-medium mb-8 leading-relaxed text-sm">
                  Your account has been suspended by the Mandi.pk administration due to a violation of our community safety policies. 
                </p>

                {appealStatus === 'NONE' ? (
                   <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 mb-8">
                      <h3 className="font-black text-stone-900 uppercase text-xs tracking-widest mb-3">Submit an Appeal</h3>
                      <textarea
                         value={appealMessage}
                         onChange={(e) => setAppealMessage(e.target.value)}
                         placeholder="Explain why your account should be unblocked..."
                         className="w-full bg-white border-stone-200 rounded-xl p-4 text-sm focus:ring-stone-900 focus:border-stone-900 min-h-[100px] mb-4"
                      />
                      <button 
                        onClick={handleSendAppeal}
                        disabled={isSubmittingAppeal || !appealMessage.trim()}
                        className="w-full bg-stone-900 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-stone-800 transition-all disabled:opacity-50"
                      >
                         {isSubmittingAppeal ? 'Sending...' : 'Send Appeal to Admin'}
                      </button>
                   </div>
                ) : (
                   <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 border-dashed mb-8">
                      <h3 className="font-black text-amber-600 uppercase text-xs tracking-widest mb-2 italic">Appeal Under Review</h3>
                      <p className="text-stone-600 text-xs font-medium">We have received your appeal. Our team will review it and take action as soon as possible.</p>
                   </div>
                )}

                <div className="flex flex-col gap-3">
                   <a href="/support" className="bg-amber-500 text-stone-900 py-3 rounded-xl font-black uppercase italic tracking-widest text-xs hover:bg-amber-600 transition-all">
                      Support & Appeals
                   </a>
                   <a href="tel:+923467297510" className="bg-stone-100 text-stone-700 py-3 rounded-xl font-black uppercase italic tracking-widest text-xs hover:bg-stone-200 transition-all">
                      Call Support
                   </a>
                   <button onClick={() => logout()} className="text-stone-400 font-black uppercase text-[10px] tracking-[0.3em] py-2">
                      Sign Out
                   </button>
                </div>
             </div>
          </div>
        ) : children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
