export type SessionFormat = "video" | "audio" | "chat" | "async" | "in_person";
export type ReadingCategory =
  | "love_relationships"
  | "ancestors_spirit"
  | "healing_wellbeing"
  | "spells_protection"
  | "guidance_future"
  | "live_in_person";

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
  // Love & Relationships
  { id: 1, name: "Purpose of a Relationship", category: "love_relationships", price: 80, description: "Uncover the deeper spiritual purpose behind a relationship in your life and what it is here to teach your soul.", formats: D, isAdult: false, isFixed: false },
  { id: 2, name: "The Friendship Spread", category: "love_relationships", price: 60, description: "Gain clarity on a friendship — its strengths, hidden tensions, and the spiritual bond you share.", formats: D, isAdult: false, isFixed: false },
  { id: 3, name: "Are You Compatible?", category: "love_relationships", price: 70, description: "A deep compatibility assessment across emotional, spiritual, and energetic dimensions for two people.", formats: D, isAdult: false, isFixed: false, customIntake: [{ field: "names", label: "Both names and dates of birth" }] },
  { id: 4, name: "Love Thermometer Spread", category: "love_relationships", price: 40, description: "Measure the current temperature of love in a specific connection and where it is heading.", formats: D, isAdult: false, isFixed: false },
  { id: 5, name: "Torn Between 2 Lovers", category: "love_relationships", price: 80, description: "Navigate the emotional and spiritual complexity of being drawn to two different people.", formats: D, isAdult: false, isFixed: false },
  { id: 6, name: "Easy Relationship Spread", category: "love_relationships", price: 30, description: "A concise, accessible reading on the current energy of a relationship in your life.", formats: D, isAdult: false, isFixed: false },
  { id: 7, name: "Couples Spread", category: "love_relationships", price: 30, description: "A shared reading exploring the joint energy, blockages, and future of a couple.", formats: D, isAdult: false, isFixed: false },
  { id: 8, name: "Toxic Relationship", category: "love_relationships", price: 50, description: "Identify toxic patterns and receive ancestral guidance on healing or releasing a difficult connection.", formats: D, isAdult: false, isFixed: false },
  { id: 9, name: "Relationship Evaluation", category: "love_relationships", price: 60, description: "A thorough evaluation of where a relationship stands spiritually and where it could go.", formats: D, isAdult: false, isFixed: false },
  { id: 10, name: "Family Spread", category: "love_relationships", price: 60, description: "Explore the spiritual dynamics, ancestral tensions, and blessings within your family unit.", formats: D, isAdult: false, isFixed: false },
  { id: 11, name: "Red Hot Intimacy", category: "love_relationships", price: 120, description: "A frank, spiritual exploration of passion, intimacy, and sexual energy in a connection. Adults only.", formats: D, isAdult: true, isFixed: false },
  { id: 12, name: "Adult Spread", category: "love_relationships", price: 30, description: "An adult-only reading on mature themes in love and intimacy. 18+ only.", formats: D, isAdult: true, isFixed: false },
  { id: 13, name: "Before Getting A Couple Reading", category: "love_relationships", price: 150, description: "A prerequisite deep-dive 60-minute session preparing both partners spiritually for a joint reading.", formats: D, isAdult: false, isFixed: true },

  // Ancestors & Spirit
  { id: 14, name: "Ancestor Reading", category: "ancestors_spirit", price: 70, description: "Connect with ancestral energies and receive their wisdom, warnings, and blessings for your life path.", formats: D, isAdult: false, isFixed: false, customIntake: [{ field: "ancestor", label: "Ancestor to connect with (name if known)" }] },
  { id: 15, name: "Connecting with a Passed Loved One", category: "ancestors_spirit", price: 50, description: "A sensitive mediumship reading to bridge the gap between you and a departed loved one.", formats: D, isAdult: false, isFixed: false, customIntake: [{ field: "lovedOne", label: "Passed loved one's name and your relationship to them" }] },
  { id: 16, name: "Hakata (Bone Throwing / Osteomancy)", category: "ancestors_spirit", price: 40, description: "A traditional Shona divination using Hakata bones, bridging the seen and unseen worlds to reveal truth.", formats: D, isAdult: false, isFixed: false },
  { id: 17, name: "Is A Spirit Contacting You?", category: "ancestors_spirit", price: 50, description: "Identify and understand spiritual presences, signs, and messages showing up in your daily life.", formats: D, isAdult: false, isFixed: false },
  { id: 18, name: "Mediumship Development", category: "ancestors_spirit", price: 50, description: "Guidance for those awakening to and developing their own mediumship gifts and spiritual sensitivity.", formats: D, isAdult: false, isFixed: false },

  // Healing & Wellbeing
  { id: 19, name: "Shadow Work Spread", category: "healing_wellbeing", price: 60, description: "Illuminate the hidden aspects of your psyche and receive guidance on deep integration and healing.", formats: D, isAdult: false, isFixed: false },
  { id: 20, name: "Healing Trauma", category: "healing_wellbeing", price: 70, description: "A compassionate reading to identify deep-seated trauma and illuminate the spiritual path to healing.", formats: D, isAdult: false, isFixed: false },
  { id: 21, name: "Clearing Your Head", category: "healing_wellbeing", price: 50, description: "Cut through mental fog, confusion, and decision fatigue — regain clarity on what truly matters.", formats: D, isAdult: false, isFixed: false },
  { id: 22, name: "Spiritual Cleanse", category: "healing_wellbeing", price: 45, description: "A targeted reading and spiritual prescription for clearing negative energy from your aura and environment.", formats: D, isAdult: false, isFixed: false },
  { id: 23, name: "Bad Mood Spread", category: "healing_wellbeing", price: 20, description: "A quick, uplifting reading to shift your energy and understand the root of persistent low moods.", formats: D, isAdult: false, isFixed: false },

  // Spells & Protection
  { id: 24, name: "Leave Me Alone / Banishing Spell", category: "spells_protection", price: 100, description: "Remove an unwanted person or harmful energy from your life through ancestral spell work.", formats: D, isAdult: false, isFixed: false, customIntake: [{ field: "target", label: "Who or what to remove (be as specific as possible)" }] },
  { id: 25, name: "Return To Sender Spell", category: "spells_protection", price: 100, description: "Send back negative energy, curses, or ill-will to its original source.", formats: D, isAdult: false, isFixed: false, customIntake: [{ field: "target", label: "Who/what to send back (be specific)" }] },
  { id: 26, name: "Remove 3rd Party", category: "spells_protection", price: 100, description: "Spiritual work to remove a third-party interference from a relationship or situation.", formats: D, isAdult: false, isFixed: false, customIntake: [{ field: "thirdParty", label: "Third party to remove (name if known)" }] },
  { id: 27, name: "Protected & Guarded", category: "spells_protection", price: 15, description: "A light but powerful protective blessing to shield your energy field from negativity and psychic harm.", formats: D, isAdult: false, isFixed: false },

  // Guidance & Future
  { id: 28, name: "General Reading", category: "guidance_future", price: 70, description: "A comprehensive overview of your current spiritual, personal, and life path energies across all major areas.", formats: D, isAdult: false, isFixed: false },
  { id: 29, name: "The Solution Spread", category: "guidance_future", price: 50, description: "Bring a specific problem or situation — receive practical, spiritually-grounded guidance on its resolution.", formats: D, isAdult: false, isFixed: false },
  { id: 30, name: "Find Out The Truth", category: "guidance_future", price: 40, description: "Seek the hidden truth in a situation, relationship, or decision where something feels unclear or concealed.", formats: D, isAdult: false, isFixed: false },
  { id: 31, name: "The Next Few Months", category: "guidance_future", price: 60, description: "A forward-looking reading on the energies, events, and turning points coming in the near future.", formats: D, isAdult: false, isFixed: false },
  { id: 32, name: "2026 New Year Spread", category: "guidance_future", price: 50, description: "Set powerful intentions for 2026 with ancestral guidance on the themes and opportunities of the year ahead.", formats: D, isAdult: false, isFixed: false },
  { id: 33, name: "Career & Money Review", category: "guidance_future", price: 50, description: "Examine the spiritual dimensions of your career path, finances, and abundance — and what is blocking it.", formats: D, isAdult: false, isFixed: false },
  { id: 34, name: "Vision of Success Spread", category: "guidance_future", price: 40, description: "Clarify your soul's personal definition of success and the spiritual steps to manifest it.", formats: D, isAdult: false, isFixed: false },
  { id: 35, name: "Seeking Prosperity", category: "guidance_future", price: 60, description: "Open the doors of abundance, identify what is blocking your prosperity, and activate your wealth energy.", formats: D, isAdult: false, isFixed: false },
  { id: 36, name: "Dream Interpretation Spread", category: "guidance_future", price: 40, description: "Decode the spiritual messages and ancestral communications hidden within your dreams.", formats: D, isAdult: false, isFixed: false, customIntake: [{ field: "dream", label: "Describe your dream in as much detail as possible" }] },
  { id: 37, name: "Connecting With Your Home", category: "guidance_future", price: 60, description: "Explore the spiritual energy of your home, ancestral land, and your soul's sense of belonging and rootedness.", formats: D, isAdult: false, isFixed: false },
  { id: 38, name: "Happy Birthday Spread", category: "guidance_future", price: 70, description: "A celebratory reading illuminating your soul's gifts, themes, and blessings for the year of your birth.", formats: D, isAdult: false, isFixed: false },

  // Live & In-Person
  { id: 39, name: "Unlimited Cards — 1 Hour Reading", category: "live_in_person", price: 120, description: "A full 60-minute unrestricted tarot and oracle card reading — ask everything on your mind.", formats: D, isAdult: false, isFixed: true },
  { id: 40, name: "Couple Reading", category: "live_in_person", price: 120, description: "A joint 60-minute session for couples seeking spiritual clarity, healing, and guidance together.", formats: D, isAdult: false, isFixed: true },
  { id: 41, name: "Office Visit Reading", category: "live_in_person", price: 180, description: "Ellie visits your office or workspace in Harare for a powerful in-person group reading experience.", formats: ["in_person"], isAdult: false, isFixed: true },
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
  { id: 1, clientName: "Tamara N.", rating: 5, comment: "Ellie connected with my grandmother immediately. The details she brought through were specific and deeply comforting. I'm still in awe. This was everything I needed and more.", readingName: "Connecting with a Passed Loved One", date: "2026-05-14" },
  { id: 2, clientName: "Marcus O.", rating: 5, comment: "My General Reading was incredibly accurate about the career crossroads I was at. The guidance was practical and spiritually grounded. I've already booked my second session.", readingName: "General Reading", date: "2026-05-02" },
  { id: 3, clientName: "Patience K.", rating: 5, comment: "The Are You Compatible reading gave me clarity I had been searching for for months. Ellie doesn't just read cards — she truly sees. Highly recommend to anyone questioning a relationship.", readingName: "Are You Compatible?", date: "2026-04-20" },
  { id: 4, clientName: "Tendai M.", rating: 5, comment: "I was sceptical about remote ancestral work but the Hakata reading blew my mind. Things she said about my late father were things she could not have known. A real and sacred gift.", readingName: "Hakata (Bone Throwing / Osteomancy)", date: "2026-04-08" },
  { id: 5, clientName: "Aisha D.", rating: 4, comment: "The Shadow Work Spread was intense but so needed. She held a beautiful, safe space for very deep material. I have been journalling non-stop since. Truly transformative work.", readingName: "Shadow Work Spread", date: "2026-03-25" },
  { id: 6, clientName: "Chidi A.", rating: 5, comment: "Booked the Seeking Prosperity reading and within three weeks the exact blockages she identified had shifted. I got the job. I got the flat. Ellie is the real deal — full stop.", readingName: "Seeking Prosperity", date: "2026-03-10" },
  { id: 7, clientName: "Rudo M.", rating: 5, comment: "As a Zimbabwean in the diaspora, finding someone who understands Shona tradition AND has this level of gift is rare. Ellie is exceptional. The ZINATHA verification gave me confidence to book.", readingName: "Ancestor Reading", date: "2026-02-18" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  love_relationships: "Love & Relationships",
  ancestors_spirit: "Ancestors & Spirit",
  healing_wellbeing: "Healing & Wellbeing",
  spells_protection: "Spells & Protection",
  guidance_future: "Guidance & Future",
  live_in_person: "Live & In-Person",
};

export const FORMAT_LABELS: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  chat: "Live Chat",
  async: "Async",
  in_person: "In-Person",
};
