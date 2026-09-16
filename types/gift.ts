export type GiftPriority = "alta" | "media" | "baixa";

export type Gift = {
  id: string;
  category: string;
  name: string;
  price: number | null;
  url: string | null;
  note: string | null;
  priority: GiftPriority;
  image: string | null;
};

export type PhotoGalleryItem = {
  src: string;
  alt: string;
  label: string;
  featured: boolean;
};

export type SiteConfig = {
  eventTitle: string;
  coupleNames: string;
  brandLabel: string;
  eventDate: string | null;
  eventTime: string;
  eventLocation: string;
  welcomeMessage: string;
  welcomeTitle: string;
  welcomeDescription: string;
  heroEyebrow: string;
  heroImage: string;
  heroImageAlt: string;
  couplePhoto: string;
  couplePhotoAlt: string;
  photoGallery: PhotoGalleryItem[];
  deliveryAddress: string;
  giftSheetCsvUrl: string;
  giftSectionEyebrow: string;
  giftSectionTitle: string;
  giftSectionDescription: string;
  pixSectionEyebrow: string;
  pixSectionTitle: string;
  pixSectionDescription: string;
  footerMessage: string;
  whatsappUrl: string;
  instagramUrl: string;
  giftsEnabled: boolean;
  pixEnabled: boolean;
  projectPageEnabled: boolean;
  photosPageEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  suggestedPixValues: number[];
  theme: {
    background: string;
    surface: string;
    primary: string;
    primaryDark: string;
    pixBackground: string;
    accent: string;
    text: string;
    mutedText: string;
  };
};

export type PixAdminConfig = {
  enabled: boolean;
  receiver: string;
  city: string;
  hasKey: boolean;
};

export type SiteEditorIssue = {
  field: string;
  message: string;
  level: "error" | "warning";
};

export type SiteConfigVersionSummary = {
  id: number;
  createdAt: string;
  createdByEmail: string;
};
