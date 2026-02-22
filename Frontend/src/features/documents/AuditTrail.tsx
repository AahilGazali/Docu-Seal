import { useEffect, useState } from 'react';
import { History, FileText, ChevronDown } from 'lucide-react';
import { api } from '../../api/axios';
import type { Document } from '../../types';

interface AuditLog {
  id: string;
  document_id: string;
  user_id: string;
  action: string;
  ip_address: string | null;
  created_at: string;
}

export function AuditTrail() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchDocs() {
      try {
        setLoadingDocs(true);
        setError(null);
        const { data } = await api.get<Document[]>('/api/docs');
        if (!cancelled) setDocuments(data);
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load documents';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    }
    fetchDocs();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLogs([]);
      return;
    }
    let cancelled = false;
    setLoadingLogs(true);
    setError(null);
    api
      .get<AuditLog[]>(`/api/audit/${selectedId}`)
      .then(({ data }) => {
        if (!cancelled) setLogs(data || []);
      })
      .catch((e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load audit logs';
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingLogs(false);
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  const selectedDoc = documents.find((d) => d.id === selectedId);
  const actionLabel = (action: string) => {
    if (action === 'signature_placed') return 'Signature placed';
    if (action === 'document_finalized') return 'Document finalized';
    return action;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white px-5 py-4 shadow-lg border-2 border-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white shadow-md">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-black">Audit Trail</h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">Track who signed and when for each document</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-slate-400 bg-white p-5 shadow-md">
        <label htmlFor="audit-doc" className="mb-2 block text-sm font-semibold text-slate-900">
          Select a document
        </label>
        <div className="relative">
          <select
            id="audit-doc"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full appearance-none rounded-xl border-2 border-slate-300 bg-white py-3 pl-4 pr-10 text-slate-950 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">Choose a document…</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title} ({doc.status})
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {loadingDocs && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
        </div>
      )}

      {!loadingDocs && selectedId && (
        <div className="rounded-xl border-2 border-slate-400 bg-white shadow-md">
          <div className="border-b-2 border-slate-300 px-5 py-3">
            <h2 className="font-bold text-black">
              {selectedDoc ? selectedDoc.title : 'Document'} – activity log
            </h2>
          </div>
          <div className="p-5">
            {loadingLogs ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
              </div>
            ) : logs.length === 0 ? (
              <p className="py-6 text-center text-sm font-medium text-slate-700">No audit entries for this document yet.</p>
            ) : (
              <ul className="space-y-3">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border-2 border-slate-200 bg-slate-100 px-4 py-3"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{actionLabel(log.action)}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-700">
                        {new Date(log.created_at).toLocaleString()}
                        {log.ip_address ? ` · ${log.ip_address}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loadingDocs && !selectedId && documents.length > 0 && (
        <p className="rounded-xl border-2 border-dashed border-slate-400 bg-slate-100 py-8 text-center text-sm font-medium text-slate-700">
          Select a document above to view its audit trail.
        </p>
      )}
    </div>
  );
}
