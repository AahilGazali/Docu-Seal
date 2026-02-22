import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { Check, X, Mail, PenTool } from 'lucide-react';
import { api } from '../../api/axios';
import type { Document as DocumentType } from '../../types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_WIDTH = 600;

interface SignerInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

interface SignaturePosition {
  x: number;
  y: number;
  page: number;
}

export function SignDocument() {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [doc, setDoc] = useState<DocumentType | null>(null);
  const [signerInfo, setSignerInfo] = useState<SignerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'idle' | 'signing' | 'done'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition | null>(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // If token is provided, verify it first (email-based signing)
        if (token) {
          try {
            const { data: signerData } = await api.get(`/api/signers/verify`, {
              params: { documentId, token },
            });
            if (!cancelled) {
              setSignerInfo(signerData.signer);
              setDoc(signerData.document);
            }
          } catch (verifyError: any) {
            const msg = verifyError?.response?.data?.error ?? 'Invalid or expired signing link';
            if (!cancelled) setError(msg);
            return;
          }
        } else {
          // Regular authenticated access
          const { data } = await api.get<DocumentType>(`/api/docs/${documentId}`);
          if (!cancelled) setDoc(data);
        }
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load document';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [documentId, token]);

  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (signerInfo?.status === 'signed' || action === 'done') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSignaturePosition({ x, y, page: pageNumber });
    setError(null);
  }, [signerInfo?.status, action]);

  async function handleFinalize(accept: boolean) {
    if (!documentId) return;
    setAction('signing');
    setError(null);
    try {
      if (accept) {
        if (token && signerInfo) {
          const payload: { documentId: string; token: string; x?: number; y?: number; page?: number } = { documentId, token };
          if (signaturePosition) {
            payload.x = signaturePosition.x;
            payload.y = signaturePosition.y;
            payload.page = signaturePosition.page;
          }
          await api.post('/api/signers/accept-and-sign', payload);
          setMessage('Document signed successfully. Thank you!');
        } else {
          // Regular authenticated signing
          await api.post('/api/signatures/finalize', { documentId });
          setMessage('Document signed successfully.');
        }
      } else {
        if (token && signerInfo) {
          await api.put(`/api/signers/${signerInfo.id}/status`, {
            status: 'rejected',
          });
        }
        setMessage('You declined to sign.');
      }
      setAction('done');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Action failed';
      setError(msg);
      setAction('idle');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }
  if (error && !doc) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!doc) {
    return null;
  }

  const pdfUrl = doc.signed_url ?? doc.file_url;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="rounded-xl bg-teal-100 border-2 border-teal-300 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign Document</h1>
        <p className="text-lg text-slate-700 font-semibold">{doc.title}</p>
        {signerInfo && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-teal-300">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
              <Mail className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Signing as: {signerInfo.name}</p>
              <p className="text-xs text-slate-700 font-medium">{signerInfo.email}</p>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && action === 'idle' && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {token && signerInfo && signerInfo.status !== 'signed' && action !== 'done' && (
        <div className="rounded-lg border-2 border-teal-200 bg-teal-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-800">
            <strong>Where to sign:</strong> Click on the document where you want your signature to appear.
            {signaturePosition && (
              <span className="ml-1 text-teal-700">Position set (page {signaturePosition.page}). You can click elsewhere to change.</span>
            )}
          </p>
          {signaturePosition && (
            <button
              type="button"
              onClick={() => setSignaturePosition(null)}
              className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              Clear and choose another spot
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-md">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          }
        >
          {Array.from({ length: numPages || 1 }, (_, i) => (
            <div
              key={i}
              className={`relative ${signerInfo && signerInfo.status !== 'signed' && action !== 'done' ? 'cursor-crosshair' : ''}`}
              onClick={(e) => signerInfo?.status !== 'signed' && action !== 'done' && handlePageClick(e, i + 1)}
              style={{ width: PDF_WIDTH }}
            >
              <Page
                pageNumber={i + 1}
                width={PDF_WIDTH}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
              {signaturePosition?.page === i + 1 && (
                <div
                  className="absolute pointer-events-none flex items-center gap-1 rounded border-2 border-teal-500 bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800"
                  style={{ left: `${signaturePosition.x}%`, top: `${signaturePosition.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <PenTool className="h-3 w-3" />
                  Signature here
                </div>
              )}
            </div>
          ))}
        </Document>
      </div>

      {((token && signerInfo && signerInfo.status !== 'signed') || (!token && doc.status !== 'signed')) && action !== 'done' && (
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={() => handleFinalize(true)}
            disabled={action === 'signing'}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 font-medium text-white transition-colors hover:bg-teal-800 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Accept & Sign
          </button>
          <button
            type="button"
            onClick={() => handleFinalize(false)}
            disabled={action === 'signing'}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-400 bg-white px-4 py-2.5 font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
