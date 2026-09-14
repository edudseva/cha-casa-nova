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

export type SiteConfig = {
  eventTitle: string;
  coupleNames: string;
  brandLabel: string;
  eventDate: string | null;
  welcomeMessage: string;
  heroEyebrow: string;
  heroImage: string;
  heroImageAlt: string;
  couplePhoto: string;
  couplePhotoAlt: string;
  deliveryAddress: string;
  giftSheetCsvUrl: string;
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
