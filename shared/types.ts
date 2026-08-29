export type SessionFormat = "video" | "audio" | "chat" | "async" | "in_person";
export type ReadingCategory =
  | "guidance_consultation"
  | "ancestral_cleansing";

export interface CustomIntakeField {
  field: string;
  label: string;
  placeholder?: string;
}

export interface Reading {
  id: number;
  name: string;
  category: ReadingCategory;
  price: number;
  originalPrice?: number;
  description: string;
  formats: SessionFormat[];
  isAdult: boolean;
  isFixed: boolean;
  customIntake?: CustomIntakeField[];
}

export interface Product {
  id: number;
  name: string;
  category: "incense" | "crystals" | "jewellery" | "oils";
  price: number;
  description: string;
}

export interface Review {
  id: number;
  clientName: string;
  rating: number;
  comment: string;
  readingName?: string;
  date: string;
}

const D: SessionFormat[] = ["video", "audio", "chat", "async"];

export const READINGS: Reading[] = [
  // Guidance & Consultation
  { id: 1, name: "Matare/Consultation", category: "guidance_consultation", price: 20, originalPrice: 25, description: "Kukurukura namuchembere — a general consultation to discuss whatever is on your mind with VaShava.", formats: D, isAdult: false, isFixed: false },
  { id: 2, name: "Yes/No Questions", category: "guidance_consultation", price: 10, originalPrice: 15, description: "Mibvunzo inoda Hongu kana Kwete — quick, direct answers to yes-or-no questions.", formats: D, isAdult: false, isFixed: false },
  { id: 3, name: "Career Guidance", category: "guidance_consultation", price: 20, originalPrice: 25, description: "Guidance on how to earn a living and navigate your career path.", formats: D, isAdult: false, isFixed: false },
  { id: 4, name: "Dreams/Makope Interpretation", category: "guidance_consultation", price: 10, originalPrice: 15, description: "Kutsanangurirwa makope nezvaanoreva — understand what your dreams mean and the messages behind them.", formats: D, isAdult: false, isFixed: false, customIntake: [{ field: "dream", label: "Describe your dream in as much detail as possible" }] },

  // Ancestral & Cleansing
  { id: 5, name: "Kunatira neKurutsiswa", category: "ancestral_cleansing", price: 30, originalPrice: 35, description: "Kunatiriswa kana kuritsiswa namuchembere — traditional cleansing and spiritual help from the elder.", formats: D, isAdult: false, isFixed: false },
  { id: 6, name: "Kusimudza Muchembere", category: "ancestral_cleansing", price: 50, originalPrice: 55, description: "Kusimudza muchembere kuuya kwake — invoking and raising the ancestral spirit to come forward.", formats: D, isAdult: false, isFixed: false },
  { id: 7, name: "Kutsikira Masango", category: "ancestral_cleansing", price: 50, originalPrice: 55, description: "Kuenda namuchembere kumasango — an in-person journey with VaShava to the forest for sacred ritual work.", formats: ["in_person"], isAdult: false, isFixed: true },
  { id: 8, name: "Cleansing/Chenura", category: "ancestral_cleansing", price: 30, originalPrice: 35, description: "Cleansing — kuchenurwa namuchembere — a full spiritual cleansing performed by VaShava.", formats: D, isAdult: false, isFixed: false },
];

