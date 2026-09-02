import React, { useState } from 'react';
import { loginWithGoogle } from '../lib/firebase';
import { Sparkles, Shield, Compass, BookOpen, Lock, MessageSquare, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onLoginSuccess?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      // User closed popup or auth error
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
      {/* Top Bar */}
      <header className="w-full border-b border-stone-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif-journal text-xl font-bold tracking-tight text-stone-900">ReflectAI</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium tracking-wide">Gemini 3.6</span>
            </div>
          </div>

          <button
            id="nav-signin-btn"
            onClick={handleSignIn}
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 transition-colors disabled:opacity-50 shadow-xs"
          >
            {isLoading ? 'Signing in...' : 'Sign In with Google'}
          </button>
        </div>
      </header>

      {/* Main Hero & Content */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center justify-center text-center">
        {/* Subtle Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium mb-6">
          <Shield className="w-3.5 h-3.5 text-amber-700" />
          <span>Strict User-Isolated Cloud Firestore & Gemini Intelligence</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif-journal font-medium tracking-tight text-stone-950 max-w-3xl leading-[1.15]">
          A private sanctuary for deeper reflections & conversational clarity.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-stone-600 max-w-2xl font-light leading-relaxed">
          Write freely. Converse across multi-turn journal sessions with Gemini, distill key emotional themes, and keep every thought privately secured to your account.
        </p>

        {/* Sign In Card */}
        <div className="mt-10 w-full max-w-md p-6 sm:p-8 bg-white rounded-2xl border border-stone-200 shadow-xl shadow-stone-200/40">
          <button
            id="hero-google-signin-btn"
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 text-base font-medium rounded-xl text-stone-900 bg-white hover:bg-stone-50 border border-stone-300 shadow-xs transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isLoading ? 'Connecting with Google...' : 'Continue with Google'}</span>
          </button>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-left">
              {error}
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-stone-500">
            <Lock className="w-3.5 h-3.5 text-stone-400" />
            <span>Encrypted Firebase Auth &bull; Passwords never stored</span>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-white/80 border border-stone-200 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-serif-journal text-lg font-semibold text-stone-900">Multi-Turn Dialogue</h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Have nuanced back-and-forth conversations on any life situation with specialized AI reflection personas.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/80 border border-stone-200 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif-journal text-lg font-semibold text-stone-900">AI Synthesis & Takeaways</h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Automatically extract key insights, actionable intentions, emotional shifts, and executive summaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/80 border border-stone-200 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-serif-journal text-lg font-semibold text-stone-900">Firestore Isolation</h3>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Every document is bound strictly to your authenticated UID via Firebase security rules. Nobody else has access.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ReflectAI &bull; Powered by Google Gemini & Firebase Firestore</span>
          <span>End-to-End User Data Isolation</span>
        </div>
      </footer>
    </div>
  );
};
