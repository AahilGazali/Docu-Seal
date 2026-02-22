import { GripVertical, PenTool, Type, User, Calendar, FileText, Building2, Pencil, X } from 'lucide-react';

interface Field {
  id: string;
  type: 'signature' | 'initials' | 'name' | 'date' | 'text' | 'stamp';
  label: string;
  value?: string;
  required?: boolean;
  page: number;
}

interface FieldsListProps {
  fields: Field[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSign?: () => void;
  signing?: boolean;
}

function FieldItem({ field, onEdit, onDelete }: { field: Field; onEdit?: (id: string) => void; onDelete?: (id: string) => void }) {

  const getIcon = () => {
    switch (field.type) {
      case 'signature':
        return <PenTool className="h-5 w-5" />;
      case 'initials':
        return <Type className="h-5 w-5" />;
      case 'name':
        return <User className="h-5 w-5" />;
      case 'date':
        return <Calendar className="h-5 w-5" />;
      case 'text':
        return <FileText className="h-5 w-5" />;
      case 'stamp':
        return <Building2 className="h-5 w-5" />;
      default:
        return <PenTool className="h-5 w-5" />;
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="cursor-grab text-slate-500 hover:text-slate-700 active:cursor-grabbing">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="font-medium text-slate-800">{field.label}</div>
        {field.value && (
          <div className="mt-0.5 text-sm text-slate-700 line-clamp-1">{field.value}</div>
        )}
      </div>
      {onEdit && (
        <button
          type="button"
          onClick={() => onEdit(field.id)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Edit field"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(field.id)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
          aria-label="Delete field"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {field.required && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
          1
        </div>
      )}
    </div>
  );
}

export function FieldsList({ fields, onEdit, onDelete, onSign, signing = false }: FieldsListProps) {
  const requiredFields = fields.filter(f => f.required);
  const optionalFields = fields.filter(f => !f.required);

  return (
    <div className="space-y-6">
      {/* Required Fields */}
      {requiredFields.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Required fields
          </h3>
          <div className="space-y-2">
            {requiredFields.map((field) => (
              <FieldItem key={field.id} field={field} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Optional Fields */}
      {optionalFields.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">
            Optional fields
          </h3>
          <div className="space-y-2">
            {optionalFields.map((field) => (
              <FieldItem key={field.id} field={field} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Sign Button */}
      {fields.length > 0 && onSign && (
        <button
          type="button"
          onClick={onSign}
          disabled={signing}
          className="btn-primary w-full rounded-lg px-6 py-3 text-base font-semibold disabled:opacity-50"
        >
          {signing ? 'Signing...' : 'Sign'}
        </button>
      )}
    </div>
  );
}
