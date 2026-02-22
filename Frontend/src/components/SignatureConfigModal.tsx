import { useState, useEffect } from 'react';
import { X, PenTool, Type, Building2 } from 'lucide-react';

interface SignatureConfig {
  fullName: string;
  initials: string;
  signatureStyle: 'simple' | 'formal' | 'bold' | 'classic' | 'cursive1' | 'cursive2' | 'cursive3' | 'cursive4' | 'elegant' | 'modern' | 'script' | 'casual' | 'professional' | 'artistic' | 'refined' | 'sleek';
  color: 'black' | 'red' | 'blue' | 'green';
  type: 'signature' | 'initials' | 'stamp';
}

interface SignatureConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: SignatureConfig) => void;
  initialName?: string;
  initialStyle?: string;
  initialColor?: 'black' | 'red' | 'blue' | 'green';
}

const SIGNATURE_STYLES = [
  // Cursive/Italic Styles
  { value: 'cursive1', label: 'Cursive 1', preview: 'Signature', className: 'font-serif italic text-[1.1em] tracking-wide' },
  { value: 'cursive2', label: 'Cursive 2', preview: 'Signature', className: 'font-sans italic text-[1.05em] tracking-wider' },
  { value: 'cursive3', label: 'Cursive 3', preview: 'Signature', className: 'font-mono italic text-[0.95em] tracking-widest' },
  { value: 'cursive4', label: 'Cursive 4', preview: 'Signature', className: 'font-sans font-bold italic text-[1.15em] tracking-tight' },
  { value: 'script', label: 'Script', preview: 'Signature', className: 'font-serif italic text-[1.2em] tracking-widest' },
  { value: 'casual', label: 'Casual', preview: 'Signature', className: 'font-sans italic text-[1.08em] tracking-normal' },
  
  // Standard Styles
  { value: 'simple', label: 'Simple', preview: 'Signature', className: 'font-sans text-base tracking-normal' },
  { value: 'modern', label: 'Modern', preview: 'Signature', className: 'font-sans text-[1.05em] tracking-tight' },
  { value: 'bold', label: 'Bold', preview: 'Signature', className: 'font-sans font-bold text-base tracking-normal' },
  { value: 'sleek', label: 'Sleek', preview: 'Signature', className: 'font-sans font-bold text-[0.95em] tracking-wider' },
  
  // Formal Styles
  { value: 'formal', label: 'Formal', preview: 'Signature', className: 'font-serif text-base tracking-wide' },
  { value: 'elegant', label: 'Elegant', preview: 'Signature', className: 'font-serif font-bold text-[0.98em] tracking-wide' },
  { value: 'professional', label: 'Professional', preview: 'Signature', className: 'font-serif text-[1.02em] tracking-normal' },
  { value: 'refined', label: 'Refined', preview: 'Signature', className: 'font-serif font-bold italic text-[1.05em] tracking-wide' },
  
  // Unique Styles
  { value: 'classic', label: 'Classic', preview: 'Signature', className: 'font-mono text-base tracking-normal' },
  { value: 'artistic', label: 'Artistic', preview: 'Signature', className: 'font-mono font-bold italic text-[1.1em] tracking-widest' },
] as const;

const COLORS = [
  { value: 'black', label: 'Black', hex: '#000000' },
  { value: 'red', label: 'Red', hex: '#EF4444' },
  { value: 'blue', label: 'Blue', hex: '#3B82F6' },
  { value: 'green', label: 'Green', hex: '#10B981' },
] as const;

