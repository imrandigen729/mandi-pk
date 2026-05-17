import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc, deleteDoc, serverTimestamp, setDoc, where, limit, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, Report, UserProfile, PromotionRequest, AuthorizedAdminEmail } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Eye, 
  CheckSquare, 
  Database, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  MessageCircle, 
  User, 
  Users,
  Rocket, 
  Zap, 
  Clock,
  UserX,
  UserCheck,
  UserPlus,
  LayoutGrid,
  ClipboardList,
  AlertCircle,
  FileBadge,
  Ticket,
  Speaker,
  LogOut,
  Plus,
  Search,
  Home as HomeIcon,
  Settings,
  Package,
  X,
  MapPin,
  Phone,
  ArrowRight,
  BadgeCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { formatPKR } from '../lib/utils';
import { Link } from 'react-router-dom';

const SAMPLE_LISTINGS = [
  {
    title: "1948 Antique Pakistan 1 Rupee Coin",
    description: "Rare first edition 1 Rupee coin issued by the Government of Pakistan in 1948. Excellent condition with clear markings.",
    category: "Coins",
    price: 15000,
    quantity: 1,
    shippingCharges: 250,
    images: ["https://images.unsplash.com/photo-1621217596001-c85c292150a2?auto=format&fit=crop&q=80&w=800"],
    sellerName: "Ahmad Antiquities",
    phoneNumber: "+923001234567",
    city: "Lahore, Punjab",
    isFeatured: true,
    isBoosted: false,
    promotionStatus: 'APPROVED' as const,
    status: "LIVE" as const
  },
  {
    title: "Uncirculated 500 Rupee Note - 1980s Series",
    description: "Crisp, uncirculated 500 Rupee bank note from the 1980s. Sequential serial numbers available if buying multiple.",
    category: "Notes",
    price: 8000,
    quantity: 10,
    shippingCharges: 200,
    images: ["https://images.unsplash.com/photo-1625225233840-692558f60ea8?auto=format&fit=crop&q=80&w=800"],
    sellerName: "Karachi Collectibles",
    phoneNumber: "+923331234567",
    city: "Karachi, Sindh",
    isFeatured: false,
    isBoosted: false,
    promotionStatus: 'NONE' as const,
    status: "LIVE" as const
  }
];

