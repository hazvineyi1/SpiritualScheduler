export type SessionFormat = "video" | "audio" | "chat" | "async" | "in_person";

export interface CustomIntakeField {
  field: string;
  label: string;
  placeholder?: string;
}

// category is free text — each healer defines their own categories to fit
// their own practice, rather than choosing from a fixed platform-wide list.
export interface Reading {
  id: number;
  name: string;
  category: string;
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
  price: number;
  description: string;
}

export const FORMAT_LABELS: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  chat: "Live Chat",
  async: "Async",
  in_person: "In-Person",
};

// Given to a newly registered healer as an editable starting point.
export const STARTER_READINGS: Reading[] = [
  { id: 1, name: "General Consultation", category: "Guidance & Consultation", price: 20, description: "A general session to discuss whatever is on your mind.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
  { id: 2, name: "Quick Question", category: "Guidance & Consultation", price: 10, description: "A short, focused answer to one specific question.", formats: ["video", "audio", "chat", "async"], isAdult: false, isFixed: false },
];

export const STARTER_PRODUCTS: Product[] = [];
