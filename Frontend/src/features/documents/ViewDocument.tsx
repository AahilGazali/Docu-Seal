import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { FileText, PenTool, Check, X, Users, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { api } from '../../api/axios';
import { SignatureOverlay } from '../../components/SignatureOverlay';
import { SignatureConfigModal } from '../../components/SignatureConfigModal';
import { FieldsList } from '../../components/FieldsList';
import { AddSignersModal } from '../../components/AddSignersModal';
import { useAuth } from '../../hooks/useAuth';
import type { Document as DocumentType, Signature } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_PAGE_WIDTH = 612;
const PDF_PAGE_HEIGHT = 792;

interface DocumentSigner {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  signing_order?: number;
  signed_at?: string;
}

export function ViewDocument() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentType | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState<Array<{ id: string; x: number; y: number; page: number; labelType?: 'signature' | 'initials' }>>([]);
  const [editingSignatures, setEditingSignatures] = useState<Map<string, { x: number; y: number; page: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signaturesError, setSignaturesError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [signatureLabel, setSignatureLabel] = useState('');
  const [signatureStyle, setSignatureStyle] = useState<'simple' | 'formal' | 'bold' | 'classic' | 'cursive1' | 'cursive2' | 'cursive3' | 'cursive4' | 'elegant' | 'modern' | 'script' | 'casual' | 'professional' | 'artistic' | 'refined' | 'sleek'>('simple');
  const [signatureColor, setSignatureColor] = useState<'black' | 'red' | 'blue' | 'green'>('black');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showAddSignersModal, setShowAddSignersModal] = useState(false);
  const [signers, setSigners] = useState<DocumentSigner[]>([]);
  const signatureLabelInitialized = useRef(false);
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(600);

  const fetchDoc = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      setSignaturesError(null);
      const docRes = await api.get<DocumentType & { signed_url?: string }>(`/api/docs/${id}`);
      setDoc(docRes.data);
      try {
        const sigRes = await api.get<Signature[]>(`/api/signatures/${id}`);
        setSignatures(sigRes.data || []);
      } catch {
        setSignatures([]);
        setSignaturesError('Could not load signature positions.');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load document';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const loadSigners = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get<DocumentSigner[]>(`/api/signers/document/${id}`);
      setSigners(data || []);
    } catch {
      setSigners([]);
    }
  }, [id]);

  useEffect(() => {
    if (doc && id) loadSigners();
  }, [doc, id, loadSigners]);

  useEffect(() => {
    if (user?.name && signatures.length > 0 && !signatureLabelInitialized.current) {
      setSignatureLabel(user.name);
      signatureLabelInitialized.current = true;
    }
  }, [user?.name, signatures.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  );

  const pageHeightPx = containerWidth * (PDF_PAGE_HEIGHT / PDF_PAGE_WIDTH);

  const saveSignatureAt = useCallback(
    async (x: number, y: number, page: number, label?: string) => {
      if (!id || !doc) return;
      try {
        setSignaturesError(null);
        console.log('[SaveSignature] Saving:', { documentId: id, x, y, page, signerId: user?.id, label });
        const { data } = await api.post<Signature>('/api/signatures', {
          documentId: id,
          signerId: user?.id,
          x,
          y,
          page,
          label, // Send the label (full name or initials)
        });
        console.log('[SaveSignature] Success:', data);
        
        // Refetch signatures from server to ensure we have the latest state from database
        try {
          const sigRes = await api.get<Signature[]>(`/api/signatures/${id}`);
          console.log('[SaveSignature] Refetched signatures:', sigRes.data);
          setSignatures(sigRes.data || []);
        } catch (refetchErr) {
          // If refetch fails, still add the new signature to state
          console.warn('[SaveSignature] Refetch failed, using response data:', refetchErr);
          setSignatures((prev) => [...prev, data]);
        }
        
        // Don't clear pendingSignature here - it's handled by the caller
      } catch (e: unknown) {
        const error = e as { response?: { data?: { error?: string } } };
        const msg = error?.response?.data?.error ?? 'Could not save signature.';
        console.error('[SaveSignature] Error:', msg, e);
        setSignaturesError(msg);
      }
    },
    [id, doc, user?.id]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const activeId = String(active.id);
      
      if (!id || !doc || !delta) return;

      // Get the initial position from the drag data
      const initialData = active.data.current as { x?: number; y?: number; pageIndex?: number } | undefined;
      if (!initialData || initialData.x === undefined || initialData.y === undefined) return;

      // Calculate new position based on initial position + delta
      const deltaXPercent = (delta.x / containerWidth) * 100;
      const deltaYPercent = (delta.y / pageHeightPx) * 100;
      
      const newX = Math.max(0, Math.min(100, initialData.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100, initialData.y + deltaYPercent));

      // Check if it's a pending signature (not yet saved)
      if (activeId.startsWith('sig-pending-')) {
        const pendingId = activeId.replace('sig-pending-', '');
        const pending = pendingSignatures.find(p => p.id === pendingId);
        if (pending) {
          setPendingSignatures(prev => 
            prev.map(p => p.id === pendingId ? { ...p, x: newX, y: newY } : p)
          );
          return;
        }
      }

      // Check if it's an existing signature being repositioned
      if (activeId.startsWith('sig-') && !activeId.startsWith('sig-pending-')) {
        const sigId = activeId.replace('sig-', '');
        const existing = signatures.find(s => s.id === sigId);
        if (existing) {
          setEditingSignatures(prev => {
            const next = new Map(prev);
            next.set(sigId, { x: newX, y: newY, page: existing.page });
            return next;
          });
          return;
        }
      }
    },
    [id, doc, pendingSignatures, signatures, containerWidth, pageHeightPx]
  );

  const handleSaveAllPending = useCallback(async () => {
    for (const pending of pendingSignatures) {
      // Generate label based on labelType
      let label: string | undefined;
      if (pending.labelType === 'initials') {
        const nameParts = (user?.name || '').split(/\s+/);
        if (nameParts.length >= 2) {
          label = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
          label = nameParts[0].substring(0, 2).toUpperCase();
        }
      } else {
        label = signatureLabel || user?.name || undefined;
      }
      await saveSignatureAt(pending.x, pending.y, pending.page, label);
    }
    setPendingSignatures([]);
  }, [pendingSignatures, saveSignatureAt, user?.name, signatureLabel]);

  const handleSaveEditedSignature = useCallback(async (sigId: string) => {
    const edited = editingSignatures.get(sigId);
    if (!edited) return;
    
    try {
      setSignaturesError(null);
      await api.put(`/api/signatures/${sigId}`, {
        x: edited.x,
        y: edited.y,
        page: edited.page,
      });
      
      // Update local state
      setSignatures(prev => prev.map(s => 
        s.id === sigId ? { ...s, x: edited.x, y: edited.y, page: edited.page } : s
      ));
      
      // Remove from editing map
      setEditingSignatures(prev => {
        const next = new Map(prev);
        next.delete(sigId);
        return next;
      });
      
      // Refetch to ensure sync
      const sigRes = await api.get<Signature[]>(`/api/signatures/${id}`);
      setSignatures(sigRes.data || []);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { error?: string } } };
      const msg = error?.response?.data?.error ?? 'Could not update signature position.';
      setSignaturesError(msg);
    }
  }, [editingSignatures, id]);

  const handleCancelEdit = useCallback((sigId: string) => {
    setEditingSignatures(prev => {
      const next = new Map(prev);
      next.delete(sigId);
      return next;
    });
  }, []);

  const handleSignAndFinalize = useCallback(async () => {
    if (!id) return;
    
    setFinalizeError(null);
    setFinalizing(true);
    
    try {
      // CRITICAL: Refetch signatures from database before finalizing to ensure we have latest state
      console.log('[Finalize] Refetching signatures from database before finalizing...');
      let latestSignatures: Signature[] = [];
      try {
        const sigRes = await api.get<Signature[]>(`/api/signatures/${id}`);
        latestSignatures = sigRes.data || [];
        console.log('[Finalize] Latest signatures from DB:', latestSignatures);
        setSignatures(latestSignatures); // Update state with latest from DB
      } catch (refetchErr) {
        console.warn('[Finalize] Could not refetch signatures, using current state:', refetchErr);
        latestSignatures = signatures; // Fallback to current state
      }
      
      // Check for pending signatures (not already signed)
      const savedPendingSignatures = latestSignatures.filter(s => s.status === 'pending' || !s.status);
      console.log('[Finalize] Pending signatures check:', {
        total: latestSignatures.length,
        pending: savedPendingSignatures.length,
        allStatuses: latestSignatures.map(s => ({ id: s.id, status: s.status })),
      });
      
      if (savedPendingSignatures.length === 0) {
        if (latestSignatures.length === 0) {
          setFinalizeError('Please place at least one signature field before finalizing.');
        } else {
          setFinalizeError('All signatures have already been finalized. The document may already be signed.');
        }
        setFinalizing(false);
        return;
      }
      
      if (!signatureLabel || !signatureLabel.trim()) {
        setFinalizeError('Please enter your signature name.');
        setFinalizing(false);
        return;
      }
      
      console.log('[Finalize] Sending request with:', {
        documentId: id,
        signatureLabel: signatureLabel.trim(),
        signatureStyle,
        pendingSignaturesCount: savedPendingSignatures.length,
      });
      
      const response =       await api.post('/api/signatures/finalize', {
        documentId: id,
        signatureLabel: signatureLabel.trim(),
        signatureStyle: signatureStyle || 'simple',
        signatureColor: signatureColor || 'black',
      });
      
      console.log('[Finalize] Success:', response.data);
      
      // Refetch to get the signed document URL
      await fetchDoc();
      // Force PDF viewer to reload by updating the key
      setNumPages(0);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { error?: string }; status?: number } };
      const msg = error?.response?.data?.error ?? 'Could not sign document.';
      const status = error?.response?.status;
      console.error('[Finalize] Error:', { msg, status, error: e });
      setFinalizeError(msg);
    } finally {
      setFinalizing(false);
    }
  }, [id, signatureLabel, signatureStyle, signatureColor, signatures, fetchDoc]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-red-500" />
        <p className="mt-3 text-sm text-slate-600">Loading document…</p>
      </div>
    );
  }
  if (error || !doc) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
        <p className="font-medium">{error ?? 'Document not found'}</p>
        <p className="mt-1 text-sm">Check that the document exists and you have access.</p>
      </div>
    );
  }

  // Prefer signed_url so we load the signed PDF when status is signed; key forces remount so browser doesn't use cached original
  const pdfUrl = doc.status === 'signed' ? (doc.signed_url || doc.file_url) : (doc.signed_url ?? doc.file_url);
  // Use signed_url as part of key when signed so PDF reloads when URL changes (new signed file)
  const pdfKey = doc.status === 'signed' 
    ? `signed-${id}-${pdfUrl?.slice(-50) ?? ''}` 
    : id;
  
  // Check for saved pending signatures (not already signed) - separate from local pendingSignatures state
  const savedPendingSignatures = signatures.filter(s => s.status === 'pending' || !s.status);
  const hasPendingSignatures = savedPendingSignatures.length > 0 || pendingSignatures.length > 0;
  
  // Debug logging
  if (doc.status === 'signed') {
    console.log('[ViewDocument] Loading signed PDF:', {
      status: doc.status,
      signed_url: doc.signed_url?.substring(0, 100),
      file_url: doc.file_url?.substring(0, 100),
      pdfUrl: pdfUrl?.substring(0, 100),
      pdfKey,
    });
  }
  
  console.log('[ViewDocument] Signatures state:', {
    total: signatures.length,
    savedPending: savedPendingSignatures.length,
    localPending: pendingSignatures.length,
    signed: signatures.filter(s => s.status === 'signed').length,
    hasPendingSignatures,
  });
  
  const canAddSignature = doc.status !== 'signed';
  const createdDate = doc.created_at ? new Date(doc.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
  const signerName = user?.name ?? user?.email ?? '';

  return (
    <div className="space-y-4">
      {/* Document header: title, status, date, actions */}
      <div className="rounded-xl bg-white px-5 py-4 shadow-lg border-2 border-slate-400">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white shadow-md">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black">{doc.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                <StatusBadge status={doc.status} />
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-900">Created {createdDate}</span>
              </div>
            </div>
          </div>
          {canAddSignature && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAddSignersModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-teal-800 transition-colors"
              >
                <Users className="h-4 w-4" />
                Add Signers
              </button>
              <button
                type="button"
                onClick={() => {
                  const newId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  setPendingSignatures(prev => [...prev, { id: newId, x: 50, y: 50, page: 1, labelType: 'signature' }]);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-teal-800 hover:shadow-xl transition-all"
              >
                <PenTool className="h-4 w-4" />
                Place signature
              </button>
              <button
                type="button"
                onClick={() => {
                  const newId = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  setPendingSignatures(prev => [...prev, { id: newId, x: 50, y: 50, page: 1, labelType: 'initials' }]);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-teal-800 transition-colors"
              >
                <PenTool className="h-4 w-4" />
                Place initials
              </button>
            </div>
          )}
        </div>
        {signaturesError && (
          <p className="mt-3 text-sm text-amber-700">{signaturesError}</p>
        )}
      </div>

      {/* Signers Status */}
      {signers.length > 0 && (
        <div className="rounded-xl border-2 border-slate-400 bg-white px-5 py-5 shadow-lg">
          <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-700" />
            Signers
          </h3>
          <ul className="space-y-3">
            {signers.map((s) => {
              const StatusIcon = s.status === 'signed' ? CheckCircle2 : s.status === 'rejected' ? XCircle : Clock;
              const statusColor = s.status === 'signed' ? 'text-teal-700' : s.status === 'rejected' ? 'text-red-600' : 'text-slate-600';
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs font-medium text-slate-700">{s.email}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm font-semibold capitalize ${statusColor}`}>
                    <StatusIcon className="h-4 w-4" />
                    {s.status}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Fields List - Required and Optional Fields */}
      {canAddSignature && (savedPendingSignatures.length > 0 || pendingSignatures.length > 0) && (
        <div className="rounded-xl border-2 border-slate-400 bg-white px-5 py-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-black">Fields</h3>
            <button
              type="button"
              onClick={() => setShowSignatureModal(true)}
              className="text-sm font-bold text-teal-900 hover:text-black"
            >
              Configure signature style
            </button>
          </div>
          <FieldsList
            fields={[
              ...savedPendingSignatures.map((s): { id: string; type: 'signature' | 'initials'; label: string; value?: string; required: boolean; page: number } => ({
                id: s.id,
                type: (s.label && s.label.length <= 3 ? 'initials' : 'signature'),
                label: s.label && s.label.length <= 3 ? 'Initials' : 'Signature',
                value: s.label,
                required: true,
                page: s.page,
              })),
              ...pendingSignatures.map((p): { id: string; type: 'signature' | 'initials'; label: string; required: boolean; page: number } => ({
                id: p.id,
                type: (p.labelType === 'initials' ? 'initials' : 'signature'),
                label: p.labelType === 'initials' ? 'Initials' : 'Signature',
                required: false,
                page: p.page,
              })),
            ]}
            onDelete={(fieldId) => {
              // Handle delete for saved signatures
              const savedSig = savedPendingSignatures.find(s => s.id === fieldId);
              if (savedSig) {
                // TODO: Add delete API call
                console.log('Delete saved signature:', fieldId);
              }
              // Handle delete for pending signatures
              const pendingSig = pendingSignatures.find(p => p.id === fieldId);
              if (pendingSig) {
                setPendingSignatures(prev => prev.filter(p => p.id !== fieldId));
              }
            }}
            onSign={signatureLabel ? handleSignAndFinalize : undefined}
            signing={finalizing}
          />
          {finalizeError && (
            <p className="mt-4 text-sm text-red-700">{finalizeError}</p>
          )}
        </div>
      )}

      {/* Signature Configuration Modal */}
      <SignatureConfigModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onApply={(config) => {
          setSignatureLabel(config.fullName);
          setSignatureStyle(config.signatureStyle);
          setSignatureColor(config.color);
          setShowSignatureModal(false);
        }}
        initialName={signatureLabel || signerName}
        initialStyle={signatureStyle}
        initialColor={signatureColor}
      />

      {/* Add Signers Modal */}
      {doc && id && (
        <AddSignersModal
          isOpen={showAddSignersModal}
          onClose={() => setShowAddSignersModal(false)}
          documentId={id}
          documentTitle={doc.title}
          onSuccess={() => {
            fetchDoc();
            loadSigners();
          }}
        />
      )}

      {/* When document is already signed */}
      {doc.status === 'signed' && (
        <div className="rounded-xl border-2 border-teal-300 bg-teal-50 px-4 py-3">
          <p className="font-semibold text-teal-900">This document has been signed.</p>
          <p className="mt-1 text-sm font-medium text-teal-800">The PDF above is the final signed version.</p>
        </div>
      )}

      {/* When placing signatures: show instructions */}
      {canAddSignature && pendingSignatures.length > 0 && (
        <div className="rounded-xl border-2 border-teal-300 bg-teal-50 px-4 py-3">
          <p className="mb-3 text-sm font-medium text-slate-800">
            <strong>Placing signatures:</strong> Drag the dashed boxes on the document to position them. You can place multiple signatures and move them around before saving. Each box shows whether it's a signature or initials.
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingSignatures.map((p) => (
              <div key={p.id} className="flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs">
                <span className="font-medium text-blue-700">{p.labelType === 'initials' ? 'Initials' : 'Signature'}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveAllPending}
              className="btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              <Check className="h-4 w-4" />
              Save all ({pendingSignatures.length})
            </button>
            <button
              type="button"
              onClick={() => setPendingSignatures([])}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Cancel all
            </button>
          </div>
        </div>
      )}

      {/* When editing existing signatures */}
      {canAddSignature && editingSignatures.size > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
          <p className="mb-3 text-sm font-medium text-slate-800">
            <strong>Repositioning signatures:</strong> You have {editingSignatures.size} signature(s) being repositioned. Drag them to move, then save.
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(editingSignatures.keys()).map(sigId => (
              <div key={sigId} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveEditedSignature(sigId)}
                  className="btn-primary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  <Check className="h-3 w-3" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelEdit(sigId)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF viewer with signature overlays */}
      <div className="rounded-xl border border-slate-200 bg-slate-100 shadow-inner">
        <div
          className="overflow-auto"
          ref={(el) => {
            if (el) setContainerWidth(el.clientWidth || 600);
          }}
        >
          <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
            <Document
              key={pdfKey}
              file={pdfUrl}
              onLoadSuccess={({ numPages: n }) => {
                console.log(`[PDF Viewer] Loaded PDF with ${n} pages, URL: ${pdfUrl?.substring(0, 80)}...`);
                setNumPages(n);
              }}
              onLoadError={(error) => {
                console.error('[PDF Viewer] Failed to load PDF:', error);
                setError('Failed to load PDF. Please refresh the page.');
              }}
              loading={
                <div className="flex justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-red-500" />
                </div>
              }
            >
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i} className="relative mx-auto bg-white shadow-sm" style={{ width: containerWidth }}>
                  <Page
                    pageNumber={i + 1}
                    width={containerWidth}
                    renderTextLayer
                    renderAnnotationLayer
                    data-page-number={i + 1}
                  />
                  {doc.status !== 'signed' && (
                    <>
                      {signatures
                        .filter((s) => s.page === i + 1)
                        .map((s) => {
                          const edited = editingSignatures.get(s.id);
                          const isEditing = !!edited;
                          // Show the stored label if available, otherwise show "Signature"
                          const displayLabel = s.label || (isEditing ? "Drag to reposition" : "Signature");
                          return (
                            <SignatureOverlay
                              key={s.id}
                              id={s.id}
                              x={edited?.x ?? s.x}
                              y={edited?.y ?? s.y}
                              pageIndex={i}
                              label={displayLabel}
                              disabled={false}
                            />
                          );
                        })}
                      {pendingSignatures
                        .filter((p) => p.page === i + 1)
                        .map((p) => (
                          <SignatureOverlay
                            key={p.id}
                            id={`pending-${p.id}`}
                            x={p.x}
                            y={p.y}
                            pageIndex={i}
                            label={p.labelType === 'initials' ? 'Initials' : 'Signature'}
                            disabled={false}
                          />
                        ))}
                    </>
                  )}
                </div>
              ))}
            </Document>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