export function Admin() {
  const { isAdmin, isSuperAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'listings' | 'reports' | 'profileReports' | 'users' | 'support' | 'broadcast' | 'promotions' | 'authAdmins' | 'allUsers' | 'blockedAccounts'>('listings');
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [profileReports, setProfileReports] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<UserProfile[]>([]);
  const [authAdmins, setAuthAdmins] = useState<AuthorizedAdminEmail[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [promotionRequests, setPromotionRequests] = useState<PromotionRequest[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedListingDetail, setSelectedListingDetail] = useState<Listing | null>(null);
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [isViewingUser, setIsViewingUser] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockActionReason, setBlockActionReason] = useState('Violation of community trading policies.');
  const [isBlockingInProgress, setIsBlockingInProgress] = useState(false);
  
  const formatSafeDate = (val: any) => {
    if (!val) return '---';
    try {
      if (val && typeof val.toDate === 'function') {
        return val.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '---';
    }
  };

  const formatSafeTime = (val: any) => {
    if (!val) return '--:--';
    try {
      if (val && typeof val.toDate === 'function') {
        return val.toDate().toLocaleTimeString();
      }
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString();
    } catch {
      return '--:--';
    }
  };
  
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [listingsSearch, setListingsSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [appliedUserSearch, setAppliedUserSearch] = useState('');
  const [appliedListingsSearch, setAppliedListingsSearch] = useState('');
  
  const [supportFilter, setSupportFilter] = useState<string>('ALL');
  
  const [processingReportId, setProcessingReportId] = useState<string | null>(null);
  const [processingUnblockId, setProcessingUnblockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');

  const cleanupExpiredPromotions = async () => {
    try {
      const now = new Date();
      
      // Cleanup Featured Listings
      const featuredQ = query(collection(db, 'listings'), where('isFeatured', '==', true), where('featuredUntil', '<', now));
      const featuredSnap = await getDocs(featuredQ);
      featuredSnap.docs.forEach(async (d) => {
        await updateDoc(doc(db, 'listings', d.id), { 
          isFeatured: false, 
          featuredUntil: null, 
          promotionStatus: 'NONE' 
        });
      });

      // Cleanup Boosted Listings
      const boostedQ = query(collection(db, 'listings'), where('isBoosted', '==', true), where('boostedUntil', '<', now));
      const boostedSnap = await getDocs(boostedQ);
      boostedSnap.docs.forEach(async (d) => {
        await updateDoc(doc(db, 'listings', d.id), { 
          isBoosted: false, 
          boostedUntil: null, 
          promotionStatus: 'NONE' 
        });
      });

      // Cleanup Verified Badges
      const verifiedQ = query(collection(db, 'users'), where('isVerified', '==', true), where('verifiedUntil', '<', now));
      const verifiedSnap = await getDocs(verifiedQ);
      verifiedSnap.docs.forEach(async (d) => {
        await updateDoc(doc(db, 'users', d.id), { 
          isVerified: false, 
          isPremiumVerified: false,
          verifiedUntil: null,
          verifiedBadgeType: null,
          verifiedBadgeRequestStatus: 'NONE'
        });
      });

      console.log("Promotions cleanup completed.");
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      cleanupExpiredPromotions();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'listings') {
        const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setListings(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Listing)));
      } else if (activeTab === 'reports') {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setReports(snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as Report))
          .filter(r => r.status === 'OPEN')
        );
      } else if (activeTab === 'profileReports') {
        const q = query(collection(db, 'profileReports'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setProfileReports(snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as any))
          .filter(r => r.status === 'OPEN')
        );
      } else if (activeTab === 'users') {
        const q = query(
          collection(db, 'users'), 
          where('verifiedBadgeRequestStatus', '==', 'PENDING')
        );
        const snapshot = await getDocs(q);
        setPendingVerifications(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile)));
      } else if (activeTab === 'allUsers') {
        // Show all users. We avoid restrictive filtering so admins see every profile.
        try {
          const q = query(
            collection(db, 'users'), 
            orderBy('createdAt', 'desc'), 
            limit(500)
          );
          const snapshot = await getDocs(q);
          setAllUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile)));
        } catch (e) {
          console.error("Error fetching all users:", e);
          // Fallback to simpler query if ordering fails (e.g. missing indexes)
          const qSimple = query(collection(db, 'users'), limit(500));
          const snapshot = await getDocs(qSimple);
          setAllUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile)));
        }
      } else if (activeTab === 'blockedAccounts') {
        const q = query(collection(db, 'users'), where('isBlocked', '==', true));
        const snapshot = await getDocs(q);
        const blockedUsersData = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as any));
        // Sort by blockedAt timestamp (newest first)
        blockedUsersData.sort((a, b) => {
          const timeA = a.blockedAt?.seconds || 0;
          const timeB = b.blockedAt?.seconds || 0;
          return timeB - timeA;
        });
        setBlockedUsers(blockedUsersData);
      } else if (activeTab === 'authAdmins') {
        const snapshot = await getDocs(collection(db, 'authorizedAdmins'));
        setAuthAdmins(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AuthorizedAdminEmail)));
      } else if (activeTab === 'support') {
        const q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setSupportTickets(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
      } else if (activeTab === 'promotions') {
        const q = query(collection(db, 'promotionRequests'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setPromotionRequests(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PromotionRequest)));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, activeTab);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
    // Scroll to top when tab changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAdmin, activeTab]);

  const updateStatus = async (id: string, newStatus: Listing['status']) => {
    if (!confirm(`Are you sure you want to change the listing status to ${newStatus}?`)) return;
    if (!confirm(`FINAL CONFIRMATION: Confirm status change for Listing #${id.slice(-5)}?`)) return;
    
    try {
      await updateDoc(doc(db, 'listings', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `listings/${id}`);
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE this listing?`)) return;
    if (!confirm(`FINAL WARNING: This action is irreversible. Delete listing #${id.slice(-5)}?`)) return;

    try {
      await deleteDoc(doc(db, 'listings', id));
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `listings/${id}`);
    }
  };

  const rejectReport = async (id: string) => {
    if (!id) return;
    // Aligning precisely with user terminology request
    if (!window.confirm(`Ignore this report? This action will reject the report for not being relevant to take action.`)) return;
    if (!window.confirm(`FINAL CONFIRMATION: This means the report is not valid for taking actions. Proceed?`)) return;
    
    setProcessingReportId(id);
    try {
      await updateDoc(doc(db, 'reports', id), { 
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid || 'admin',
        resolutionAction: 'REJECTED'
      });
      
      setReports(prev => prev.filter(r => r.id !== id));
      setTimeout(() => fetchData(), 500);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Failed to ignore report", id, error);
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    } finally {
      setProcessingReportId(null);
    }
  };

  const removeAndResolve = async (reportId: string, listingId: string, ownerId?: string, reporterId?: string) => {
    if (!reportId || !listingId) return;
    if (!confirm(`Remove this listing permanently and notify the users?`)) return;
    if (!confirm(`CRITICAL ACTION: Confirm removal of reported content?`)) return;
    
    setProcessingReportId(reportId);
    try {
      // 1. Delete the listing from Firestore
      await deleteDoc(doc(db, 'listings', listingId));
      
      // 2. Resolve the report
      await updateDoc(doc(db, 'reports', reportId), { 
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid || 'admin',
        resolutionAction: 'REMOVED_LISTING'
      });
      
      // 3. Notify Seller
      if (ownerId && ownerId !== 'ANONYMOUS' && ownerId !== 'guest') {
        try {
          const notifSellerRef = doc(collection(db, 'notifications'));
          await setDoc(notifSellerRef, {
            userId: ownerId,
            title: "❌ Listing Removed",
            message: "One of your listings has been removed for violating platform policies. Please review our community guidelines to avoid further actions.",
            read: false,
            createdAt: serverTimestamp(),
            type: 'ADMIN_ACTION'
          });
        } catch (e) { console.error("Notification to seller failed", e); }
      }

      // 4. Notify Reporter
      if (reporterId && reporterId !== 'ANONYMOUS' && reporterId !== 'guest') {
        try {
          const notifReporterRef = doc(collection(db, 'notifications'));
          await setDoc(notifReporterRef, {
            userId: reporterId,
            title: "🛡️ Report Verified",
            message: "Thank you for your report. We have reviewed the content and removed the listing as it did not meet our standards.",
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (e) { console.error("Notification to reporter failed", e); }
      }

      // Update local state immediately for smooth UX
      setReports(prev => prev.filter(r => r.id !== reportId));
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `listings/${listingId}`);
    } finally {
      setProcessingReportId(null);
    }
  };

  const warnAndResolve = async (reportId: string, ownerId: string, reporterId: string, listingTitle?: string) => {
    if (!reportId || !ownerId) return;
    if (!confirm(`Send an official warning to the seller of "${listingTitle}"?`)) return;
    if (!confirm(`CONFIRM WARNING: This will be logged on the user's account history.`)) return;
    
    const customComment = `Your listing "${listingTitle || 'item'}" violates Mandi policies. Please correct it immediately. Continued violations will result in account suspension.`;

    setProcessingReportId(reportId);
    try {
      // 1. Send warning to Seller
      const notifSellerRef = doc(collection(db, 'notifications'));
      await setDoc(notifSellerRef, {
        userId: ownerId,
        title: "⚠️ Official Policy Warning",
        message: customComment,
        read: false,
        createdAt: serverTimestamp(),
        type: 'ADMIN_WARNING'
      });

      // 2. Notify Reporter
      if (reporterId && reporterId !== 'ANONYMOUS' && reporterId !== 'guest') {
        const notifReporterRef = doc(collection(db, 'notifications'));
        await setDoc(notifReporterRef, {
          userId: reporterId,
          title: "🛡️ Violation Found",
          message: "The report you submitted was verified. We have issued a formal warning to the seller and the account is under administrative review.",
          read: false,
          createdAt: serverTimestamp()
        });
      }

      // 3. Resolve the report
      await updateDoc(doc(db, 'reports', reportId), { 
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid || 'admin',
        resolutionAction: 'WARNED_SELLER',
        adminComment: customComment
      });

      // 4. Update local state
      setReports(prev => prev.filter(r => r.id !== reportId));
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    } finally {
      setProcessingReportId(null);
    }
  };

  const blockAndResolveListing = async (reportId: string, ownerId: string, listingId: string, reporterId?: string) => {
    if (!reportId || !ownerId || !listingId) return;
    if (!confirm(`BLOCK SELLER & REMOVE CONTENT: Are you sure you want to terminate this user's access?`)) return;
    if (!confirm(`NUCLEAR OPTION: This will block UID: ${ownerId} and purge the reported listing. PROCEED?`)) return;
    
    setProcessingReportId(reportId);
    try {
      // 1. Block User
      await updateDoc(doc(db, 'users', ownerId), { 
        isBlocked: true,
        blockReason: "Severe or repeat community safety violation based on verified reports.",
        appealStatus: 'NONE'
      });

      // 2. Remove Listing
      await deleteDoc(doc(db, 'listings', listingId));

      // 3. Resolve Report
      await updateDoc(doc(db, 'reports', reportId), { 
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid || 'admin',
        resolutionAction: 'BLOCKED_SELLER'
      });

      // 4. Notify Reporter
      if (reporterId && reporterId !== 'ANONYMOUS' && reporterId !== 'guest') {
        try {
          const notifReporterRef = doc(collection(db, 'notifications'));
          await setDoc(notifReporterRef, {
            userId: reporterId,
            title: "🛡️ Major Violation Actioned",
            message: "Based on your report, we have permanently restricted the violating account. Your vigilance helps keep Mandi safe.",
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (e) { console.error("Notification to reporter failed", e); }
      }

      // Update local state immediately
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      const blockData = { 
        isBlocked: true,
        blockReason: "Severe or repeat community safety violation based on verified reports.",
        appealStatus: 'NONE'
      };
      
      setAllUsers(prev => prev.map(u => u.id === ownerId ? { ...u, ...blockData } : u));
      
      // Move to blocked accounts tab
      setActiveTab('blockedAccounts');
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Block action failed", error);
    } finally {
      setProcessingReportId(null);
    }
  };

  const rejectProfileReport = async (id: string) => {
    if (!id) return;
    // Aligning precisely with user terminology request
    if (!window.confirm(`Ignore this complaint? No action will be taken as it is not relevant for enforcement.`)) return;
    if (!window.confirm(`FINAL CONFIRMATION: Rejecting this report means it is not valid for taking actions. Confirm?`)) return;
    
    setProcessingReportId(id);
    try {
      await updateDoc(doc(db, 'profileReports', id), { 
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid || 'admin',
        resolutionAction: 'REJECTED'
      });
      
      setProfileReports(prev => prev.filter(r => r.id !== id));
      setTimeout(() => fetchData(), 500);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Failed to ignore profile report", id, error);
      handleFirestoreError(error, OperationType.UPDATE, `profileReports/${id}`);
    } finally {
      setProcessingReportId(null);
    }
  };

  const blockAndResolveProfile = async (reportId: string, profileId: string, reporterId?: string) => {
    if (!reportId || !profileId) return;
    if (!confirm(`PERMANENTLY BLOCK THIS USER PROFILE?`)) return;
    if (!confirm(`CRITICAL ENFORCEMENT: Confirm account termination for UID: ${profileId}?`)) return;
    
    setProcessingReportId(reportId);
    try {
      // 1. Block the User Profile
      await updateDoc(doc(db, 'users', profileId), { 
        isBlocked: true,
        blockReason: "Verified community safety violation based on user reports.",
        appealStatus: 'NONE'
      });
      
      // 2. Resolve the report
      await updateDoc(doc(db, 'profileReports', reportId), { 
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid || 'admin',
        resolutionAction: 'BLOCKED_ACCOUNT'
      });
      
      // 3. Notify Reporter
      if (reporterId && reporterId !== 'ANONYMOUS' && reporterId !== 'guest') {
        try {
          const notifReporterRef = doc(collection(db, 'notifications'));
          await setDoc(notifReporterRef, {
            userId: reporterId,
            title: "🛡️ Account Terminated",
            message: "Following your report, we have permanently removed the violating account from the platform. Your feedback keeps Mandi safe.",
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (e) { console.error("Notification to reporter failed", e); }
      }

      // Update local state immediately
      setProfileReports(prev => prev.filter(r => r.id !== reportId));
      
      const blockData = { 
        isBlocked: true,
        blockReason: "Verified community safety violation based on user reports.",
        appealStatus: 'NONE'
      };
      
      setAllUsers(prev => prev.map(u => u.id === profileId ? { ...u, ...blockData } : u));
      
      // Move to blocked accounts tab
      setActiveTab('blockedAccounts');
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Profile block failed", error);
    } finally {
      setProcessingReportId(null);
    }
  };

  const warnAndResolveProfile = async (reportId: string, profileId: string, reporterId: string) => {
    if (!reportId || !profileId) return;
    if (!confirm(`Issue a formal conduct warning to this user?`)) return;
    if (!confirm(`CONFIRM WARNING: Send violation notice to user?`)) return;
    
    const customComment = "Your interactions have been reported by the community. Please remain professional and follow our guidelines to avoid account suspension.";

    setProcessingReportId(reportId);
    try {
      const notifUserRef = doc(collection(db, 'notifications'));
      await setDoc(notifUserRef, {
        userId: profileId,
        title: "⚠️ Profile Conduct Warning",
        message: customComment || "Our team has reviewed reports regarding your profile conduct. Continued violations will lead to account restrictions.",
        read: false,
        createdAt: serverTimestamp(),
        type: 'ADMIN_WARNING'
      });

      if (reporterId && reporterId !== 'ANONYMOUS' && reporterId !== 'guest') {
        const notifReporterRef = doc(collection(db, 'notifications'));
        await setDoc(notifReporterRef, {
          userId: reporterId,
          title: "🛡️ User Officially Warned",
          message: "We have issued a formal policy warning to the account you reported and are monitoring their status.",
          read: false,
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, 'profileReports', reportId), { 
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.uid || 'admin',
        resolutionAction: 'WARNED_PROFILE',
        adminComment: customComment
      });

      setProfileReports(prev => prev.filter(r => r.id !== reportId));
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Profile warning failed", error);
    } finally {
      setProcessingReportId(null);
    }
  };

  const revokeBadge = async (userId: string) => {
    if (!confirm(`Revoke the verified badge from this user?`)) return;
    if (!confirm(`FINAL CONFIRMATION: Remove verification status for user ${userId.slice(-5)}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: false,
        verifiedBadgeType: null,
        verifiedBadgeRequestStatus: 'NONE'
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const updateSupportStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Update ticket status to ${newStatus}?`)) return;
    if (!confirm(`CONFIRM STATUS CHANGE: Ticket #${id.slice(-5)}?`)) return;
    try {
      await updateDoc(doc(db, 'supportTickets', id), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `supportTickets/${id}`);
    }
  };

  const toggleUserVerification = async (u: any, currentStatus: boolean) => {
    const userId = typeof u === 'string' ? u : u.id;
    const userName = typeof u === 'string' ? 'User' : (u.name || u.email);

    const action = currentStatus ? 'REVOKE' : 'GRANT';
    if (!window.confirm(`${action} verification for ${userName}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { 
        isVerified: !currentStatus,
        verifiedBadgeType: !currentStatus ? 'BASIC' : null,
        verifiedBadgeRequestStatus: 'NONE'
      });
      fetchData();
      if (selectedUser && (selectedUser.id === userId || (selectedUser as any).uid === userId)) {
        setSelectedUser({ ...selectedUser, isVerified: !currentStatus, verifiedBadgeType: !currentStatus ? 'BASIC' : null });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const approveBadgeRequest = async (id: string, type: 'BASIC' | 'GOLDEN') => {
    if (!confirm(`Are you sure you want to approve this verification request?`)) return;
    if (!confirm(`FINAL CONFIRMATION: Grant ${type} badge to this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', id), {
        isVerified: true,
        verifiedBadgeType: type,
        verifiedBadgeRequestStatus: 'APPROVED'
      });
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const rejectBadgeRequest = async (id: string) => {
    if (!confirm(`Are you sure you want to REJECT this verification request?`)) return;
    if (!confirm(`FINAL CONFIRMATION: Deny badge application for user ${id.slice(-5)}?`)) return;
    try {
      await updateDoc(doc(db, 'users', id), {
        verifiedBadgeRequestStatus: 'REJECTED'
      });
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const approvePromotion = async (request: PromotionRequest) => {
    if (!confirm(`Are you sure you want to approve this ${request.type} promotion?`)) return;
    if (!confirm(`FINAL ACTIVATION: Confirm payment received and initiate promotion?`)) return;
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + request.durationDays);

      // 1. Update the request status
      await updateDoc(doc(db, 'promotionRequests', request.id), {
        status: 'APPROVED',
        updatedAt: serverTimestamp()
      });

      // 2. Activate the feature on the target
      if (request.type === 'FEATURED') {
        await updateDoc(doc(db, 'listings', request.targetId), {
          isFeatured: true,
          featuredUntil: expiryDate,
          promotionStatus: 'APPROVED'
        });
      } else if (request.type === 'BOOST') {
        await updateDoc(doc(db, 'listings', request.targetId), {
          isBoosted: true,
          boostedUntil: expiryDate,
          promotionStatus: 'APPROVED'
        });
      } else if (request.type === 'VERIFIED') {
        const badgeType = request.planName.includes('PREMIUM') || request.amount > 5000 ? 'GOLDEN' : 'BASIC';
        await updateDoc(doc(db, 'users', request.targetId), {
          isVerified: true,
          verifiedBadgeType: badgeType,
          isPremiumVerified: badgeType === 'GOLDEN',
          verifiedUntil: expiryDate,
          verifiedBadgeRequestStatus: 'APPROVED'
        });
      }

      // 3. Notify user
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId: request.userId,
        title: "✨ Promotion Activated!",
        message: `Your ${request.type} request for "${request.planName}" has been approved and is now active until ${expiryDate.toLocaleDateString()}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `promotionRequests/${request.id}`);
    }
  };

  const rejectPromotion = async (request: PromotionRequest) => {
    if (!confirm(`Are you sure you want to REJECT this promotion request?`)) return;
    if (!confirm(`FINAL DISMISSAL: Notify user about promotion rejection?`)) return;
    const reason = 'Payment proof was invalid or insufficient.';
    try {
      await updateDoc(doc(db, 'promotionRequests', request.id), {
        status: 'REJECTED',
        rejectionReason: reason,
        updatedAt: serverTimestamp()
      });

      if (request.type === 'VERIFIED') {
        await updateDoc(doc(db, 'users', request.targetId), {
          verifiedBadgeRequestStatus: 'REJECTED'
        });
      } else {
        await updateDoc(doc(db, 'listings', request.targetId), {
          promotionStatus: 'REJECTED'
        });
      }

      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId: request.userId,
        title: "❌ Promotion Request Rejected",
        message: `Your ${request.type} request was rejected. Reason: ${reason || 'Payment proof was invalid.'}`,
        read: false,
        createdAt: serverTimestamp()
      });

      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `promotionRequests/${request.id}`);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      return;
    }

    if (!confirm(`Are you sure you want to broadcast this message to ALL USERS?`)) return;
    if (!confirm(`CRITICAL TRANSMISSION: This will send a notification to every single user on the platform. PROCEED?`)) return;

    setBroadcasting(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const batchRequests = usersSnap.docs.map(async (u) => {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          userId: u.id,
          title: broadcastTitle,
          message: broadcastMessage,
          link: broadcastLink,
          read: false,
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchRequests);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastLink('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error(error);
    } finally {
      setBroadcasting(false);
    }
  };

  const sendWarning = async (userId: string, targetName: string) => {
    if (!confirm(`Are you sure you want to send an administrative warning to ${targetName}?`)) return;
    const reason = prompt(`Specify the reason for the warning:`, "Violation of community standards.");
    if (reason === null) return;
    
    if (!confirm(`FINAL CONFIRMATION: Issue formal conduct notice?`)) return;
    
    try {
      // 1. Increment warning count in user profile
      await updateDoc(doc(db, 'users', userId), {
        warningsCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // 2. Send notification
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId,
        title: "⚠️ Administrative Warning",
        message: `Policy compliance notice: ${reason}`,
        read: false,
        createdAt: serverTimestamp()
      });

      alert(`Warning Issued: ${targetName} has been notified.`);
      fetchData();
    } catch (e) {
      console.error(e);
      alert(`Failed to issue warning.`);
    }
  };

  const viewAccountDetail = async (u: UserProfile) => {
    setSelectedUser(u);
    setIsViewingUser(true);
    try {
      // Load user listings
      const q = query(collection(db, 'listings'), where('ownerId', '==', u.id));
      const snap = await getDocs(q);
      setUserListings(snap.docs.map(d => ({ ...d.data(), id: d.id } as Listing)));
    } catch (e) {
      console.error("Error loading user data", e);
    }
  };

  const blockUser = async (userId: string, targetName: string) => {
    if (userId === user?.uid) {
      alert("CRITICAL ERROR: You cannot block your own administrator account.");
      return;
    }

    setIsBlockingInProgress(true);
    try {
      console.log("Initiating block for user:", userId, targetName);
      const userRef = doc(db, 'users', userId);
      const blockData = { 
        isBlocked: true,
        accountStatus: 'blocked',
        blockedAt: serverTimestamp(),
        blockedBy: user?.uid || 'admin',
        blockReason: blockActionReason || "Violation of community trading policies.",
        appealStatus: 'NONE',
        updatedAt: serverTimestamp()
      };

      // 1. Update Firestore User Profile
      await updateDoc(userRef, blockData);

      // 1.5 Update user listings to SUSPENDED so they are hidden from marketplace
      const qListings = query(collection(db, 'listings'), where('ownerId', '==', userId));
      const listingsSnap = await getDocs(qListings);
      
      const updatePromises = listingsSnap.docs
        .filter(l => l.data().status === 'LIVE' || l.data().status === 'BOOKED' || l.data().status === 'REJECTED')
        .map(listingDoc => 
          updateDoc(listingDoc.ref, { 
            status: 'SUSPENDED',
            previousStatus: listingDoc.data().status || 'LIVE',
            isSuspended: true,
            moderationNote: 'Visibility suspended due to account restriction.' 
          })
        );
      await Promise.all(updatePromises);
      
      // 2. Update Local State
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, ...blockData, blockedAt: new Date() as any });
      }
      
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...blockData, blockedAt: new Date() as any } : u));
      
      alert(`SUCCESS: Account ${targetName} blocked.\n${listingsSnap.size} listings have been suspended.`);
      
      // Move to blocked accounts tab
      setActiveTab('blockedAccounts');
      await fetchData();
      setShowBlockModal(false);
      setIsViewingUser(false);
      
    } catch (e) {
      console.error("Block operation failed:", e);
      alert(`BLOCK FAILED: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsBlockingInProgress(false);
    }
  };

  const unblockUser = async (userId: string, targetName: string) => {
    console.log("UNBLOCK PROCESS ATTEMPTED for:", userId);
    
    if (!userId) {
      alert("❌ CRITICAL ERROR: User identifier is missing. System cannot update Firestore.");
      return;
    }

    if (!window.confirm(`RESTORE ACCESS: Are you sure you want to unblock ${targetName}?`)) {
      return;
    }
    
    setProcessingUnblockId(userId);

    try {
      // 1. DATABASE RESTORATION
      const userRef = doc(db, 'users', userId);
      
      const unblockData = { 
        isBlocked: false,
        accountStatus: 'active',
        unblockedAt: serverTimestamp(),
        unblockedBy: user?.email || 'System Admin',
        blockReason: "", // Clear the reason
        appealStatus: 'RESOLVED',
        updatedAt: serverTimestamp()
      };

      // Try updateDoc first, if it fails because doc doesn't exist, try setDoc
      try {
        await updateDoc(userRef, unblockData);
      } catch (err) {
        console.warn("updateDoc failed, trying setDoc merge...", err);
        await setDoc(userRef, unblockData, { merge: true });
      }

      console.log("✅ Profile unblocked in Firestore.");

      // 2. STATE SYNC
      setBlockedUsers(prev => prev.filter(u => u.id !== userId && (u as any).uid !== userId));
      setAllUsers(prev => prev.map(u => (u.id === userId || (u as any).uid === userId) ? { ...u, isBlocked: false, accountStatus: 'active' } : u));
      
      if (selectedUser && (selectedUser.id === userId || (selectedUser as any).uid === userId)) {
        setSelectedUser({ ...selectedUser, isBlocked: false, accountStatus: 'active' });
      }

      // 3. BACKGROUND RESTORATION (ASYNC)
      (async () => {
        try {
          const qListings = query(collection(db, 'listings'), where('ownerId', '==', userId));
          const listingsSnap = await getDocs(qListings);
          
          if (listingsSnap.size > 0) {
            const batchPromises = listingsSnap.docs
              .filter(lDoc => lDoc.data().status === 'SUSPENDED')
              .map(lDoc => 
                updateDoc(lDoc.ref, { 
                  status: lDoc.data().previousStatus || 'LIVE',
                  isSuspended: false,
                  updatedAt: serverTimestamp()
                }).catch(e => console.warn(`Listing ${lDoc.id} restore skipped`, e))
              );
            await Promise.all(batchPromises);
            console.log(`Restored ${listingsSnap.size} listings for ${targetName}`);
          }

          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            userId: userId,
            title: "Access Revived",
            message: "Good news! Mandi.pk administration has restored your account access. You can now resume trading.",
            read: false,
            createdAt: serverTimestamp(),
            type: 'ADMIN_ALERT'
          });
        } catch (subErr) {
          console.error("Secondary restore tasks failed:", subErr);
        }
      })();

      alert(`✅ SUCCESS: ${targetName} is now active.`);
      await fetchData();
    } catch (e) {
      console.error("UNBLOCK FAILURE:", e);
      alert(`❌ SYSTEM FAILURE: Unable to unblock account. Detail: ${e instanceof Error ? e.message : 'Database collision'}`);
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setProcessingUnblockId(null);
    }
  };

  const addAuthorizedAdmin = async () => {
    if (!newAdminEmail) return;
    if (!confirm(`Are you sure you want to grant administrative access to ${newAdminEmail}?`)) return;
    if (!confirm(`CRITICAL SECURITY ACTION: Confirm authorizing new administrator?`)) return;
    const sanitizedEmail = newAdminEmail.toLowerCase().trim();
    try {
      const adminRef = doc(db, 'authorizedAdmins', sanitizedEmail);
      await setDoc(adminRef, {
        email: sanitizedEmail,
        addedAt: serverTimestamp(),
        addedBy: user?.email
      });
      setNewAdminEmail('');
      fetchData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'authorizedAdmins');
    }
  };

  const removeAuthorizedAdmin = async (id: string) => {
    if (!confirm(`Are you sure you want to REVOKE administrative access for ${id}?`)) return;
    if (!confirm(`CRITICAL SECURITY ACTION: Terminate admin privileges for this account?`)) return;
    try {
      await deleteDoc(doc(db, 'authorizedAdmins', id));
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `authorizedAdmins/${id}`);
    }
  };
  const initiateChat = async (targetUserId: string) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'chats'),
        where('buyerId', '==', targetUserId),
        where('sellerId', '==', 'ADMIN')
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        navigate('/messages');
        return;
      }

      const chatRef = doc(collection(db, 'chats'));
      await setDoc(chatRef, {
        listingId: 'SUPPORT',
        buyerId: targetUserId,
        sellerId: 'ADMIN',
        lastMessage: '',
        updatedAt: serverTimestamp()
      });
      navigate('/messages');
    } catch (e) {
      console.error(e);
    }
  };

  const seedData = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to seed the database with sample listings?")) return;
    if (!confirm("FINAL CONFIRMATION: This will create multiple new entries in the marketplace. Proceed?")) return;
    setSeeding(true);
    try {
      for (const item of SAMPLE_LISTINGS) {
        const listingRef = doc(collection(db, 'listings'));
        await setDoc(listingRef, {
          ...item,
          paymentAccountDetails: "N/A",
          paymentProofImage: "",
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'listings');
    } finally {
      setSeeding(false);
    }
  };

  const getTabTitle = () => {
    switch(activeTab) {
      case 'listings': return 'Marketplace Listings';
      case 'reports': return 'Reported Listings';
      case 'profileReports': return 'Reported Profiles';
      case 'blockedAccounts': return 'Blocked Accounts';
      case 'users': return 'Application for Verified Seller';
      case 'allUsers': return 'Accounts Management';
      case 'support': return 'Support Tickets';
      case 'promotions': return 'Promotion Requests';
      case 'broadcast': return 'Community Broadcast';
      case 'authAdmins': return 'Authorized Administrators';
      default: return activeTab.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-black text-stone-900 mb-4 tracking-tighter uppercase italic">Operational Access Needed</h1>
        <p className="text-stone-600 mb-8 font-medium">You must be logged in as an authorized administrator to access the Mandi controls.</p>
        <Link to="/" className="inline-block bg-amber-500 text-stone-900 font-black px-8 py-3 rounded-xl shadow-lg active:scale-95">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex h-screen overflow-hidden">
      {/* Persistent Sidebar */}
      <aside className="w-64 bg-stone-900 text-stone-400 shrink-0 border-r border-stone-800 hidden lg:flex flex-col h-screen">
         <div className="p-8 border-b border-stone-800">
            <h1 className="text-white font-black uppercase italic tracking-tighter text-xl leading-none">Mandi <span className="text-amber-500">Admin</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-2 text-stone-500">Control Center</p>
         </div>
         
         <nav className="flex-grow p-4 space-y-1 overflow-y-auto scrollbar-none">
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-4 py-4">Management</div>
            <SidebarLink id="listings" icon={LayoutGrid} label="Listings" />
            <SidebarLink id="reports" icon={ShieldAlert} label="Reported Listings" />
            <SidebarLink id="profileReports" icon={AlertCircle} label="Reported Profiles" />
            <SidebarLink id="users" icon={FileBadge} label="Application for Verified Seller" />
            <SidebarLink id="allUsers" icon={User} label="Accounts" />
            <SidebarLink id="blockedAccounts" icon={UserX} label="Blocked Accounts" />
            
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-4 py-8">System</div>
            <SidebarLink id="platformSettings" icon={Settings} label="Platform Settings" />
            <SidebarLink id="support" icon={Ticket} label="Support Tickets" />
            <SidebarLink id="promotions" icon={Zap} label="Promotion Requests" />
            <SidebarLink id="broadcast" icon={Speaker} label="Community Broadcast" />

            {isSuperAdmin && (
              <>
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-4 py-8">Master Controls</div>
                <SidebarLink id="authAdmins" icon={UserPlus} label="Authorized Admins" />
              </>
            )}
         </nav>

         <div className="p-4 border-t border-stone-800 space-y-2">
            <button 
              onClick={() => logout()}
              className="w-full flex items-center gap-3 bg-stone-800 text-stone-400 px-4 py-3 rounded-xl font-bold transition-all hover:bg-red-500 hover:text-white text-xs"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
         </div>
      </aside>

      <div className="flex-grow flex flex-col min-w-0 h-screen">
        <header className="bg-white border-b border-stone-200 h-20 flex items-center px-8 justify-between z-[60] shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="lg:hidden p-2 bg-stone-100 rounded-xl"><HomeIcon className="w-5 h-5 text-stone-600" /></button>
              <h2 className="text-xl font-black text-stone-900 uppercase italic tracking-tighter">
                {getTabTitle()}
              </h2>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                 <div className="text-xs font-black text-stone-900 uppercase tracking-tighter leading-none">{user?.email}</div>
                 <div className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">{isSuperAdmin ? 'Super Admin' : 'Authorized Admin'}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-amber-500 font-black italic">
                 {user?.email?.charAt(0).toUpperCase()}
              </div>
           </div>
        </header>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden bg-white border-b border-stone-200 z-[50] overflow-x-auto scrollbar-none flex px-4 shrink-0">
           {[
             { id: 'listings', label: 'Listings', icon: LayoutGrid },
             { id: 'reports', label: 'Reported Listings', icon: ShieldAlert },
             { id: 'profileReports', label: 'Reported Profiles', icon: AlertCircle },
             { id: 'blockedAccounts', label: 'Blocked', icon: UserX },
             { id: 'users', label: 'Application for Verified Seller', icon: FileBadge },
             { id: 'allUsers', label: 'Accounts', icon: User },
             { id: 'support', label: 'Support', icon: Ticket },
             { id: 'promotions', label: 'Promo', icon: Zap },
             { id: 'broadcast', label: 'Broad', icon: Speaker },
             ...(isSuperAdmin ? [{ id: 'authAdmins', label: 'Admins', icon: UserPlus }] : [])
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
                 activeTab === tab.id ? 'border-amber-500 text-amber-600 bg-amber-50/20' : 'border-transparent text-stone-400'
               }`}
             >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
             </button>
           ))}
        </div>

         <main className="p-4 lg:p-8 flex-grow overflow-y-auto scrollbar-none pb-32 lg:pb-8">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center">
               <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
               <p className="text-stone-400 font-bold uppercase text-[10px] tracking-widest">Accessing Mandi Database...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
               {activeTab === 'listings' && (
                 <div className="space-y-6">
                   <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                         <Search className="text-amber-500 w-6 h-6" />
                         <input 
                           type="text" 
                           placeholder="Search products by title or seller..." 
                           className="flex-grow bg-transparent border-none focus:ring-0 font-bold text-stone-900"
                           value={listingsSearch}
                           onChange={(e) => setListingsSearch(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && setAppliedListingsSearch(listingsSearch)}
                         />
                      </div>
                      <button 
                        onClick={() => setAppliedListingsSearch(listingsSearch)}
                        className="w-fit px-8 py-2 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-lg"
                      >
                        Search
                      </button>
                   </div>

                   <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden shrink-0">
                      <div className="overflow-x-auto scrollbar-none">
                        <table className="min-w-full divide-y divide-stone-100 border-separate border-spacing-0">
                          <thead className="bg-stone-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Merchant/Product</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Category</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Status</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Actions</th>
                            </tr>
                          </thead>
                              <tbody className="divide-y divide-stone-50">
                                {listings.filter(l => 
                                  !appliedListingsSearch || 
                                  l.title.toLowerCase().includes(appliedListingsSearch.toLowerCase()) || 
                                  l.sellerName?.toLowerCase().includes(appliedListingsSearch.toLowerCase())
                                ).map((l) => (
                                <tr key={l.id} className="hover:bg-stone-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <button onClick={() => setSelectedListingDetail(l)} className="text-left block w-full focus:outline-none">
                                      <div className="font-black text-stone-900 text-sm italic hover:text-amber-600 truncate max-w-[200px]">{l.title}</div>
                                      <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest truncate">{l.sellerName}</div>
                                    </button>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-1 rounded-md uppercase tracking-tight">{l.category}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${l.status === 'LIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                      {l.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => setSelectedListingDetail(l)} className="p-2 bg-stone-50 hover:bg-amber-50 text-amber-600 rounded-lg border border-stone-100 transition-all" title="View Full Details">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => updateStatus(l.id, l.status === 'LIVE' ? 'PENDING' : 'LIVE')} className="p-2 bg-stone-50 hover:bg-emerald-50 text-emerald-600 rounded-lg border border-stone-100 transition-all">
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => deleteListing(l.id)} className="p-2 bg-stone-50 hover:bg-red-50 text-red-600 rounded-lg border border-stone-100 transition-all">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

               {activeTab === 'allUsers' && (
                 <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col gap-4">
                       <div className="flex items-center gap-4">
                          <User className="text-amber-500 w-6 h-6" />
                          <input 
                            type="text" 
                            placeholder="Search user by email or name..." 
                            className="flex-grow bg-transparent border-none focus:ring-0 font-bold text-stone-900"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setAppliedUserSearch(userSearch)}
                          />
                       </div>
                       <button 
                         onClick={() => setAppliedUserSearch(userSearch)}
                         className="w-fit px-8 py-2 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-lg"
                       >
                         Search
                       </button>
                    </div>
                    
                    <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden shrink-0">
                       <div className="overflow-x-auto scrollbar-none">
                          <table className="min-w-full divide-y divide-stone-100 border-separate border-spacing-0">
                             <thead className="bg-stone-50 sticky top-0 z-10">
                                <tr>
                                   <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50 w-16">Sr.</th>
                                   <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Profile & Email</th>
                                   <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Registered</th>
                                   <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Badge Status</th>
                                   <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Manage</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-stone-50">
                             {allUsers.filter(u => 
                               !appliedUserSearch || 
                               u.email?.toLowerCase().includes(appliedUserSearch.toLowerCase()) || 
                               u.name?.toLowerCase().includes(appliedUserSearch.toLowerCase())
                             ).map((u, index) => (
                               <tr key={u.id} className={`${u.isBlocked ? 'bg-red-50/30' : 'hover:bg-stone-50/50'} transition-colors`}>
                                  <td className="px-6 py-4 text-[10px] font-black text-stone-400 tracking-tighter">
                                     {String(index + 1).padStart(2, '0')}
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="font-black text-stone-900 text-sm italic flex items-center gap-2">
                                        {u.name || 'Anonymous user'}
                                        {u.isVerified && <ShieldCheck className={`w-3 h-3 ${u.verifiedBadgeType === 'GOLDEN' ? 'text-amber-500' : 'text-emerald-500'}`} />}
                                     </div>
                                      {u.isBlocked && <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-full uppercase tracking-widest inline-block w-fit mt-1">Blocked</span>}
                                     <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">{u.email}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <div className="text-[10px] font-black text-stone-600 uppercase tracking-widest whitespace-nowrap">
                                        {formatSafeDate(u.createdAt)}
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     {u.isVerified ? (
                                       <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 w-fit ${u.verifiedBadgeType === 'GOLDEN' ? 'text-amber-600 bg-amber-50 border border-amber-100' : 'text-emerald-600 bg-emerald-50 border border-emerald-100'}`}>
                                          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${u.verifiedBadgeType === 'GOLDEN' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                          {u.verifiedBadgeType === 'GOLDEN' ? 'PREMIUM' : 'VERIFIED SELLER'}
                                       </span>
                                     ) : (
                                       <span className="text-[9px] font-black text-stone-400 bg-stone-100 px-2.5 py-1 rounded-lg uppercase tracking-widest w-fit border border-stone-200">UNVERIFIED</span>
                                     )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <button 
                                       onClick={() => viewAccountDetail(u)} 
                                       className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-md active:scale-95 group"
                                     >
                                        <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> View Account
                                     </button>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
            )}

               {activeTab === 'authAdmins' && (
                 <div className="space-y-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm">
                       <h3 className="text-xl font-black text-stone-900 uppercase italic tracking-tighter mb-6">Authorize Admin Access</h3>
                       <div className="flex gap-4">
                          <input 
                            type="email" 
                            placeholder="Type assistant email address..." 
                            className="flex-grow bg-stone-50 border-none rounded-2xl px-6 py-4 font-bold text-stone-900"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                          />
                          <button onClick={addAuthorizedAdmin} className="bg-stone-900 text-white px-10 rounded-2xl font-black uppercase italic text-sm hover:bg-amber-500 hover:text-stone-900 transition-all">
                             Authorize
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {authAdmins.map(adm => (
                         <div key={adm.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between group">
                            <div>
                               <div className="font-black text-stone-900 lowercase italic">{adm.email}</div>
                               <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">Added On: {formatSafeDate(adm.addedAt)}</div>
                            </div>
                            <button onClick={() => removeAuthorizedAdmin(adm.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors">
                               <UserX className="w-5 h-5" />
                            </button>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {activeTab === 'broadcast' && (
                 <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3.5rem] border border-stone-100 shadow-xl">
                    <div className="text-center mb-10">
                       <Speaker className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                       <h2 className="text-3xl font-black text-stone-900 uppercase italic tracking-tighter">Mandi Broadcast</h2>
                       <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mt-2">Send an instant notification to all active users</p>
                    </div>

                    <div className="space-y-6">
                       <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-4">Broadcast Title</label>
                          <input 
                             type="text" 
                             value={broadcastTitle}
                             onChange={(e) => setBroadcastTitle(e.target.value)}
                             className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 font-black text-stone-900 italic"
                             placeholder="Mandi Update!"
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-4">Message Body</label>
                          <textarea 
                             rows={4}
                             value={broadcastMessage}
                             onChange={(e) => setBroadcastMessage(e.target.value)}
                             className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 font-medium text-stone-900"
                             placeholder="Type your message here..."
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-4">Action Link (Optional)</label>
                          <input 
                             type="text" 
                             value={broadcastLink}
                             onChange={(e) => setBroadcastLink(e.target.value)}
                             className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 font-bold text-stone-500"
                             placeholder="https://mandi.pk/listings"
                          />
                       </div>
                       <button 
                         onClick={handleBroadcast}
                         disabled={broadcasting}
                         className="w-full bg-stone-900 hover:bg-amber-500 hover:text-stone-900 text-white font-black py-5 rounded-3xl uppercase italic tracking-widest text-lg transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-4"
                       >
                          <Speaker className="w-6 h-6" /> {broadcasting ? 'Transmitting...' : 'Send Broadcast Now'}
                       </button>
                    </div>
                 </div>
               )}

               {activeTab === 'reports' && (
                 <div className="grid grid-cols-1 gap-6">
                  {reports.map((report) => (
                    <div key={report.id} className={`p-6 rounded-[2rem] border-2 shadow-sm transition-all duration-300 ${report.status === 'OPEN' ? 'border-red-100 bg-white' : 'border-stone-100 bg-stone-50 opacity-60'}`}>
                      <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                        <div className="flex-grow space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="font-black text-red-600 flex items-center gap-2 uppercase tracking-tighter text-lg italic">
                              <ShieldAlert className="w-6 h-6 animate-pulse" /> Listing Violation Report
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${report.status === 'OPEN' ? 'bg-red-500 text-white' : 'bg-stone-200 text-stone-500'}`}>
                               {report.status}
                            </span>
                          </div>
                          
                          <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 shadow-inner flex flex-col md:flex-row gap-6">
                             {report.listingImage && (
                               <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                                  <img src={report.listingImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                               </div>
                             )}
                             <div className="flex-grow">
                               <div className="flex justify-between items-start mb-2">
                                 <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Reported Item:</div>
                                 <div className="text-[10px] font-black text-stone-900 uppercase italic tracking-tighter">
                                    {report.listingTitle || 'Unknown Listing'}
                                    {report.listingPrice && <span className="ml-2 text-amber-600">({formatPKR(report.listingPrice)})</span>}
                                 </div>
                               </div>
                               <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Reported Reason:</div>
                               <div className="text-stone-900 font-bold leading-relaxed italic">"{report.reason}"</div>
                             </div>
                          </div>

                          <div className="flex items-center gap-6 pt-2">
                             <Link to={`/listings/${report.listingId}`} className="flex items-center gap-2 text-stone-900 font-black uppercase text-[10px] tracking-widest hover:text-amber-500 transition-colors">
                                <Eye className="w-4 h-4" /> Inspect Listing
                             </Link>
                             <div className="text-[10px] font-bold text-stone-400 uppercase">
                                Reported On: {formatSafeDate(report.createdAt)}
                             </div>
                          </div>
                        </div>

                        {report.status === 'OPEN' && (
                          <div className="flex flex-col gap-3 w-full lg:w-56 shrink-0 max-h-[210px] overflow-y-auto pr-1 custom-scrollbar">
                            <button 
                              onClick={() => rejectReport(report.id)} 
                              disabled={processingReportId === report.id}
                              className="w-full flex items-center justify-between px-6 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 group/act shadow-sm"
                            >
                              <span className="flex items-center gap-2">
                                  {processingReportId === report.id ? <div className="w-3 h-3 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" /> : <Eye className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />}
                                  Ignore Report
                               </span>
                               <span className="text-[8px] text-stone-400 font-bold uppercase tracking-wider italic">Irrelevant</span>
                            </button>

                            {report.ownerId ? (
                               <button 
                                 onClick={() => warnAndResolve(report.id, report.ownerId!, report.reporterId, report.listingTitle)}
                                 disabled={processingReportId === report.id}
                                 className="w-full flex items-center justify-between px-6 py-4 bg-amber-500 hover:bg-black text-stone-900 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 group/act"
                               >
                                 <span className="flex items-center gap-2">
                                    {processingReportId === report.id ? <div className="w-3 h-3 border-2 border-amber-900 border-t-white rounded-full animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                    Send Warning
                                 </span>
                                 <span className="text-[8px] text-stone-900/40 group-hover/act:text-white/40 font-bold italic uppercase tracking-tighter">Official</span>
                               </button>
                            ) : null}

                            <button 
                              onClick={() => removeAndResolve(report.id, report.listingId, report.ownerId, report.reporterId)} 
                              disabled={processingReportId === report.id}
                              className="w-full flex items-center justify-between px-6 py-4 bg-red-600 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 group/act"
                            >
                               <span className="flex items-center gap-2">
                                  {processingReportId === report.id ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                  Remove Listing
                               </span>
                               <span className="text-[8px] text-white/40 font-bold uppercase tracking-wider">Strike</span>
                            </button>

                            {report.ownerId && (
                               <button 
                                 onClick={() => blockAndResolveListing(report.id, report.ownerId!, report.listingId, report.reporterId)} 
                                 disabled={processingReportId === report.id}
                                 className="w-full flex items-center justify-between px-6 py-3 bg-stone-900 hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 group/act"
                               >
                                  <span className="flex items-center gap-2">
                                     <UserX className="w-4 h-4 text-red-500 group-hover:text-white" />
                                     Block Account
                                  </span>
                                  <span className="text-[8px] text-stone-500 group-hover:text-white/40 font-bold tracking-tighter italic">TERMINATE</span>
                               </button>
                            )}

                            {(!report.ownerId) && (
                               <div className="px-4 py-2 bg-stone-100 rounded-xl text-[8px] font-bold text-stone-400 uppercase text-center border border-dashed border-stone-200">
                                  Metadata missing: User block restricted
                               </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-stone-100">
                        <CheckCircle className="w-20 h-20 text-stone-100 mx-auto mb-4" />
                        <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">All clean! No listing reports pending.</p>
                    </div>
                  )}
                </div>
               )}

               {activeTab === 'profileReports' && (
                 <div className="grid grid-cols-1 gap-6">
                  {profileReports.map((report) => (
                    <div key={report.id} className={`p-8 rounded-[2.5rem] border-2 shadow-sm transition-all duration-300 ${report.status === 'OPEN' ? 'border-amber-100 bg-white' : 'border-stone-100 bg-stone-50 opacity-60'}`}>
                      <div className="flex flex-col lg:flex-row justify-between gap-8">
                        <div className="flex-grow space-y-4">
                           <div className="flex items-center justify-between">
                              <h3 className="font-black text-stone-900 uppercase tracking-tighter text-2xl italic flex items-center gap-3">
                                 <Users className="w-8 h-8 text-amber-500" /> Account Violation
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${report.status === 'OPEN' ? 'bg-amber-500 text-stone-900' : 'bg-stone-200 text-stone-500'}`}>
                                 {report.status}
                              </span>
                           </div>

                           <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                              <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Complaint:</div>
                              <p className="text-stone-800 font-bold text-lg leading-tight">{report.reason}</p>
                           </div>

                           <div className="flex items-center gap-6 pt-2">
                              <Link to={`/user/${report.profileId}`} className="flex items-center gap-2 text-stone-900 font-black uppercase text-[10px] tracking-widest bg-stone-100 px-4 py-2 rounded-lg hover:bg-stone-900 hover:text-white transition-all">
                                 <Eye className="w-4 h-4" /> Inspect Suspect Profile
                              </Link>
                              <div className="text-[10px] font-bold text-stone-400 uppercase">
                                 Sent On: {formatSafeDate(report.createdAt)}
                              </div>
                           </div>
                        </div>

                        {report.status === 'OPEN' && (
                          <div className="flex flex-col gap-3 w-full lg:w-56 shrink-0 max-h-[210px] overflow-y-auto pr-1 custom-scrollbar">
                             <button 
                               onClick={() => rejectProfileReport(report.id)} 
                               disabled={processingReportId === report.id}
                               className="w-full flex items-center justify-between px-6 py-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 group/act shadow-sm"
                             >
                                <span className="flex items-center gap-2">
                                   {processingReportId === report.id ? <div className="w-3 h-3 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                                   Ignore Report
                                </span>
                                <span className="text-[8px] text-stone-400 font-bold uppercase italic">Irrelevant</span>
                             </button>

                             {report.profileId ? (
                               <button 
                                 onClick={() => warnAndResolveProfile(report.id, report.profileId, report.reporterId!)}
                                 disabled={processingReportId === report.id}
                                 className="w-full flex items-center justify-between px-6 py-4 bg-amber-500 hover:bg-black text-stone-900 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-200 disabled:opacity-50 group/act"
                               >
                                 <span className="flex items-center gap-2">
                                    {processingReportId === report.id ? <div className="w-3 h-3 border-2 border-amber-900 border-t-white rounded-full animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                                    Send Warning
                                 </span>
                                 <span className="text-[8px] text-stone-900/40 group-hover/act:text-white/40 font-bold">GUARD</span>
                               </button>
                             ) : null}

                             <button 
                               onClick={() => blockAndResolveProfile(report.id, report.profileId, report.reporterId)} 
                               disabled={processingReportId === report.id}
                               className="w-full flex items-center justify-between px-6 py-4 bg-red-600 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-red-200 disabled:opacity-50 group/act"
                             >
                                <span className="flex items-center gap-2">
                                   {processingReportId === report.id ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <UserX className="w-4 h-4" />}
                                   Block Account
                                </span>
                                <span className="text-[8px] text-white/40 font-bold uppercase">Terminate</span>
                             </button>

                             {(!report.profileId) && (
                               <div className="px-4 py-2 bg-stone-100 rounded-xl text-[8px] font-bold text-stone-400 uppercase text-center border border-dashed border-stone-200">
                                  Action Restricted: Target ID Missing
                               </div>
                             )}
                          </div>
                        )}
                        </div>
                      </div>
                    ))}
                    {profileReports.length === 0 && (
                    <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-stone-100">
                        <CheckCircle className="w-20 h-20 text-stone-100 mx-auto mb-4" />
                        <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">Clear skies! No profile reports found.</p>
                    </div>
                   )}
                 </div>
                )}

                {activeTab === 'blockedAccounts' && (
                  <div className="grid grid-cols-1 gap-6">
                    {blockedUsers.map((u) => (
                      <div key={u.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-red-100 shadow-sm transition-all duration-300">
                        <div className="flex flex-col lg:flex-row justify-between gap-8">
                          <div className="flex-grow space-y-4">
                             <div className="flex items-center justify-between">
                                <h3 className="font-black text-stone-900 uppercase tracking-tighter text-2xl italic flex items-center gap-3">
                                   <UserX className="w-8 h-8 text-red-500" /> Blocked Account
                                </h3>
                                <div className="text-[10px] font-bold text-stone-400 uppercase">
                                  Blocked On: {formatSafeDate(u.blockedAt)}
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                   <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">User Details:</div>
                                   <div className="font-black text-stone-900 text-sm">{u.name || 'Anonymous User'}</div>
                                   <div className="text-xs text-stone-500">{u.email}</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                   <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Block Reason:</div>
                                   <div className="text-stone-800 font-bold text-sm leading-tight italic">"{u.blockReason || 'General violation'}"</div>
                                   {u.blockedBy && (
                                     <div className="mt-2 text-[9px] font-bold text-stone-400 uppercase">Action by: {u.blockedBy}</div>
                                   )}
                                </div>
                             </div>

                             {u.appealStatus === 'PENDING' && (
                                <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-200 border-dashed">
                                   <div className="flex items-center gap-2 mb-2">
                                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                                      <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Received Appeal:</div>
                                   </div>
                                   <p className="text-stone-800 font-bold text-sm italic">"{u.appealMessage || 'No message provided.'}"</p>
                                </div>
                             )}

                             <div className="flex items-center gap-6 pt-2">
                                <button 
                                  onClick={() => viewAccountDetail(u)}
                                  className="flex items-center gap-2 text-stone-900 font-black uppercase text-[10px] tracking-widest bg-stone-100 px-4 py-2 rounded-lg hover:bg-stone-900 hover:text-white transition-all shadow-sm"
                                >
                                   <Eye className="w-4 h-4" /> View Account Summary
                                </button>
                             </div>
                          </div>

                          <div className="flex flex-col gap-3 w-full lg:w-56 shrink-0 justify-center">
                             <button 
                               onClick={() => unblockUser(u.id, u.name || "User")} 
                               disabled={processingUnblockId === u.id}
                               className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-200 disabled:shadow-none"
                             >
                                {processingUnblockId === u.id ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4" />
                                    Unblock Account Now
                                  </>
                                )}
                             </button>
                             <button 
                               onClick={() => sendWarning(u.id, u.name || "User")}
                               disabled={!!processingUnblockId}
                               className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-sm disabled:opacity-50"
                             >
                                Send Final Warning
                             </button>
                          </div>
                       </div>
                    </div>
                    ))}
                    {blockedUsers.length === 0 && (
                      <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-stone-100">
                          <CheckCircle className="w-20 h-20 text-stone-100 mx-auto mb-4" />
                          <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">No blocked accounts found!</p>
                      </div>
                    )}
                  </div>
                 )}

               {activeTab === 'users' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingVerifications.map((u) => (
                    <div key={u.id} className="p-6 rounded-2xl border-2 border-amber-100 bg-white shadow-sm flex flex-col gap-4 relative">
                       <div className="font-black text-stone-900 text-xl">{u.name || 'Anonymous'}</div>
                       <div className="text-sm text-stone-500">{u.email}</div>
                       <div className="bg-amber-50 p-4 rounded-xl">
                          <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">Requested Badge: {u.verifiedBadgeType === 'GOLDEN' ? 'PREMIUM' : 'VERIFIED SELLER'}</p>
                          <div className="flex gap-2">
                             <button onClick={() => approveBadgeRequest(u.id, u.verifiedBadgeType || 'BASIC')} className="flex-1 bg-green-600 text-white text-xs font-black py-2 rounded-lg">Approve {u.verifiedBadgeType === 'GOLDEN' ? 'Premium' : 'Verified Seller'}</button>
                             <button onClick={() => rejectBadgeRequest(u.id)} className="flex-1 bg-white text-red-600 border border-red-50 text-xs font-black py-2 rounded-lg">Reject</button>
                          </div>
                       </div>
                    </div>
                  ))}
                  {pendingVerifications.length === 0 && (
                    <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-stone-100 col-span-full">
                        <FileBadge className="w-20 h-20 text-stone-100 mx-auto mb-4" />
                        <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">No verification applications found!</p>
                    </div>
                  )}
                </div>
               )}

               {activeTab === 'support' && (
                 <div className="grid grid-cols-1 gap-4">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-6 rounded-xl border border-stone-200 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                         <h4 className="font-bold text-lg text-stone-900">{ticket.subject}</h4>
                         <span className="text-xs font-black text-amber-600 uppercase px-2 py-1 bg-amber-50 rounded">{ticket.status}</span>
                      </div>
                      <p className="text-stone-800 bg-stone-50 p-4 rounded-lg mb-4">{ticket.message}</p>
                      <button onClick={() => updateSupportStatus(ticket.id, 'RESOLVED')} className="bg-stone-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase">Mark Resolved</button>
                    </div>
                   ))}
                </div>
               )}

               {activeTab === 'promotions' && (
                 <div className="grid grid-cols-1 gap-2">
                   {promotionRequests.map((req) => (
                      <div key={req.id} className="bg-white p-4 rounded-xl border border-stone-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={req.paymentProofImage} className="w-10 h-12 object-cover rounded shadow-sm" referrerPolicy="no-referrer" />
                          <div>
                            <div className="text-xs font-black text-stone-900 italic uppercase">{req.planName}</div>
                            <div className="text-[10px] text-stone-400 font-bold uppercase">{req.type}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {req.status === 'PENDING' ? (
                            <>
                              <button onClick={() => approvePromotion(req)} className="bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase">Approve</button>
                              <button onClick={() => rejectPromotion(req)} className="bg-stone-100 text-stone-400 px-3 py-1 rounded text-[10px] font-black uppercase">Reject</button>
                            </>
                          ) : (
                            <span className="text-[10px] font-black text-stone-300 uppercase">{req.status}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {promotionRequests.length === 0 && (
                      <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-stone-100">
                          <Zap className="w-20 h-20 text-stone-100 mx-auto mb-4" />
                          <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">No promotion requests pending.</p>
                      </div>
                    )}
                 </div>
               )}
            </div>
          )}
        </main>
      </div>

      {selectedListingDetail && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedListingDetail(null)}
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] border-4 border-stone-100 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-white relative z-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-stone-900 shadow-lg shadow-amber-500/20">
                     <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-stone-900 uppercase italic tracking-tighter">Listing Intelligence</h3>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Complete Seller Disclosure</p>
                  </div>
               </div>
               <button onClick={() => setSelectedListingDetail(null)} className="p-3 bg-stone-50 rounded-2xl hover:bg-stone-900 hover:text-white transition-all">
                  <X className="w-6 h-6" />
               </button>
            </div>

            {/* Modal Content */}
            <div className="flex-grow overflow-y-auto p-10 custom-scrollbar bg-stone-50/50">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Visual Cluster */}
                  <div className="space-y-6">
                     <div className="aspect-[4/3] rounded-[2.5rem] bg-stone-200 overflow-hidden border-4 border-white shadow-xl">
                        <img 
                          src={selectedListingDetail.images[0]} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                     </div>
                     {selectedListingDetail.images.length > 1 && (
                       <div className="grid grid-cols-4 gap-3">
                          {selectedListingDetail.images.slice(1).map((img, i) => (
                            <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                               <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                       </div>
                     )}
                  </div>

                  {/* Operational Data Cluster */}
                  <div className="space-y-8">
                     <div className="space-y-2">
                        <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Title & Identity</div>
                        <h2 className="text-2xl font-black text-stone-900 uppercase italic tracking-tighter leading-tight italic">
                           {selectedListingDetail.title}
                        </h2>
                        <div className="flex items-center gap-3 mt-4">
                           <span className="px-4 py-1.5 bg-stone-900 text-white rounded-full text-[11px] font-black italic">
                              Rs. {selectedListingDetail.price.toLocaleString()}
                           </span>
                           <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[11px] font-black uppercase">
                              {selectedListingDetail.status}
                           </span>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                           <div className="text-[9px] font-black text-stone-400 uppercase mb-1">Merchant</div>
                           <div className="font-bold text-stone-900 text-sm truncate">{selectedListingDetail.sellerName}</div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                           <div className="text-[9px] font-black text-stone-400 uppercase mb-1">Location</div>
                           <div className="font-bold text-stone-900 text-sm">{selectedListingDetail.city}</div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                           <div className="text-[9px] font-black text-stone-400 uppercase mb-1">Contact</div>
                           <div className="font-bold text-stone-900 text-sm">{selectedListingDetail.phoneNumber}</div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-stone-100 shadow-sm">
                           <div className="text-[9px] font-black text-stone-400 uppercase mb-1">Category</div>
                           <div className="font-bold text-stone-900 text-sm italic">{selectedListingDetail.category}</div>
                        </div>
                     </div>

                     <div>
                        <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Seller Narrative</div>
                        <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-inner text-stone-600 text-sm leading-relaxed font-medium">
                           {selectedListingDetail.description}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-8 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
               <div className="flex items-center gap-8">
                  <div className="text-[10px] font-black text-stone-400 uppercase">
                     Listing ID: <span className="text-stone-900">{selectedListingDetail.id}</span>
                  </div>
                  <div className="text-[10px] font-black text-stone-400 uppercase">
                     Created: <span className="text-stone-900">{formatSafeDate(selectedListingDetail.createdAt)}</span>
                  </div>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      if (window.confirm("Remove this listing FOREVER? This action cannot be undone and will notify the seller.")) {
                        deleteListing(selectedListingDetail!.id);
                        setSelectedListingDetail(null);
                      }
                    }}
                    className="flex items-center gap-3 px-8 py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-red-500/20 italic group"
                  >
                     <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                     Delete Listing Forever
                  </button>
               </div>
            </div>
          </motion.div>
        </div>
      )}

      {isViewingUser && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             onClick={() => setIsViewingUser(false)}
             className="absolute inset-0 bg-stone-900/60 backdrop-blur-xl"
           />
           <motion.div 
             initial={{ scale: 0.95, opacity: 0, y: 20 }}
             animate={{ scale: 1, opacity: 1, y: 0 }}
             className="relative w-full max-w-5xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border-4 border-stone-100"
           >
              {/* Header */}
              <div className="p-10 border-b border-stone-100 flex items-center justify-between bg-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                 <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 rounded-3xl bg-stone-900 p-1 shadow-2xl">
                       <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center bg-stone-800 text-white font-black text-3xl italic uppercase border-2 border-stone-700/50">
                          {selectedUser.photoURL ? <img src={selectedUser.photoURL} alt="" className="w-full h-full object-cover" /> : selectedUser.name?.charAt(0)}
                       </div>
                    </div>
                    <div>
                       <div className="flex items-center gap-3">
                          <h2 className="text-3xl font-black text-stone-900 italic uppercase tracking-tighter">
                            {selectedUser.name || 'Anonymous User'}
                          </h2>
                          {selectedUser.isBlocked && (
                             <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-red-600 bg-red-600 text-white shadow-xl shadow-red-500/20 animate-pulse">
                                <ShieldAlert className="w-3.5 h-3.5" /> 
                                RESTRICTED
                             </div>
                          )}
                          {selectedUser.isVerified && (
                             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current bg-white shadow-sm ${selectedUser.verifiedBadgeType === 'GOLDEN' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                <ShieldCheck className="w-3.5 h-3.5" /> 
                                {selectedUser.verifiedBadgeType === 'GOLDEN' ? 'Premium Seller' : 'Verified Merchant'}
                             </div>
                          )}
                       </div>
                       <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[11px] font-black text-stone-400 uppercase tracking-[0.2em]">{selectedUser.email}</p>
                          <div className="w-1.5 h-1.5 bg-stone-200 rounded-full" />
                          <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">UID: {selectedUser.id.substring(0, 8)}...</p>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setIsViewingUser(false)} className="p-3 bg-stone-50 rounded-2xl hover:bg-stone-900 hover:text-white transition-all shadow-sm border border-stone-100 active:scale-90 group relative z-10">
                    <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                 </button>
              </div>

              {/* Content */}
              <div className="flex-grow overflow-y-auto p-10 custom-scrollbar bg-stone-50/50">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-10">
                       {/* Identity Matrix */}
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-6 bg-white rounded-[2rem] border border-stone-100 shadow-sm group hover:border-amber-200 transition-colors">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-amber-50 text-amber-500 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors"><Clock className="w-4 h-4" /></div>
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Registration Date</span>
                             </div>
                             <div className="font-black text-stone-900 text-xl italic tracking-tighter">
                                {formatSafeDate(selectedUser.createdAt)}
                             </div>
                             <div className="text-[10px] font-bold text-stone-400 mt-1">UTC TIME: {formatSafeTime(selectedUser.createdAt)}</div>
                          </div>

                          <div className="p-6 bg-white rounded-[2rem] border border-stone-100 shadow-sm group hover:border-amber-200 transition-colors">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-stone-50 text-stone-400 rounded-xl group-hover:bg-stone-900 group-hover:text-white transition-colors"><MapPin className="w-4 h-4" /></div>
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Operational Core</span>
                             </div>
                             <div className="font-black text-stone-900 text-xl italic tracking-tighter">
                                {selectedUser.city || 'GLOBAL MARKET'}
                             </div>
                             <div className="text-[10px] font-bold text-stone-400 mt-1">PAKISTAN / ASIA</div>
                          </div>

                          <div className="p-6 bg-white rounded-[2rem] border border-stone-100 shadow-sm group hover:border-amber-200 transition-colors">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-stone-50 text-stone-400 rounded-xl group-hover:bg-stone-900 group-hover:text-white transition-colors"><Phone className="w-4 h-4" /></div>
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Verified Contact</span>
                             </div>
                             <div className="font-black text-stone-900 text-xl italic tracking-tighter">
                                {selectedUser.phoneNumber || 'N/A SYSTEM'}
                             </div>
                             <div className="text-[10px] font-bold text-stone-400 mt-1">TELECOM VERIFIED</div>
                          </div>

                          <div className="p-6 bg-white rounded-[2rem] border border-stone-100 shadow-sm group hover:border-amber-200 transition-colors">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-stone-50 text-stone-400 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors"><FileBadge className="w-4 h-4" /></div>
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Badge Tier</span>
                             </div>
                             <div className="font-black text-stone-900 text-xl italic tracking-tighter uppercase">
                                {selectedUser.verifiedBadgeType || 'BASIC'}
                             </div>
                             <div className="text-[10px] font-bold text-stone-400 mt-1">MEMBERSHIP LEVEL</div>
                          </div>
                       </div>


                    </div>

                    {/* Command Console */}
                    <div className="lg:col-span-4 space-y-6">
                       <div className="p-8 bg-stone-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-stone-900 to-red-500" />
                          <h3 className="font-black uppercase tracking-widest text-[10px] mb-6 flex items-center justify-between">
                             Management Console
                             <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
                          </h3>
                          
                          <div className="space-y-3">
                             {selectedUser.isBlocked ? (
                               <button 
                                 onClick={() => unblockUser(selectedUser.id, selectedUser.name || 'User')}
                                 disabled={processingUnblockId === selectedUser.id}
                                 className="w-full flex items-center justify-between px-6 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 disabled:bg-stone-700 disabled:opacity-50"
                               >
                                 <span className="flex items-center gap-2">
                                   {processingUnblockId === selectedUser.id ? (
                                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                   ) : (
                                      <UserCheck className="w-4 h-4" />
                                   )}
                                   {processingUnblockId === selectedUser.id ? 'Restoring Access...' : 'Unblock Account'}
                                 </span>
                                 <ArrowRight className="w-3 h-3" />
                               </button>
                             ) : (
                               <button 
                                 onClick={() => setShowBlockModal(true)}
                                 className="w-full flex items-center justify-between px-6 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-red-500/20"
                               >
                                 <span className="flex items-center gap-2"><UserX className="w-4 h-4" /> Block Account</span>
                                 <ArrowRight className="w-3 h-3" />
                               </button>
                             )}
                             
                             <button 
                               onClick={() => sendWarning(selectedUser.id, selectedUser.name || 'User')}
                               className="w-full flex items-center justify-between px-6 py-4 bg-stone-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all border border-stone-700 active:scale-95 translate-z-0"
                             >
                                <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Issue Warning</span>
                                <Speaker className="w-3 h-3 opacity-30" />
                             </button>
                          </div>
                       </div>

                       {/* Status Indicators */}
                       <div className="space-y-4">
                          {selectedUser.isBlocked && (
                            <div className="p-6 bg-red-50 rounded-[2.5rem] border border-red-100 shadow-sm relative group overflow-hidden">
                               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform"><UserX className="w-12 h-12 text-red-900" /></div>
                               <h3 className="font-black text-red-600 uppercase tracking-[0.2em] text-[9px] mb-4">Incident Log</h3>
                               <div className="space-y-4">
                                  <div>
                                     <div className="text-[9px] font-black text-red-400 uppercase mb-1 flex items-center gap-1.5"><ShieldAlert className="w-3 h-3" /> Violation Reason</div>
                                     <p className="text-stone-800 font-bold text-xs italic bg-white p-3 rounded-xl border border-red-100/50">"{selectedUser.blockReason}"</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-2">
                                     <div className="text-[8px] font-black text-stone-400 uppercase">Handler: <span className="text-red-900">{selectedUser.blockedBy?.substring(0, 5)}...</span></div>
                                     <div className="text-[8px] font-black text-stone-400 uppercase text-right">STAMP: {formatSafeDate(selectedUser.blockedAt)}</div>
                                  </div>
                               </div>
                            </div>
                          )}

                          <div className="p-8 bg-white rounded-[2.5rem] border border-stone-100 shadow-sm">
                             <div className="flex items-center justify-between mb-6">
                                <h3 className="font-black text-stone-900 uppercase tracking-widest text-[9px]">Platform Privileges</h3>
                                <BadgeCheck className="w-4 h-4 text-emerald-500" />
                             </div>
                             
                             <div className="space-y-4">
                                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100">
                                   <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${selectedUser.isVerified ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                                      <span className="text-[10px] font-black text-stone-600 uppercase tracking-widest text-xs">Official Badge</span>
                                   </div>
                                   {selectedUser.isVerified ? (
                                     <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">ACTIVE</span>
                                   ) : (
                                     <span className="text-[9px] font-black text-stone-400 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">NONE</span>
                                   )}
                                </div>

                                <button 
                                  onClick={() => toggleUserVerification(selectedUser.id, selectedUser.isVerified)}
                                  className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 border-2 ${
                                    selectedUser.isVerified 
                                      ? 'bg-white border-red-100 text-red-500 hover:bg-red-500 hover:text-white' 
                                      : 'bg-stone-900 border-stone-900 text-white hover:bg-emerald-500 hover:border-emerald-500'
                                  }`}
                                >
                                   {selectedUser.isVerified ? 'Revoke Merchant Status' : 'Grant Verified Access'}
                                </button>
                             </div>
                          </div>
                       </div>

                       {/* Marketplace Intelligence - Moved to Command Column */}
                       <div className="space-y-4 pt-6 mt-6 border-t border-stone-200">
                          <h3 className="font-black text-stone-900 uppercase tracking-[0.2em] text-[9px] flex items-center gap-2">
                             <Package className="w-3.5 h-3.5 text-amber-500" />
                             Live Listings ({userListings.length})
                          </h3>
                          
                          <div className="space-y-2">
                             {userListings.map(listing => (
                               <div key={listing.id} className="p-3 bg-white border border-stone-100 rounded-2xl flex items-center gap-3 shadow-sm hover:border-amber-200 transition-all group">
                                  <img src={listing.images[0]} className="w-10 h-10 object-cover rounded-xl border border-stone-50" referrerPolicy="no-referrer" />
                                  <div className="flex-grow min-w-0">
                                     <div className="text-[10px] font-black text-stone-900 truncate uppercase italic tracking-tighter">{listing.title}</div>
                                     <div className="flex items-center gap-2 mt-0.5">
                                        <div className="text-[9px] text-amber-600 font-black">Rs. {listing.price.toLocaleString()}</div>
                                        <span className={`text-[7px] font-black px-1 rounded italic uppercase ${listing.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                           {listing.status}
                                        </span>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-100 transition-all">
                                    <a 
                                      href={`/listing/${listing.id}`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="p-1.5 bg-stone-50 rounded-lg text-stone-600 hover:bg-stone-900 hover:text-white transition-all shadow-sm border border-stone-100"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </a>
                                    <button 
                                      onClick={() => deleteListing(listing.id)}
                                      className="p-1.5 bg-red-50 rounded-lg text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                                      title="Delete Listing Forever"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                               </div>
                             ))}
                             {userListings.length === 0 && (
                               <div className="py-10 text-center bg-white rounded-3xl border border-dashed border-stone-100">
                                  <p className="text-[9px] font-black text-stone-300 uppercase tracking-widest">Empty Inventory</p>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-white border-t border-stone-100 flex justify-between items-center bg-stone-50/30">
                 <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    Mandi Security Protocol v4.0.2 / Encrypted Admin View
                 </div>
                 <button onClick={() => setIsViewingUser(false)} className="px-10 py-4 bg-stone-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all shadow-2xl active:scale-95 italic">
                    Dismiss Terminal
                 </button>
              </div>
           </motion.div>
        </div>
      )}

      {showBlockModal && selectedUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             onClick={() => !isBlockingInProgress && setShowBlockModal(false)}
             className="absolute inset-0 bg-red-950/40 backdrop-blur-md"
           />
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 border-4 border-red-100 overflow-hidden"
           >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-50 rounded-full blur-2xl" />
              
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                    <UserX className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="font-black text-stone-900 uppercase italic tracking-tighter text-xl">Block Account</h3>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{selectedUser.name}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 block">Violation Reason</label>
                    <select 
                      value={blockActionReason}
                      onChange={(e) => setBlockActionReason(e.target.value)}
                      className="w-full bg-stone-50 border-none rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-red-500/20"
                    >
                       <option value="Violation of community trading policies.">Policy Violation</option>
                       <option value="Fraudulent activity or scam reported.">Fraud/Scam</option>
                       <option value="Inappropriate behavior or harassment.">Harassment</option>
                       <option value="Repeated spamming and fake listings.">Spam/Fake Listings</option>
                       <option value="Other (Administrative Decision)">Other</option>
                    </select>
                 </div>

                 <div className="bg-red-50 p-4 rounded-xl border border-red-100 italic font-medium text-red-700 text-[11px]">
                    ⚠️ Warning: This will restrict logging in, messaging, and will hide all active listings for this user immediately.
                 </div>

                 <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowBlockModal(false)}
                      disabled={isBlockingInProgress}
                      className="flex-1 px-6 py-4 bg-stone-100 text-stone-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 transition-all disabled:opacity-50"
                    >
                       Cancel
                    </button>
                    <button 
                      onClick={() => blockUser(selectedUser.id, selectedUser.name || 'User')}
                      disabled={isBlockingInProgress}
                      className="flex-2 px-6 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                       {isBlockingInProgress ? (
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       ) : <Trash2 className="w-4 h-4" />}
                       {isBlockingInProgress ? 'Blocking...' : 'Block Account'}
                    </button>
                 </div>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );

  function SidebarLink({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) {
     return (
        <button
          onClick={() => setActiveTab(id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-xs border border-transparent ${
            activeTab === id 
              ? 'bg-amber-500 text-stone-900 shadow-xl shadow-amber-500/10 italic' 
              : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
          }`}
        >
          <Icon className={`w-4 h-4 ${activeTab === id ? 'text-stone-900' : 'text-stone-600'}`} />
          {label}
        </button>
     );
  }
}
