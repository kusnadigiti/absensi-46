import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  ClipboardList, 
  Settings, 
  LogOut,
  Menu,
  X,
  BookOpen
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'guru', 'tenaga_kependidikan'] },
    { path: '/app/absensi-siswa', label: 'Absensi Siswa', icon: GraduationCap, roles: ['admin', 'guru'] },
    { path: '/app/rekap-absensi', label: 'Rekap Absensi', icon: ClipboardList, roles: ['admin', 'guru'] },
    { path: '/app/data-siswa', label: 'Data Siswa', icon: Users, roles: ['admin'] },
    { path: '/app/data-kelas', label: 'Data Kelas', icon: BookOpen, roles: ['admin'] },
    { path: '/app/user-management', label: 'User Management', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => profile?.role && item.roles.includes(profile.role));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-blue-700 text-white rounded-md shadow-md"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-center h-20 border-b border-slate-100">
          <h1 className="text-xl font-bold text-blue-700">SMKN 46 Jakarta</h1>
        </div>
        <div className="px-4 py-6">
          <div className="mb-6 px-4">
            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Menu Utama</p>
          </div>
          <nav className="space-y-1">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors",
                    isActive 
                      ? "bg-blue-50 text-blue-700" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={clsx("mr-3 h-5 w-5", isActive ? "text-blue-700" : "text-slate-400")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-20 bg-white shadow-sm flex items-center justify-between px-8 lg:px-10 z-10">
          <div className="flex-1"></div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{profile?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{profile?.role.replace('_', ' ')}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              {profile?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button 
              onClick={handleLogout}
              className="ml-4 p-2 text-slate-400 hover:text-blue-700 transition-colors rounded-full hover:bg-blue-50"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
