import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Mail, Calendar, Shield, LogOut, Settings, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      onClose();
    } finally {
      setLoggingOut(false);
    }
  };

  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return 'U';
    }
    const trimmedName = name.trim();
    const parts = trimmedName.split(/\s+/).filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (trimmedName.length >= 2) {
      return trimmedName.substring(0, 2).toUpperCase();
    }
    return trimmedName.substring(0, 1).toUpperCase();
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
          className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative rounded-t-2xl bg-gradient-to-r from-teal-700 to-slate-800 p-6 text-white">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-2xl font-bold shadow-lg">
                {getInitials(user?.name)}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user?.name || user?.email || 'User'}</h2>
                <p className="text-white/90 mt-1">{user?.email || ''}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Account Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Account Information</h3>
              
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                    <User className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-700 font-medium">Full Name</p>
                    <p className="text-sm font-semibold text-slate-900">{user?.name || 'Not set'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-700 font-medium">Email Address</p>
                    <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
                  </div>
                </div>
                
                {user?.created_at && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                      <Calendar className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-700 font-medium">Member Since</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(user.created_at).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Quick Actions</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/dashboard/settings');
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-300 hover:bg-teal-50 hover:scale-105"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                    <Settings className="h-5 w-5 text-teal-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Settings</span>
                </button>
                
                <button
                  onClick={() => {
                    onClose();
                    navigate(`${ROUTES.DASHBOARD}#documents`);
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:bg-blue-50 hover:scale-105"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">Documents</span>
                </button>
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900">Account Security</p>
                  <p className="text-xs text-emerald-700 mt-1">Your account is secured with bank-level encryption</p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
