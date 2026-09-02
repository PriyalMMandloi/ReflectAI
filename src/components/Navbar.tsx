import React, { useState } from 'react';
import { type User, logoutUser } from '../lib/firebase';
import { Sparkles, Plus, LogOut, User as UserIcon, Menu, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  user: User;
  onNewEntry: () => void;
  entriesCount: number;
  onToggleMobileSidebar: () => void;
  isMobileSidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onNewEntry,
  entriesCount,
  onToggleMobileSidebar,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="h-16 border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Left branding and mobile toggle */}
      <div className="flex items-center gap-3">
        <button
          id="mobile-sidebar-toggle-btn"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Toggle history menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif-journal text-lg font-bold text-stone-900 leading-none block">
              ReflectAI
            </span>
            <span className="text-[10px] text-stone-500 font-medium hidden sm:inline-block">
              Private Journal &bull; Gemini 3.6
            </span>
          </div>
        </div>
      </div>

      {/* Center / Right actions */}
      <div className="flex items-center gap-3">
        <button
          id="new-reflection-btn"
          onClick={onNewEntry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg text-stone-900 bg-amber-100 hover:bg-amber-200/80 border border-amber-300/80 transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-900" />
          <span>New Reflection</span>
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 pr-1 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <span className="text-xs font-medium text-stone-700 max-w-[120px] truncate hidden md:inline-block">
              {user.displayName || user.email?.split('@')[0] || 'User'}
            </span>
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-7 h-7 rounded-full object-cover border border-stone-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-medium">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2 border-b border-stone-100">
                  <p className="text-xs font-semibold text-stone-900 truncate">
                    {user.displayName || 'Journaler'}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">
                    {user.email}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Firestore Private Isolated</span>
                  </div>
                </div>

                <div className="px-4 py-2 text-xs text-stone-600 flex justify-between items-center border-b border-stone-100">
                  <span>Saved Reflections</span>
                  <span className="font-semibold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-full">
                    {entriesCount}
                  </span>
                </div>

                <div className="p-1">
                  <button
                    id="user-signout-btn"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
