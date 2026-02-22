export const DOCUMENT_STATUSES = ['draft', 'pending', 'signed', 'rejected'] as const;
export type DocumentStatusFilter = (typeof DOCUMENT_STATUSES)[number] | 'all';

export const ACCEPTED_FILE_TYPES = ['application/pdf'];
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'docusealhelp@gmail.com';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  UPLOAD: '/dashboard/upload',
  VIEW_DOCUMENT: '/dashboard/documents/:id',
  SIGN_DOCUMENT: '/sign/:documentId',
  AUDIT: '/dashboard/audit',
  TRASH: '/dashboard/trash',
} as const;

export function getViewDocumentPath(id: string): string {
  return `/dashboard/documents/${id}`;
}

export function getSignDocumentPath(documentId: string): string {
  return `/sign/${documentId}`;
}
