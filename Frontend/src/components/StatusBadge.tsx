import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import type { DocumentStatus } from '../types';

const STATUS_STYLES: Record<DocumentStatus, { bg: string; icon: typeof CheckCircle2 }> = {
  draft: { bg: 'bg-amber-700', icon: Clock },
  pending: { bg: 'bg-sky-700', icon: AlertCircle },
  signed: { bg: 'bg-teal-800', icon: CheckCircle2 },
  rejected: { bg: 'bg-red-700', icon: XCircle },
};

interface StatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  const Icon = style.icon;
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm ${style.bg} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="capitalize">{status}</span>
    </span>
  );
}
