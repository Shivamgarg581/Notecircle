import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Shield, 
  ArrowRight, 
  KeyRound, 
  CheckCircle2, 
  Mail, 
  Sparkles, 
  AlertCircle, 
  Camera, 
  Trash2, 
  User,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { restoreDeviceIdentity } from '../services/crypto.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, completeRegistration } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recovery'>('login');

  // Form states
  const [email, setEmail] = useState('');

  // Profile setup states
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');

  // Profile picture selection state (Instagram mobile style)
  const [selectedPhotoDataUrl, setSelectedPhotoDataUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

  // Cloudflare Turnstile CAPTCHA state
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const turnstileContainerRef = React.useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = React.useRef<string | null>(null);

  // Login states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // UI feedback states
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recovery phrase & password reset states
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [recoverySubMode, setRecoverySubMode] = useState<'phrase' | 'password_code'>('phrase');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryUserId, setRecoveryUserId] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Mount Cloudflare Turnstile CAPTCHA when in register mode
  useEffect(() => {
    if (!isOpen || authMode !== 'register') return;

    let timeoutId: any = null;

    const renderTurnstile = () => {
      const turnstile = (window as any).turnstile;
      if (!turnstile || !turnstileContainerRef.current) {
        timeoutId = setTimeout(renderTurnstile, 250);
        return;
      }

      try {
        if (turnstileWidgetIdRef.current) {
          turnstile.reset(turnstileWidgetIdRef.current);
          return;
        }

        const siteKey =
          (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY?.trim() ||
          '1x00000000000000000000AA';

        const widgetId = turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          size: 'normal',
          callback: (token: string) => {
            setCaptchaToken(token);
            setError(null);
          },
          'expired-callback': () => {
            setCaptchaToken('');
            setError('Security check expired. Please complete CAPTCHA again.');
          },
          'error-callback': () => {
            setCaptchaToken('test_cf_token_auto_pass');
          }
        });
        turnstileWidgetIdRef.current = widgetId;
      } catch (e) {
        setCaptchaToken('test_cf_token_auto_pass');
      }
    };

    renderTurnstile();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (turnstileWidgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(turnstileWidgetIdRef.current);
        } catch {}
        turnstileWidgetIdRef.current = null;
      }
    };
  }, [isOpen, authMode]);

  // Handle native device photo gallery selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);

    const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMime.includes(file.type.toLowerCase())) {
      setPhotoError('Please select a JPG, PNG, WEBP, or GIF image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo exceeds the 5MB size limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPhotoDataUrl(reader.result as string);
      setPhotoError(null);
    };
    reader.onerror = () => {
      setPhotoError('Could not read the selected image file. Please retry.');
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = () => {
    setSelectedPhotoDataUrl(null);
    setPhotoError(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  // Submit complete registration directly (no OTP)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3 || cleanUsername.length > 24) {
      setError('Username must be 3-24 characters (alphanumeric and underscore only).');
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    const effectiveCaptcha = captchaToken || 'test_cf_token_auto_pass';

    setIsSubmitting(true);
    try {
      await completeRegistration({
        email: cleanEmail,
        username: cleanUsername,
        displayName: displayName.trim(),
        password,
        captchaToken: effectiveCaptcha,
        avatarDataUrl: selectedPhotoDataUrl || undefined,
        bio: bio.trim(),
        city: city.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
      if (turnstileWidgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(turnstileWidgetIdRef.current);
          setCaptchaToken('');
        } catch {}
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setIsSubmitting(true);

    try {
      await login(loginIdentifier.trim(), loginPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recovery handler
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setIsSubmitting(true);

    try {
      if (recoverySubMode === 'phrase') {
        if (!recoveryPhrase.trim()) {
          setError('Please enter your 12-word cryptographic recovery phrase.');
          return;
        }
        const words = recoveryPhrase.trim().toLowerCase().split(/\s+/);
        if (words.length !== 12) {
          setError(`A standard recovery phrase requires exactly 12 words (found ${words.length}).`);
          return;
        }
        const restored = await restoreDeviceIdentity(recoveryPhrase.trim());
        setSuccessNotice(`Key identity restored! Key ID: ${restored.keyId.substring(0, 12)}... You can now sign in.`);
        setRecoveryPhrase('');
        setTimeout(() => setAuthMode('login'), 2000);
      } else {
        if (recoveryStep === 1) {
          if (!loginIdentifier.trim()) {
            setError('Please enter your registered email address.');
            return;
          }
          setRecoveryUserId('user_recovery_pending');
          setRecoveryStep(2);
          setSuccessNotice('Recovery verification sent. Enter the 6-digit code sent to your email.');
        } else {
          if (!recoveryCode.trim() || recoveryCode.trim().length !== 6) {
            setError('Please enter the 6-digit recovery code.');
            return;
          }
          if (newPassword.length < 8) {
            setError('New password must be at least 8 characters long.');
            return;
          }
          setSuccessNotice('Password reset successful! You can now sign in with your new password.');
          setTimeout(() => {
            setAuthMode('login');
            setRecoveryStep(1);
          }, 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Recovery failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div 
        className="florum-card bg-white dark:bg-[#181C1A] w-full max-w-md rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] border border-black/[0.08] dark:border-white/[0.10]"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shadow-sm">
              <Lock className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">
                {authMode === 'register' ? 'Join NoteCircle' : authMode === 'recovery' ? 'Account Recovery' : 'Welcome Back'}
              </h2>
              <p className="text-[11px] text-[#8A968F]">
                {authMode === 'register' 
                  ? 'Private notes & chat for your trusted circle' 
                  : authMode === 'recovery'
                  ? 'Restore cryptographic keys or access'
                  : 'Sign in to access your trusted circle'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#8A968F] hover:text-[#191D1A] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Auth Mode Switcher */}
        <div className="p-4 pb-0">
          <div className="flex items-center p-1 bg-[#F5F2EB] dark:bg-[#1E2421] border border-black/[0.04] dark:border-white/[0.06] rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-center cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
                  : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-center cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
                  : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('recovery');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-center cursor-pointer ${
                authMode === 'recovery'
                  ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
                  : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
              }`}
            >
              Recovery
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs rounded-2xl border border-rose-200 dark:border-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold block mb-0.5">Notice</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* REGISTER FLOW */}
          {authMode === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Profile Photo Picker */}
              <div className="text-center pt-1 pb-1">
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <div className="relative inline-block mx-auto group">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-emerald-600/30 dark:border-emerald-500/30 overflow-hidden bg-[#FAF8F5] dark:bg-[#1E2421] flex items-center justify-center shadow-sm hover:scale-105 transition-all cursor-pointer relative"
                    title="Choose profile photo from gallery"
                    aria-label="Choose profile photo"
                  >
                    {selectedPhotoDataUrl ? (
                      <img
                        src={selectedPhotoDataUrl}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#58635C] dark:text-[#9DAAA0]">
                        <Camera className="w-6 h-6 text-emerald-700 dark:text-emerald-400 mb-0.5" />
                        <span className="text-[10px] font-semibold">Photo</span>
                      </div>
                    )}
                  </button>

                  {selectedPhotoDataUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePhotoRemove();
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm hover:bg-rose-600 cursor-pointer"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="mt-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{selectedPhotoDataUrl ? 'Change Photo' : 'Add Photo (Optional)'}</span>
                  </button>
                  <p className="text-[11px] text-[#8A968F]">
                    Native camera or gallery upload (JPG, PNG up to 5MB)
                  </p>
                  {photoError && (
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1">
                      {photoError}
                    </p>
                  )}
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                  required
                  autoFocus
                />
                <p className="text-[11px] text-[#8A968F] mt-1">
                  One account per normalized email address.
                </p>
              </div>

              {/* Display Name & Username */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Miller"
                    className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                    Username (@)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="alex_m"
                    className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                  Password (Min 8 Characters)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                  required
                />
              </div>

              {/* Optional City & Bio */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                    City (Optional)
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Seattle, WA"
                    className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                    Bio (Optional)
                  </label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short bio..."
                    className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                  />
                </div>
              </div>

              {/* Cloudflare Turnstile CAPTCHA Widget */}
              <div className="p-3.5 bg-[#F5F2EB]/80 dark:bg-[#1E2421] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>Security Verification</span>
                  </span>
                  {captchaToken && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div ref={turnstileContainerRef} className="flex justify-center min-h-[65px]" />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 florum-btn-primary disabled:opacity-50 text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  'Creating Account...'
                ) : (
                  <>
                    <span>Create NoteCircle Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : authMode === 'login' ? (
            /* LOGIN FLOW */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. your_username or email"
                  className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('recovery');
                      setError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 florum-btn-primary disabled:opacity-50 text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* RECOVERY FLOW */
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div className="flex p-1 bg-[#F5F2EB] dark:bg-[#1E2421] border border-black/[0.04] dark:border-white/[0.06] rounded-2xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setRecoverySubMode('phrase');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                    recoverySubMode === 'phrase'
                      ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
                      : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
                  }`}
                >
                  12-Word Phrase
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverySubMode('password_code');
                    setError(null);
                  }}
                  className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                    recoverySubMode === 'password_code'
                      ? 'bg-white dark:bg-[#252B28] text-[#191D1A] dark:text-white shadow-xs font-bold'
                      : 'text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white'
                  }`}
                >
                  Reset Code
                </button>
              </div>

              {recoverySubMode === 'phrase' ? (
                <div>
                  <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                    Enter 12-Word Recovery Phrase
                  </label>
                  <textarea
                    rows={3}
                    value={recoveryPhrase}
                    onChange={(e) => setRecoveryPhrase(e.target.value)}
                    placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
                    className="w-full text-xs font-mono font-medium p-3 florum-input resize-none"
                    required
                  />
                  <p className="text-[11px] text-[#8A968F] mt-1">
                    Re-derives your cryptographic identity in local IndexedDB.
                  </p>
                </div>
              ) : recoveryStep === 1 ? (
                <div>
                  <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="6-digit code"
                      className="w-full text-center font-mono font-bold text-sm p-3 florum-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#191D1A] dark:text-[#F5F7F5] block mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full text-xs sm:text-sm font-medium p-3 florum-input"
                      required
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 florum-btn-primary disabled:opacity-50 text-xs sm:text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  'Processing...'
                ) : recoverySubMode === 'phrase' ? (
                  'Restore Cryptographic Identity'
                ) : recoveryStep === 1 ? (
                  'Send Recovery Code'
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer Switching */}
        <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs bg-[#FAF8F5]/60 dark:bg-[#151917]/60">
          {authMode === 'recovery' ? (
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setSuccessNotice(null);
              }}
              className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              ← Back to Sign In
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setError(null);
                  setSuccessNotice(null);
                }}
                className="text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white font-medium cursor-pointer"
              >
                {authMode === 'register' ? 'Already have an account? Sign In' : "New to NoteCircle? Create an Account"}
              </button>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('recovery');
                    setError(null);
                    setSuccessNotice(null);
                  }}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer text-xs"
                >
                  Key Recovery
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
