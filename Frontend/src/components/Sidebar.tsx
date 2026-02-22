import { useState } from 'react';
import { FileText, FileUp, History, LayoutDashboard, Trash2, X, Sparkles, TrendingUp, Clock, Shield, Zap, User, Copy } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES, SUPPORT_EMAIL } from '../utils/constants';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onProfileClick?: () => void;
}

const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.UPLOAD, label: 'Upload PDF', icon: FileUp },
  { to: ROUTES.AUDIT, label: 'Audit Trail', icon: History },
  { to: ROUTES.TRASH, label: 'Trash', icon: Trash2 },
];

export function Sidebar({ open, onClose, onProfileClick }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const input = document.createElement('input');
      input.value = SUPPORT_EMAIL;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`sidebar-wrap fixed left-0 top-0 z-50 h-screen w-72 transition-transform duration-300 lg:static lg:translate-x-0 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Section */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-6 lg:justify-start">
          <Link
            to={ROUTES.DASHBOARD}
            className="group flex items-center gap-3 font-bold tracking-tight text-white transition-transform hover:scale-105"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700/20 backdrop-blur-sm text-white shadow-lg transition-transform group-hover:rotate-6 group-hover:scale-110 border border-white/10">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg">DocuSeal</div>
              <div className="text-xs font-normal text-white/70">Document Management</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white hover:scale-110 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav flex flex-col gap-2 overflow-y-auto overflow-x-hidden flex-1 p-4">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            Navigation
          </p>
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              location.pathname === to ||
              (to === ROUTES.DASHBOARD && location.pathname.startsWith('/dashboard/documents') && !location.pathname.startsWith('/dashboard/trash')) ||
              (to === ROUTES.AUDIT && location.pathname === ROUTES.AUDIT) ||
              (to === ROUTES.TRASH && location.pathname === ROUTES.TRASH);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-700/25 text-white border border-teal-400/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span>{label}</span>
                {isActive && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse"></div>
                )}
              </Link>
            );
          })}

          {/* Quick Stats Section */}
          <div className="mt-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Quick Stats
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Shield className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/70">Secure</p>
                  <p className="text-sm font-bold text-white">Bank-level</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                  <Zap className="h-4 w-4 text-blue-300" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/70">Fast</p>
                  <p className="text-sm font-bold text-white">Instant Sign</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700/20">
                  <Clock className="h-4 w-4 text-teal-300" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-white/70">24/7</p>
                  <p className="text-sm font-bold text-white">Available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/60">
              Need Help?
            </p>
            <p className="text-xs text-white/70 leading-relaxed">
              Our support team is here to help you with any questions about document signing and management.
            </p>
            <div className="mt-3 flex gap-2">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=DocuSeal%20Support%20Request`}
                className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white transition-all hover:bg-white/20"
              >
                Contact Support
              </a>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-white/20 flex items-center gap-1.5"
                title="Copy email"
              >
                <Copy className="h-4 w-4 shrink-0" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="mt-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Tips
            </p>
            <div className="space-y-2">
              <div className="rounded-lg bg-white/5 p-2.5">
                <p className="text-xs font-semibold text-white mb-1">💡 Quick Tip</p>
                <p className="text-xs text-white/70 leading-relaxed">
                  Drag signature boxes to reposition them before signing
                </p>
              </div>
              <div className="rounded-lg bg-white/5 p-2.5">
                <p className="text-xs font-semibold text-white mb-1">🔒 Security</p>
                <p className="text-xs text-white/70 leading-relaxed">
                  All documents are encrypted and stored securely
                </p>
              </div>
            </div>
          </div>
        </nav>

        {/* User Profile - Compact */}
        {user && (
          <div className="shrink-0 border-t border-white/10 bg-black/10">
            <button
              onClick={() => {
                onProfileClick?.();
                onClose();
              }}
              className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-white/10 transition-colors"
              title={`${user.name || 'User'} - ${user.email}`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white text-sm font-bold">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-white truncate">{user.name || user.email || 'User'}</p>
                <p className="text-[11px] text-white/60 truncate">{user.email || ''}</p>
              </div>
              <User className="h-4 w-4 shrink-0 text-white/60" />
            </button>
          </div>
        )}

        {/* Footer - Compact */}
        <div className="shrink-0 border-t border-white/10 py-2 px-3">
          <div className="flex items-center justify-center gap-1.5">
            <FileText className="h-3 w-3 text-white/40" />
            <p className="text-[11px] text-white/40">DocuSeal © 2026</p>
          </div>
        </div>
      </aside>
    </>
  );
}
