export interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  condition?: string;
  price: number;
  quantity: number;
  shippingCharges: number;
  images: string[];
  sellerName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  address?: string;
  city: string;
  locationArea?: string;
  isFeatured: boolean;
  isBoosted: boolean;
  featuredUntil?: any;
  boostedUntil?: any;
  promotionStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  promotionType?: 'FEATURED' | 'BOOSTED' | 'PREMIUM_VERIFIED';
  promotionProofImage?: string;
  status: 'LIVE' | 'PENDING' | 'REJECTED' | 'SOLD' | 'BOOKED';
  bookedAt?: any;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
  views?: number;
  saves?: number;
  shares?: number;
}

export interface UserProfile {
  id: string;
  isVerified: boolean;
  isPremiumVerified?: boolean;
  verifiedUntil?: any;
  trustRanking?: number;
  sellerScore?: number;
  totalViews?: number;
  totalSaves?: number;
  totalShares?: number;
  name?: string;
  email?: string;
  phoneNumber?: string;
  city?: string;
  address?: string;
  photoURL?: string;
  createdAt: any;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isAuthorizedAdmin?: boolean;
  isBlocked?: boolean;
  accountStatus?: 'active' | 'blocked' | 'deleted';
  blockedAt?: any;
  blockedBy?: string;
  blockReason?: string;
  adminNotes?: string;
  unblockedAt?: any;
  unblockedBy?: string;
  appealMessage?: string;
  appealStatus?: 'NONE' | 'PENDING' | 'RESOLVED';
  verificationStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  verifiedBadgeType?: 'BASIC' | 'GOLDEN' | 'PREMIUM';
  referralCode: string;
  referralCount: number;
  referredBy?: string | null;
  premiumExpiresAt?: any;
  warningsCount?: number;
}

export interface ProfileReport {
  id: string;
  profileId: string;
  profileName?: string;
  reporterId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: any;
}

export interface Order {
  id?: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  shippingCharges: number;
  totalAmount: number;
  status: 'PENDING' | 'ACCEPTED' | 'BOOKED' | 'SHIPPED' | 'PAID' | 'SOLD' | 'REJECTED' | 'EXPIRED';
  buyerName?: string;
  buyerAddress?: string;
  buyerContact?: string;
  createdAt: any;
  updatedAt: any;
  expiresAt?: any;
}

export interface Chat {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessage: string;
  updatedAt: any;
  isBlocked?: boolean;
  blockedBy?: string;
  isArchivedBuyer?: boolean;
  isArchivedSeller?: boolean;
  isDeletedBuyer?: boolean;
  isDeletedSeller?: boolean;
  unreadCountBuyer?: number;
  unreadCountSeller?: number;
  isMutedBuyer?: boolean;
  isMutedSeller?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  isOffer: boolean;
  offerAmount?: number;
  createdAt: any;
}

export interface Report {
  id: string;
  listingId: string;
  listingTitle?: string;
  listingImage?: string;
  listingPrice?: number;
  ownerId?: string;
  reporterId: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: any;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: any;
}

export interface PromotionRequest {
  id: string;
  userId: string;
  targetId: string; // listingId or userId for profile badge
  type: 'FEATURED' | 'BOOST' | 'VERIFIED';
  planName: string; // e.g., "7 Days", "3 Months"
  amount: number;
  paymentProofImage: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  durationDays: number;
  createdAt: any;
  updatedAt: any;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  updatedAt: any;
}

export interface SupportTicket {
  id: string;
  userId: string;
  name: string;
  email: string;
  subject: string;
  category: 'COMPLAINT' | 'SUGGESTION' | 'QUERY' | 'FEEDBACK' | 'APPEAL';
  message: string;
  attachmentUrl?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: any;
  updatedAt: any;
}

export interface AuthorizedAdminEmail {
  id: string;
  email: string;
  addedAt: any;
  addedBy: string;
}

