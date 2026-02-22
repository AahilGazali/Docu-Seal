import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUp, PenTool, FileSignature, History, Sparkles, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api/axios';
import { DocumentCard } from '../../components/DocumentCard';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { useAuth } from '../../hooks/useAuth';
import type { Document } from '../../types';
import { ROUTES } from '../../utils/constants';

const STATUS_FILTERS: { value: 'all' | 'draft' | 'signed'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'signed', label: 'Signed' },
];

const TOOL_CARDS = [
  {
    to: ROUTES.UPLOAD,
    icon: FileUp,
    title: 'Upload PDF',
    description: 'Upload a document to add signatures',
    iconBg: 'bg-teal-700',
    hover: 'hover:border-teal-300 hover:shadow-md',
  },
  {
    to: `${ROUTES.DASHBOARD}#documents`,
    icon: FileSignature,
    title: 'My Documents',
    description: 'View and manage your documents',
    iconBg: 'bg-teal-700',
    hover: 'hover:border-teal-300 hover:shadow-md',
  },
  {
    to: `${ROUTES.DASHBOARD}#documents`,
    icon: PenTool,
    title: 'Place Signatures',
    description: 'Open a document to place signature fields',
    iconBg: 'bg-teal-700',
    hover: 'hover:border-teal-300 hover:shadow-md',
  },
  {
    to: ROUTES.AUDIT,
    icon: History,
    title: 'Audit Trail',
    description: 'Track who signed and when',
    iconBg: 'bg-teal-700',
    hover: 'hover:border-teal-300 hover:shadow-md',
  },
];

const DOCUMENTS_SECTION_ID = 'documents';

export function Dashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'signed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; documentId: string | null; documentTitle: string }>({
    isOpen: false,
    documentId: null,
    documentTitle: '',
  });
  const [deleting, setDeleting] = useState(false);
  const location = useLocation();
  const documentsSectionRef = useRef<HTMLElement | null>(null);

  const handleToolCardClick = useCallback((e: React.MouseEvent, to: string) => {
    if (to.includes('#documents')) {
      const isOnDashboard = location.pathname === ROUTES.DASHBOARD || location.pathname === '/dashboard';
      if (isOnDashboard) {
        e.preventDefault();
        documentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState(null, '', to);
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    if (location.hash === `#${DOCUMENTS_SECTION_ID}` && documentsSectionRef.current) {
      documentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;
    async function fetchDocs() {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get<Document[]>('/api/docs');
        if (!cancelled) setDocuments(data);
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to load documents';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDocs();
    return () => { cancelled = true; };
  }, []);

  const filtered =
    filter === 'all'
      ? documents
      : documents.filter((d) => String(d.status).toLowerCase() === filter);

  const handleDeleteClick = useCallback((id: string, title: string) => {
    setDeleteModal({ isOpen: true, documentId: id, documentTitle: title });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteModal.documentId) return;
    try {
      setDeleting(true);
      await api.delete(`/api/docs/${deleteModal.documentId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteModal.documentId));
      setDeleteModal({ isOpen: false, documentId: null, documentTitle: '' });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to delete document';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  }, [deleteModal.documentId]);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-slate-800 p-8 text-white shadow-lg border border-slate-200/20">
        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-2 text-teal-100">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-white">Your Document Workspace</h1>
          <p className="text-slate-200 max-w-md">Manage, sign, and track all your documents in one place</p>
        </div>
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-400/10 blur-3xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-md border-2 border-slate-400 hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Total Documents</p>
              <p className="mt-1 text-3xl font-bold text-black">{documents.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
              <FileSignature className="h-6 w-6 text-teal-700" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-md border-2 border-slate-400 hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Signed</p>
              <p className="mt-1 text-3xl font-bold text-teal-600">
                {documents.filter(d => d.status === 'signed').length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
              <Shield className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-md border-2 border-slate-400 hover:shadow-md hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Drafts</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {documents.filter(d => d.status === 'draft').length}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <FileUp className="h-6 w-6 text-slate-800" />
            </div>
          </div>
        </div>
      </div>

      {/* Tool cards - Modern Design */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-black">Quick Actions</h2>
            <p className="mt-1 text-sm text-slate-900">Everything you need in one place</p>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TOOL_CARDS.map(({ to, icon: Icon, title, description, iconBg, hover }) => (
            <Link
              key={title}
              to={to}
              onClick={(e) => handleToolCardClick(e, to)}
              className={`group relative overflow-hidden rounded-xl bg-white p-6 shadow-md border-2 border-slate-400 transition-all duration-200 ${hover} hover:shadow-lg hover:-translate-y-0.5`}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} text-white transition-transform group-hover:scale-105`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold text-black group-hover:text-teal-800 transition-colors">
                {title}
              </h3>
              <p className="text-sm text-slate-800 leading-relaxed">{description}</p>
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-teal-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></div>
            </Link>
          ))}
        </div>
      </section>

      {/* Documents section */}
      <section id={DOCUMENTS_SECTION_ID} ref={documentsSectionRef}>
        <div className="rounded-2xl bg-white p-6 shadow-md border-2 border-slate-400">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                <FileSignature className="h-6 w-6 text-teal-700" />
                My Documents
              </h1>
              <p className="mt-1 text-sm text-slate-900">Manage and track all your documents</p>
            </div>
            <Link
              to={ROUTES.UPLOAD}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-teal-800 hover:shadow-xl"
            >
              <FileUp className="h-5 w-5 transition-transform group-hover:-translate-y-1" />
              Upload Document
            </Link>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                filter === value
                  ? 'bg-teal-700 text-white shadow-lg'
                  : 'bg-white text-slate-800 border-2 border-slate-400 hover:border-teal-500 hover:bg-teal-50'
              }`}
            >
              {label}
            </button>
          ))}
          {filter !== 'all' && (
            <span className="ml-2 text-sm font-medium text-slate-900">
              {filtered.length} {filter} document{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-lg">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
              <p className="text-sm font-medium text-slate-800">Loading documents...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white py-20 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-lg">
              <FileUp className="h-8 w-8" />
            </div>
            <p className="mt-6 text-xl font-bold text-black">
              {filter === 'all' ? 'No documents yet' : `No ${filter} documents`}
            </p>
            <p className="mt-2 text-sm text-slate-900 max-w-md mx-auto">
              {filter === 'all' ? 'Get started by uploading your first PDF document to begin signing.' : 'Try selecting a different filter to see more documents.'}
            </p>
            {filter === 'all' && (
              <Link
                to={ROUTES.UPLOAD}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-700 hover:shadow-lg"
              >
                <FileUp className="h-5 w-5" />
                Upload Your First Document
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((doc, index) => (
              <div key={doc.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                <DocumentCard document={doc} onDelete={(id) => handleDeleteClick(id, doc.title)} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, documentId: null, documentTitle: '' })}
        onConfirm={handleDeleteConfirm}
        title="Delete Document"
        itemName={deleteModal.documentTitle}
        isDeleting={deleting}
      />
    </div>
  );
}
