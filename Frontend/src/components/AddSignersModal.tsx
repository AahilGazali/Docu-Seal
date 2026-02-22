import { useState } from 'react';
import { X, User, Mail, Plus, Trash2, GripVertical, Calendar, Clock, Send } from 'lucide-react';
import { api } from '../api/axios';

interface Signer {
  id: string;
  name: string;
  email: string;
  role: 'signer' | 'viewer' | 'cc';
  signing_order?: number;
}

interface AddSignersModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  onSuccess?: () => void;
}

export function AddSignersModal({ isOpen, onClose, documentId, documentTitle, onSuccess }: AddSignersModalProps) {
  const [signers, setSigners] = useState<Signer[]>([
    { id: '1', name: '', email: '', role: 'signer' },
  ]);
  const [requiresOrder, setRequiresOrder] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const addSigner = () => {
    setSigners([...signers, { id: Date.now().toString(), name: '', email: '', role: 'signer' }]);
  };

  const removeSigner = (id: string) => {
    if (signers.length > 1) {
      setSigners(signers.filter(s => s.id !== id));
    }
  };

  const updateSigner = (id: string, field: keyof Signer, value: string | number) => {
    setSigners(signers.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    // Validate
    const invalidSigners = signers.filter(s => !s.name.trim() || !s.email.trim());
    if (invalidSigners.length > 0) {
      setError('Please fill in name and email for all signers');
      return;
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = signers.filter(s => !emailRegex.test(s.email));
    if (invalidEmails.length > 0) {
      setError('Please enter valid email addresses');
      return;
    }

    // Check for duplicates
    const emails = signers.map(s => s.email.toLowerCase());
    if (new Set(emails).size !== emails.length) {
      setError('Duplicate email addresses are not allowed');
      return;
    }

    // Assign signing order if required
    const signersToSend = requiresOrder
      ? signers.map((s, index) => ({ ...s, signing_order: index + 1 }))
      : signers.map(({ signing_order, ...s }) => s);

    setSending(true);
    try {
      await api.post('/api/signers/add', {
        documentId,
        signers: signersToSend,
        requiresOrder,
        expiresAt: expiresAt || null,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset form
        setSigners([{ id: '1', name: '', email: '', role: 'signer' }]);
        setRequiresOrder(false);
        setExpiresAt('');
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl transform transition-all max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Create your signature request</h2>
              <p className="text-sm text-slate-700 mt-1">Add signers and send invitations via email</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Document Info */}
            <div className="mb-6 p-4 bg-teal-100 rounded-xl border-2 border-teal-300">
              <p className="text-sm font-semibold text-teal-900 mb-1">Document:</p>
              <p className="text-lg font-bold text-teal-700">{documentTitle}</p>
            </div>

            {/* Who will receive section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Who will receive your document?</h3>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <div className="text-amber-600 text-lg">💬</div>
                <p className="text-sm text-amber-800">Fill in the information of each receiver.</p>
              </div>

              <div className="space-y-3">
                {signers.map((signer, index) => (
                  <div key={signer.id} className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-teal-300 transition-colors bg-white">
                    {requiresOrder && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-sm mt-2">
                        {index + 1}
                      </div>
                    )}
                    {!requiresOrder && (
                      <GripVertical className="h-5 w-5 text-slate-400 mt-2" />
                    )}
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={signer.name}
                          onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                          placeholder="Name"
                          className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="email"
                            value={signer.email}
                            onChange={(e) => updateSigner(signer.id, 'email', e.target.value)}
                            placeholder="Email"
                            className="w-full pl-10 pr-3 py-2 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                        <select
                          value={signer.role}
                          onChange={(e) => updateSigner(signer.id, 'role', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all"
                        >
                          <option value="signer">Signer</option>
                          <option value="viewer">Viewer</option>
                          <option value="cc">CC</option>
                        </select>
                      </div>
                    </div>

                    {signers.length > 1 && (
                      <button
                        onClick={() => removeSigner(signer.id)}
                        className="mt-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove signer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addSigner}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 rounded-lg transition-colors border-2 border-dashed border-teal-300"
              >
                <Plus className="h-4 w-4" />
                <span>ADD RECEIVER</span>
              </button>
            </div>

            {/* Settings */}
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-600" />
                Settings
              </h3>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-teal-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresOrder}
                    onChange={(e) => setRequiresOrder(e.target.checked)}
                    className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Set the order of receivers</p>
                    <p className="text-xs text-slate-700 mt-1">
                      Select this option to set a signing order. A signer won't receive a request until the previous person has completed their document.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-teal-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!expiresAt}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setExpiresAt('');
                      } else {
                        // Set default to 7 days from now
                        const date = new Date();
                        date.setDate(date.getDate() + 7);
                        setExpiresAt(date.toISOString().split('T')[0]);
                      }
                    }}
                    className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-teal-600" />
                      <p className="text-sm font-semibold text-slate-900">Change expiration date</p>
                    </div>
                    {expiresAt && (
                      <input
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-2 px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all"
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800 font-semibold">✓ Invitations sent successfully!</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={sending || success}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-lg hover:from-red-600 hover:to-rose-700 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : success ? 'Sent!' : 'Send Invitations'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
