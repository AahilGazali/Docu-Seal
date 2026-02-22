import { useState, useEffect } from 'react';
import { User, Mail, Shield, Bell, Lock, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api/axios';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';
import { TwoFactorModal } from '../../components/TwoFactorModal';

export function Settings() {
  const { user, setUser } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const fetch2FAStatus = async () => {
    try {
      const { data } = await api.get<{ enabled: boolean }>('/api/auth/2fa/status');
      setTwoFactorEnabled(data?.enabled ?? false);
    } catch {
      setTwoFactorEnabled(false);
    }
  };

  useEffect(() => {
    fetch2FAStatus();
  }, []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    language: user?.language || 'en',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        language: user.language || 'en',
      });
    }
  }, [user]);

  const handleLanguageChange = async (newLanguage: string) => {
    // Update local state immediately for UI responsiveness
    setFormData({ ...formData, language: newLanguage });
    
    // Save to backend
    try {
      const { data } = await api.put('/api/auth/profile', {
        name: formData.name,
        language: newLanguage,
      });
      
      if (data?.user) {
        setUser(data.user);
      }
    } catch (error: any) {
      console.error('Failed to save language:', error);
      // Revert on error
      setFormData({ ...formData, language: user?.language || 'en' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      console.log('Attempting to save settings...');
      console.log('API base URL:', import.meta.env.VITE_API_URL || 'not set (using relative URL)');
      const { data } = await api.put('/api/auth/profile', {
        name: formData.name,
        language: formData.language,
      });
      
      if (data?.user) {
        setUser(data.user);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      }
    } catch (error: any) {
      let errorMsg = 'Failed to save settings';
      
      // Check for network errors first
      if (!error?.response) {
        errorMsg = 'Network error: Could not connect to backend server. Please make sure the backend is running.';
      } else if (error?.response?.status === 404) {
        errorMsg = `API endpoint not found (404).\n\nPlease check:\n1. Backend server is running\n2. API URL is configured correctly\n3. Route: PUT /api/auth/profile exists\n\nRequested URL: ${error?.config?.url || 'unknown'}`;
      } else if (error?.response?.status === 401) {
        errorMsg = 'Unauthorized. Please log in again.';
      } else if (error?.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error?.message) {
        errorMsg = error.message;
      }
      
      // Check if it's a migration error
      if (errorMsg.includes('column') || errorMsg.includes('migration') || errorMsg.includes('does not exist')) {
        errorMsg += '\n\nPlease run the migration SQL in Backend/migrations/add-user-preferences.sql in your Supabase SQL Editor.';
      }
      
      setMessage({ type: 'error', text: errorMsg });
      console.error('Settings save error:', error);
      console.error('Error details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        url: error?.config?.url,
        baseURL: error?.config?.baseURL,
        message: error?.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-slate-400">
        <h1 className="text-2xl font-bold text-black flex items-center gap-2">
          <Shield className="h-6 w-6 text-teal-700" />
          Settings
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-900">Manage your account settings and preferences</p>
      </div>

      {/* Profile Settings */}
      <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-slate-400">
        <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-teal-700" />
          Profile Settings
        </h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-11 pr-4 py-3 rounded-lg border-2 border-slate-300 bg-white text-slate-950 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                className="w-full pl-11 pr-4 py-3 rounded-lg border-2 border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all bg-slate-50 text-slate-900"
                placeholder="your@email.com"
                disabled
              />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-700">Email cannot be changed</p>
          </div>

          {message && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium whitespace-pre-line ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-800 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-slate-400">
        <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-teal-700" />
          Security
        </h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg border-2 border-slate-300 bg-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">Password</p>
              <p className="text-xs text-slate-700">Last changed: Never</p>
            </div>
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="rounded-lg border-2 border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50 transition-colors"
            >
              Change Password
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border-2 border-slate-300 bg-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-900">Two-Factor Authentication</p>
              <p className="text-xs text-slate-700">
                {twoFactorEnabled ? 'Enabled' : 'Add an extra layer of security'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShow2FAModal(true)}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                twoFactorEnabled
                  ? 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                  : 'border-teal-200 bg-white text-teal-600 hover:bg-teal-50'
              }`}
            >
              {twoFactorEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => setMessage({ type: 'success', text: 'Password changed successfully!' })}
      />

      <TwoFactorModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onSuccess={() => {
          fetch2FAStatus();
          setMessage({ type: 'success', text: twoFactorEnabled ? '2FA disabled.' : '2FA enabled successfully!' });
        }}
        mode={twoFactorEnabled ? 'disable' : 'setup'}
        twoFactorEnabled={twoFactorEnabled}
      />

      {/* Preferences */}
      <div className="rounded-2xl bg-white p-6 shadow-lg border-2 border-slate-400">
        <h2 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-teal-700" />
          Preferences
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Email Notifications</p>
              <p className="text-xs text-slate-700">Receive email updates about your documents</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Language</p>
              <p className="text-xs text-slate-700">Choose your preferred language</p>
            </div>
            <select
              value={formData.language}
              onChange={(e) => {
                const newLanguage = e.target.value;
                setFormData({ ...formData, language: newLanguage });
                // Save language immediately when changed
                handleLanguageChange(newLanguage);
              }}
              className="rounded-lg border-2 border-slate-300 bg-white text-slate-950 px-3 py-2 text-sm font-semibold focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
