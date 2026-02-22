import { useState, useRef, useEffect } from 'react';
import { Menu, User, ChevronDown, Settings, FileText, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';

interface NavbarProps {
  onMenuClick?: () => void;
  title?: string;
  onProfileClick?: () => void;
}

export function Navbar({ onMenuClick, title = 'DocuSeal', onProfileClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return null; // Return null to show icon instead
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

  const handleProfileClick = () => {
    setProfileOpen(false);
    onProfileClick?.();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setProfileOpen(false);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="navbar-bar sticky top-0 z-30 flex h-16 items-center justify-between px-4 lg:px-8 border-b border-white/10 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-xl p-2.5 text-white/90 transition-all hover:bg-white/20 hover:scale-110 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <span className="nav-title text-xl font-bold tracking-tight text-white">
          {title}
        </span>
      </div>
      {user && (
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2 border border-white/20 transition-all hover:bg-white/20 hover:scale-105"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white text-sm font-bold">
              {getInitials(user.name) || <User className="h-4 w-4" />}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs text-white/70">My Profile</span>
              <span className="text-sm font-semibold text-white line-clamp-1 max-w-[120px]">{user.name || user.email || 'User'}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-50">
              {/* User Info Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 text-white text-lg font-bold shadow-lg">
                    {getInitials(user.name) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name || user.email || 'User'}</p>
                    <p className="text-xs text-slate-600 truncate">{user.email || ''}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-2 space-y-1">
                <button
                  onClick={handleProfileClick}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors group"
                >
                  <User className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>View Profile</span>
                </button>
                
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/dashboard/settings');
                  }}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors group"
                >
                  <Settings className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Settings</span>
                </button>
                
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate(`${ROUTES.DASHBOARD}#documents`);
                  }}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors group"
                >
                  <FileText className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>My Documents</span>
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 my-1"></div>

              {/* Logout */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors group disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
