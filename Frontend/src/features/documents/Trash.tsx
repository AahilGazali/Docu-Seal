import { useCallback, useEffect, useState } from 'react';
import { Trash2, RotateCcw, X, FileText } from 'lucide-react';
import { api } from '../../api/axios';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import type { Document } from '../../types';

export function Trash() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; documentId: string | null; documentTitle: string }>({
    isOpen: false,
    documentId: null,
    documentTitle: '',
  });
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchDeletedDocs() {
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        console.log('[Trash] Fetching deleted documents...');
        const response = await api.get<Document[]>('/api/docs/deleted');
        console.log('[Trash] API Response:', {
          status: response.status,
          dataLength: response.data?.length || 0,
          data: response.data,
        });
        if (!cancelled) {
          setDocuments(response.data || []);
          setError(null); // Ensure error is cleared on success
          if (response.data && response.data.length === 0) {
            console.log('[Trash] No deleted documents found (empty array returned)');
          } else {
            console.log(`[Trash] Successfully loaded ${response.data?.length || 0} deleted documents`);
          }
        }
      } catch (e: unknown) {
        const error = e as { response?: { data?: { error?: string }; status?: number } };
        const msg = error?.response?.data?.error ?? 'Failed to load deleted documents';
        const status = error?.response?.status;
        console.error('[Trash] Error fetching deleted documents:', { 
          msg, 
          status, 
          fullError: e,
          responseData: error?.response?.data,
        });
        // Only set error if it's a real error (not 200 with empty array)
        if (!cancelled && status !== 200) {
          setError(msg);
        } else if (!cancelled) {
          setError(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDeletedDocs();
    return () => { cancelled = true; };
  }, []);

  const handleRestore = useCallback(async (id: string) => {
    try {
      setRestoring(id);
      await api.post(`/api/docs/${id}/restore`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to restore document';
      setError(msg);
    } finally {
      setRestoring(null);
    }
  }, []);

  const handlePermanentDeleteClick = useCallback((id: string, title: string) => {
    setDeleteModal({ isOpen: true, documentId: id, documentTitle: title });
  }, []);

  const handlePermanentDeleteConfirm = useCallback(async () => {
    if (!deleteModal.documentId) return;
    try {
      setDeleting(true);
      await api.delete(`/api/docs/${deleteModal.documentId}?permanent=true`);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteModal.documentId));
      setDeleteModal({ isOpen: false, documentId: null, documentTitle: '' });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to permanently delete document';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  }, [deleteModal.documentId]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white px-5 py-4 shadow-lg border-2 border-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-lg">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Trash</h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">Restore or permanently delete documents</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center rounded-xl border-2 border-slate-300 bg-white py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-red-500" />
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-400 bg-white py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800 text-white shadow-lg">
            <Trash2 className="h-7 w-7" />
          </div>
          <p className="mt-4 text-lg font-bold text-black">Trash is empty</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">Deleted documents will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const deletedDate = doc.deleted_at ? new Date(doc.deleted_at).toLocaleDateString() : '';
            return (
              <div key={doc.id} className="rounded-xl p-5 bg-white shadow-lg border-2 border-slate-400">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-black">{doc.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-slate-900">
                        Deleted on {deletedDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore(doc.id)}
                      disabled={restoring === doc.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {restoring === doc.id ? 'Restoring...' : 'Restore'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDeleteClick(doc.id, doc.title)}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Delete Forever
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, documentId: null, documentTitle: '' })}
        onConfirm={handlePermanentDeleteConfirm}
        title="Permanently Delete Document"
        message={`Are you sure you want to permanently delete "${deleteModal.documentTitle}"? This action cannot be undone and the document will be lost forever.`}
        itemName={deleteModal.documentTitle}
        isDeleting={deleting}
      />
    </div>
  );
}