export function SignatureConfigModal({
  isOpen,
  onClose,
  onApply,
  initialName = '',
  initialStyle = 'simple',
  initialColor = 'black',
}: SignatureConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'signature' | 'initials' | 'stamp'>('signature');
  const [fullName, setFullName] = useState(initialName);
  const [initials, setInitials] = useState(() => {
    // Auto-generate initials from initial name if provided
    if (initialName) {
      const parts = initialName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].substring(0, 2).toUpperCase();
      }
    }
    return '';
  });

  const [signatureStyle, setSignatureStyle] = useState<SignatureConfig['signatureStyle']>(
    (initialStyle as SignatureConfig['signatureStyle']) || 'simple'
  );
  const [color, setColor] = useState<SignatureConfig['color']>(initialColor);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName(initialName);
      setSignatureStyle((initialStyle as SignatureConfig['signatureStyle']) || 'simple');
      setColor(initialColor);
      setActiveTab('signature');
    }
  }, [isOpen, initialName, initialStyle, initialColor]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (activeTab === 'signature' && !fullName.trim()) {
      return;
    }
    if (activeTab === 'initials' && !initials.trim()) {
      return;
    }
    if (activeTab === 'stamp') {
      // Company stamp not implemented yet
      return;
    }
    onApply({
      fullName: fullName.trim(),
      initials: initials.trim(),
      signatureStyle,
      color,
      type: activeTab,
    });
    onClose();
  };

  const previewText = activeTab === 'signature' 
    ? (fullName || 'Your name') 
    : activeTab === 'initials' 
    ? (initials || 'AG')
    : 'Company Stamp';
  const selectedStyle = SIGNATURE_STYLES.find(s => s.value === signatureStyle) || SIGNATURE_STYLES[0];
  const selectedColor = COLORS.find(c => c.value === color) || COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-800">Set your signature details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Full name and Initials inputs */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <PenTool className="h-4 w-4 text-red-500" />
                Full name:
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  // Auto-generate initials when name is entered
                  const name = e.target.value.trim();
                  if (name) {
                    const parts = name.split(/\s+/);
                    if (parts.length >= 2) {
                      setInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
                    } else if (parts.length === 1 && parts[0].length >= 2) {
                      setInitials(parts[0].substring(0, 2).toUpperCase());
                    }
                  }
                }}
                placeholder="Your name"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Type className="h-4 w-4 text-red-500" />
                Initials:
              </label>
              <input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                placeholder="Your initials"
                maxLength={3}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('signature')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'signature'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <PenTool className="h-4 w-4" />
              Signature
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('initials')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'initials'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <Type className="h-4 w-4" />
              Initials
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stamp')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'stamp'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Company Stamp
            </button>
          </div>

          {/* Signature/Initials style selection */}
          {(activeTab === 'signature' || activeTab === 'initials') && (
            <>
              <div className="mb-4">
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  {activeTab === 'signature' ? 'Signature style' : 'Initials style'}
                </label>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {SIGNATURE_STYLES.map((style) => {
                    const displayText = activeTab === 'signature' 
                      ? (fullName || 'Your name')
                      : (initials || 'AG');
                    return (
                      <label
                        key={style.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                          signatureStyle === style.value
                            ? 'border-red-500 bg-red-50'
                            : 'border-transparent bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="signatureStyle"
                          value={style.value}
                          checked={signatureStyle === style.value}
                          onChange={(e) => setSignatureStyle(e.target.value as SignatureConfig['signatureStyle'])}
                          className="h-4 w-4 text-red-500 focus:ring-red-500"
                        />
                        <span
                          className={`text-lg ${style.className}`}
                          style={{ color: selectedColor.hex }}
                        >
                          {displayText}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Color selection */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Color:</label>
                <div className="flex gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value as SignatureConfig['color'])}
                      className={`h-10 w-10 rounded-full border-2 transition-all ${
                        color === c.value
                          ? 'border-slate-800 ring-2 ring-slate-300'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.label}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Company Stamp (placeholder) */}
          {activeTab === 'stamp' && (
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">Company Stamp</p>
              <p className="mt-1 text-xs text-slate-500">Coming soon</p>
            </div>
          )}

          {/* Preview */}
          {(activeTab === 'signature' || activeTab === 'initials') && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
              <div className="flex items-center justify-center rounded bg-white p-6 shadow-sm min-h-[80px]">
                <span
                  className={`text-2xl ${selectedStyle.className}`}
                  style={{ color: selectedColor.hex }}
                >
                  {previewText}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={
              (activeTab === 'signature' && !fullName.trim()) ||
              (activeTab === 'initials' && !initials.trim()) ||
              activeTab === 'stamp'
            }
            className="btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