export const PRODUCTS: Product[] = [
  { id: 1, name: "White Sage Sticks", category: "incense", price: 5, description: "Traditional cleansing sage for clearing negative energies from spaces and auras." },
  { id: 2, name: "Blue Sage (Grandmother Sage)", category: "incense", price: 5, description: "Gentle grandmother sage for healing, wisdom, and positive manifestation." },
  { id: 3, name: "Vanilla Sticks", category: "incense", price: 5, description: "Sweet vanilla incense for love, comfort, and attracting positive energy." },
  { id: 4, name: "Cinnamon Sandal", category: "incense", price: 5, description: "Warm cinnamon sandalwood blend for protection, prosperity, and spiritual focus." },
  { id: 5, name: "Pure Loban / Frankincense", category: "incense", price: 10, description: "Sacred frankincense resin for deep spiritual connection and ancestral communication." },
  { id: 6, name: "Incense Holder", category: "incense", price: 8, description: "Hand-crafted ceramic holder for safe and elegant incense burning." },
  { id: 7, name: "Moss Agate Bracelet", category: "crystals", price: 10, description: "Nature's stone of new beginnings — promotes growth, abundance, and grounding." },
  { id: 8, name: "Moonstone Bracelet", category: "crystals", price: 10, description: "The stone of the goddess — enhances intuition, fertility, and emotional balance." },
  { id: 9, name: "Green Aventurine", category: "crystals", price: 15, description: "The stone of opportunity — attracts luck, prosperity, and heart healing." },
  { id: 10, name: "Lapis Lazuli Bracelet", category: "crystals", price: 20, description: "Ancient stone of truth and wisdom — activates the third eye and spiritual sight." },
  { id: 11, name: "Malachite Bracelet", category: "crystals", price: 12, description: "A powerful transformation stone that absorbs negative energies and stimulates growth." },
  { id: 12, name: "Custom Crystal Bracelet", category: "crystals", price: 20, description: "Personally curated bracelet based on your specific spiritual intentions and needs." },
  { id: 13, name: "Sea Shell Stone Bracelet", category: "jewellery", price: 20, description: "Ocean-blessed bracelet combining sea shells and healing stones for calm and flow." },
  { id: 14, name: "Evil Eye Waistbeads", category: "jewellery", price: 15, description: "Traditional African waist beads with evil eye protection for spiritual shielding." },
  { id: 15, name: "Nazar / Evil Eye Bracelet", category: "jewellery", price: 10, description: "Classic blue evil eye charm bracelet for protection against envy and negative intent." },
  { id: 16, name: "Road Opener Oil", category: "oils", price: 15, description: "A powerful anointing oil to clear obstacles, open doors, and invite new opportunities." },
  { id: 17, name: "Main Character Domination Oil", category: "oils", price: 30, description: "Own the room. Amplifies your personal power, aura, and magnetic presence." },
  { id: 18, name: "Honeypot Yoni Oil", category: "oils", price: 10, description: "Sacred feminine anointing oil for self-love, sensuality, and divine feminine connection." },
];

export const SEEDED_REVIEWS: Review[] = [
  { id: 1, clientName: "Tamara N.", rating: 5, comment: "VaShava connected with my grandmother immediately. The details she brought through were specific and deeply comforting. I'm still in awe. This was everything I needed and more.", readingName: "Connecting with a Passed Loved One", date: "2026-05-14" },
  { id: 2, clientName: "Marcus O.", rating: 5, comment: "My General Reading was incredibly accurate about the career crossroads I was at. The guidance was practical and spiritually grounded. I've already booked my second session.", readingName: "General Reading", date: "2026-05-02" },
  { id: 3, clientName: "Patience K.", rating: 5, comment: "The Are You Compatible reading gave me clarity I had been searching for for months. VaShava doesn't just read cards — she truly sees. Highly recommend to anyone questioning a relationship.", readingName: "Are You Compatible?", date: "2026-04-20" },
  { id: 4, clientName: "Tendai M.", rating: 5, comment: "I was sceptical about remote ancestral work but the Hakata reading blew my mind. Things she said about my late father were things she could not have known. A real and sacred gift.", readingName: "Hakata (Bone Throwing / Osteomancy)", date: "2026-04-08" },
  { id: 5, clientName: "Aisha D.", rating: 4, comment: "The Shadow Work Spread was intense but so needed. She held a beautiful, safe space for very deep material. I have been journalling non-stop since. Truly transformative work.", readingName: "Shadow Work Spread", date: "2026-03-25" },
  { id: 6, clientName: "Chidi A.", rating: 5, comment: "Booked the Seeking Prosperity reading and within three weeks the exact blockages she identified had shifted. I got the job. I got the flat. VaShava is the real deal — full stop.", readingName: "Seeking Prosperity", date: "2026-03-10" },
  { id: 7, clientName: "Rudo M.", rating: 5, comment: "As a Zimbabwean in the diaspora, finding someone who understands Shona tradition AND has this level of gift is rare. VaShava is exceptional. The ZINATHA verification gave me confidence to book.", readingName: "Ancestor Reading", date: "2026-02-18" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  guidance_consultation: "Guidance & Consultation",
  ancestral_cleansing: "Ancestral & Cleansing",
};

export const FORMAT_LABELS: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  chat: "Live Chat",
  async: "Async",
  in_person: "In-Person",
};
