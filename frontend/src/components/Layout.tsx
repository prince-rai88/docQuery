import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CommandPalette } from './CommandPalette';

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const isDashboardActive = location.pathname === '/';
  const isUploadActive = location.pathname.startsWith('/upload');

  return (
    <div className="min-h-screen bg-canvas">
      <CommandPalette />

      <nav className="sticky top-0 z-40 bg-canvas/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-base font-semibold text-ink tracking-tight">DocQuery</span>
              </div>

              <div className="hidden sm:flex sm:items-center sm:gap-1">
                <Link
                  to="/"
                  className={isDashboardActive ? 'nav-pill-active' : 'nav-pill-inactive'}
                >
                  Dashboard
                </Link>
                <Link
                  to="/upload"
                  className={isUploadActive ? 'nav-pill-active' : 'nav-pill-inactive'}
                >
                  Upload
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs text-ink-faint bg-surface border border-border rounded-card hover:bg-white/5 hover:text-ink-muted active:bg-white/10 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <span>Search</span>
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-border rounded text-[10px]">⌘K</kbd>
              </button>
              <button onClick={handleLogout} className="btn-ghost">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
