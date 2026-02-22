import { FileText, Trash2, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import type { Document } from '../types';
import { getViewDocumentPath } from '../utils/constants';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  showDeleteButton?: boolean;
}

export function DocumentCard({ document, onDelete, showDeleteButton = true }: DocumentCardProps) {
  const date = document.created_at ? new Date(document.created_at).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  }) : '';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;
    onDelete(document.id);
  };

  const viewPath = getViewDocumentPath(document.id);
  const isSigned = document.status === 'signed';

  return (
    <div className="group relative flex flex-col rounded-xl bg-white p-6 shadow-md border-2 border-slate-400 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-teal-500">
      {/* Action Buttons Container - Top Right with proper spacing */}
      {onDelete && showDeleteButton && (
        <div className="absolute right-5 top-5 z-10">
          <button
            type="button"
            onClick={handleDeleteClick}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border-2 border-slate-300 text-slate-600 shadow-md transition-all hover:bg-red-50 hover:border-red-300 hover:text-red-600 hover:shadow-lg hover:scale-110 active:scale-95"
            aria-label="Delete document"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}

      <Link to={viewPath} className="flex flex-1 flex-col">
        <div className={`mb-4 flex items-start justify-between gap-3 ${onDelete && showDeleteButton ? 'pr-16' : ''}`}>
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
            isSigned 
              ? 'bg-teal-700' 
              : 'bg-teal-700'
          } text-white transition-transform group-hover:scale-105`}>
            <FileText className="h-7 w-7" />
          </div>
          <StatusBadge status={document.status} />
        </div>
        <h3 className="mb-3 text-lg font-bold text-black line-clamp-2 group-hover:text-teal-800 transition-colors">
          {document.title}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </div>
  );
}
