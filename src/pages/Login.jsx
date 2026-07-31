import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Store, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--az-surface-1)] text-az-text">

      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 border-r border-az-border bg-az-bg-alt"
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-[var(--az-accent-subtle)] border border-[var(--az-accent)] flex items-center justify-center az-glow-emerald overflow-hidden">
              <img src="/azaman-logo.png" alt="Azaman" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <p className="text-base font-bold text-[var(--az-text)] tracking-tight">AZAMAN</p>
              <p className="text-xs text-[var(--az-accent)] font-medium">Business Portal</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-[var(--az-text)] leading-tight mb-4">
            Manage your<br />
            <span style={{ color: 'var(--az-accent)' }}>business</span> with ease
          </h1>
          <p className="text-[var(--az-text-muted)] text-sm leading-relaxed">
            List products, receive payments, track orders, and grow your business on Ghana's most trusted P2P platform.
          </p>
        </div>

        {/* Feature list */}
        <div className="space-y-4">
          {[
            ['Secure Escrow Payments', 'Every order is protected by smart escrow'],
            ['Real-time Order Tracking', 'Know exactly where every order stands'],
            ['Instant Notifications',   'Get alerted the moment a customer pays'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--az-accent)] mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[var(--az-text)]">{title}</p>
                <p className="text-xs text-[var(--az-text-muted)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--az-text-muted)]">© 2026 Azaman. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-[var(--az-accent-subtle)] border border-[var(--az-accent)] flex items-center justify-center overflow-hidden">
              <img src="/azaman-logo.png" alt="Azaman" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--az-text)]">AZAMAN</p>
              <p className="text-xs text-[var(--az-accent)]">Business Portal</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[var(--az-text)] mb-2">Welcome back</h2>
          <p className="text-sm text-[var(--az-text-muted)] mb-8">Sign in to your business account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--az-text-muted)] uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-[var(--az-surface-1)] border border-az-border text-az-text text-sm placeholder:text-az-text-muted outline-none focus:border-az-accent focus:ring-1 focus:ring-az-accent transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--az-text-muted)] hover:text-[var(--az-text-muted)] transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-az-danger-subtle border border-az-danger-subtle">
                <AlertCircle className="w-4 h-4 text-az-danger flex-shrink-0" />
                <p className="text-xs text-az-danger font-medium">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          <p className="text-xs text-[var(--az-text-muted)] text-center mt-6">
            Need access? Contact your Azaman account manager.
          </p>
        </div>
      </div>
    </div>
  );
}
