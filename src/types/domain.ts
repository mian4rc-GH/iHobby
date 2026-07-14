export type Role = "VISITOR" | "BUYER" | "SELLER" | "ADMIN";

export type ListingType = "FIXED_PRICE" | "AUCTION" | "OFFER";
export type ListingStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "SOLD" | "REJECTED" | "ARCHIVED";
export type BidStatus = "ACTIVE" | "OUTBID" | "WINNING" | "RETRACTED" | "EXPIRED";
export type OfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN";
export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

export interface Actor {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  role: Role;
  avatarInitials: string;
  isAuthenticated: boolean;
  authProvider: "visitor" | "demo" | "local" | "clerk";
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  parentSlug?: string;
  description: string;
  attributes: {
    required: string[];
    optional: string[];
  };
}

export interface ListingMedia {
  url: string;
  alt: string;
}

export interface ListingSeller {
  id: string;
  displayName: string;
  handle: string;
  rating: number | null;
  reviewCount: number;
  responseTime: string;
  location: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  hobbyName: string;
  condition: string;
  listingType: ListingType;
  status: ListingStatus;
  priceCents: number;
  reserveCents?: number;
  buyNowCents?: number;
  currency: string;
  location: string;
  endsAt?: string;
  publishedAt: string;
  seller: ListingSeller;
  media: ListingMedia[];
  attributes: Record<string, string | number | boolean>;
  stats: {
    bids: number;
    watchers: number;
    offers: number;
  };
}

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  amountCents: number;
  status: BidStatus;
  createdAt: string;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  amountCents: number;
  status: OfferStatus;
  message?: string;
  createdAt: string;
  listingTitle?: string;
  listingSlug?: string;
  sellerId?: string;
  sellerName?: string;
  buyerName?: string;
}

export interface Report {
  id: string;
  listingId: string;
  listingTitle: string;
  reason: string;
  status: ReportStatus;
  submittedBy: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  subject: string;
  listingTitle?: string;
  otherParty: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  body: string;
  createdAt: string;
  sentAt: string;
  isMine: boolean;
}

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
  tone: "good" | "warn" | "bad" | "neutral";
}

export interface SellerApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  businessName: string;
  categoryFocus: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
}
