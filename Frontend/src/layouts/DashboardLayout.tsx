import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { ProfileModal } from '../components/ProfileModal';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex min-h-screen h-screen overflow-hidden">
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onProfileClick={() => setProfileOpen(true)}
      />
      <div className="dashboard-main-wrap relative flex flex-1 flex-col min-h-0 overflow-hidden">
        <Navbar 
          onMenuClick={() => setSidebarOpen(true)}
          onProfileClick={() => setProfileOpen(true)}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
