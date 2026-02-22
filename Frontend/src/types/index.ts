export type DocumentStatus = 'draft' | 'pending' | 'signed' | 'rejected';
export type SignatureStatus = 'pending' | 'signed' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  language?: string;
  theme?: 'light' | 'dark';
}

export interface Document {
  id: string;
  title: string;
  owner_id: string;
  file_url: string;
  status: DocumentStatus;
  created_at: string;
  deleted_at?: string;
  signed_url?: string;
}

export interface Signature {
  id: string;
  document_id: string;
  signer_id: string;
  x: number;
  y: number;
  page: number;
  status: SignatureStatus;
  signed_at?: string;
  ip_address?: string;
  label?: string; // Full name or initials for this signature
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ApiErrorResponse {
  error: string;
}

export interface SignaturePayload {
  documentId: string;
  signerId?: string;
  x: number;
  y: number;
  page: number;
  label?: string; // Full name or initials
}

export interface FinalizePayload {
  documentId: string;
}

export interface DocumentSigner {
  id: string;
  document_id: string;
  email: string;
  name: string;
  role: 'signer' | 'viewer' | 'cc';
  signing_order?: number;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'rejected';
  signer_token: string;
  signed_at?: string;
  ip_address?: string;
  created_at: string;
  updated_at: string;
}
