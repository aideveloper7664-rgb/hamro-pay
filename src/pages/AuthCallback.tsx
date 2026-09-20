import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<string>('Authenticating with Google...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        // Parse current session from URL or Supabase client
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Supabase session error:', error);
          if (isMounted) {
            setErrorMessage(error.message || 'Authentication failed');
            setTimeout(() => {
              window.location.href = '/login?error=auth_failed';
            }, 2000);
          }
          return;
        }

        if (session?.access_token) {
          if (isMounted) setStatus('Exchanging credentials with HamroPay backend...');
          
          // Send to our backend
          const res = await fetch('https://hamropay-backends.onrender.com/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: session.access_token })
          });
          const data = await res.json();
          if (data.success) {
            localStorage.setItem('hamropay_token', data.data.token);
            localStorage.setItem('hamropay_merchant', JSON.stringify(data.data.merchant));
            localStorage.setItem('hamro_is_logged_in', 'true');
            if (isMounted) setStatus('Authentication successful! Redirecting...');
            window.location.href = '/dashboard';
          } else {
            console.error('Backend Google Auth exchange error:', data);
            if (isMounted) {
              setErrorMessage(data.message || 'Failed to sync merchant account with backend.');
              setTimeout(() => {
                window.location.href = '/login?error=auth_failed';
              }, 2500);
            }
          }
        } else {
          // Listen for session change if not immediately populated from url hash
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (currentSession?.access_token) {
              subscription.unsubscribe();
              if (isMounted) setStatus('Exchanging credentials with HamroPay backend...');
              
              const res = await fetch('https://hamropay-backends.onrender.com/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_token: currentSession.access_token })
              });
              const data = await res.json();
              if (data.success) {
                localStorage.setItem('hamropay_token', data.data.token);
                localStorage.setItem('hamropay_merchant', JSON.stringify(data.data.merchant));
                localStorage.setItem('hamro_is_logged_in', 'true');
                window.location.href = '/dashboard';
              } else {
                window.location.href = '/login?error=auth_failed';
              }
            }
          });

          // Fallback check after 6s
          setTimeout(() => {
            if (!localStorage.getItem('hamropay_token')) {
              if (isMounted) {
                setErrorMessage('Session timeout. Please try logging in again.');
                setTimeout(() => {
                  window.location.href = '/login?error=no_session';
                }, 2000);
              }
            }
          }, 6000);
        }
      } catch (err: any) {
        console.error('AuthCallback error:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'An error occurred during authentication.');
          setTimeout(() => {
            window.location.href = '/login?error=auth_failed';
          }, 2000);
        }
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#070102] text-white flex flex-col justify-center items-center p-4 font-sans selection:bg-rose-600">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full text-center bg-[#120306] border border-rose-950/80 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-rose-600/20 blur-2xl pointer-events-none" />
        
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/60 relative z-10">
          <Wallet className="w-7 h-7 stroke-[2.5]" />
        </div>

        <div className="relative z-10 space-y-2">
          <h2 className="text-lg font-black tracking-tight text-white">
            Hamro<span className="text-rose-500">Pay</span> Authentication
          </h2>

          {errorMessage ? (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-xs bg-rose-950/60 py-2 px-3 rounded-xl border border-rose-800/40">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <p className="text-[11px] text-slate-400">Redirecting back to login screen...</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <Loader2 className="w-6 h-6 text-rose-500 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-rose-200/90 animate-pulse">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
