export type GoogleStatus = "not_checked" | "found" | "not_found";

export type Company = {
  id: number;
  exhibitionId: number;
  name: string;
  phone: string | null;
  website: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  googleStatus: GoogleStatus;
  googlePlaceName: string | null;
  googleMapsUrl: string | null;
  checkedAt: string | null;
  priority: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Proposal = {
  id: number;
  companyId: number;
  content: string;
  status: "draft" | "sent";
  aiGenerated: boolean;
  createdAt: string;
};

export type Exhibition = {
  id: number;
  title: string;
  sourceUrl: string | null;
  year: string | null;
  createdAt: string;
};
