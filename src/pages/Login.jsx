import { useState } from 'react';
import { m } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { Button, Input } from '@/components/instrument';
import { ParticleField } from "@/components/ParticleField";
import { spring } from '@/lib/motion';

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
    <div className="min-h-screen flex" style={{ background: 'var(--f-bg)' }}>

      {/* Left panel — branding with particle field */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 border-r relative overflow-hidden"
        style={{ borderColor: 'var(--line)', background: 'var(--surface-sunk)' }}>

        {/* Particle field */}
        <ParticleField color="#6C4FD1" count={400} />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 0%, var(--surface-sunk) 85%)' }} />

        <div className="relative z-10">
          {/* Logo */}
          <m.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-12"
          >
            <img src="/azaman-logo.png" alt="Azaman" className="w-10 h-10 rounded-xl object-contain"
              style={{ filter: 'drop-shadow(0 0 8px rgba(108, 79, 209, 0.4))' }} />
            <div>
              <p className="text-base font-bold tracking-tight" style={{ color: 'var(--text)' }}>AZAMAN</p>
              <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Business Portal</p>
            </div>
          </m.div>

          <m.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-bold leading-tight mb-4"
            style={{ color: 'var(--text)' }}
          >
            Manage your<br />
            <span style={{ color: 'var(--accent)' }}>business</span> with ease
          </m.h1>
          <m.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-3)' }}
          >
            List products, receive payments, track orders, and grow your business on Ghana's most trusted P2P platform.
          </m.p>
        </div>

        {/* Feature list */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative z-10 space-y-4"
        >
          {[
            ['Secure Escrow Payments', 'Every order is protected by smart escrow'],
            ['Real-time Order Tracking', 'Know exactly where every order stands'],
            ['Instant Notifications',   'Get alerted the moment a customer pays'],
          ].map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--accent)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </m.div>

        <p className="text-xs relative z-10" style={{ color: 'var(--text-3)' }}>© 2026 Azaman. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'var(--f-bg)' }}>
        <m.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/azaman-logo.png" alt="Azaman" className="w-9 h-9 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>AZAMAN</p>
              <p className="text-xs" style={{ color: 'var(--accent)' }}>Business Portal</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>Sign in to your business account</p>

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
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="f-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <m.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={spring.press}
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'var(--f-bad-bg)', border: '1px solid var(--f-bad-bg)' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--stop)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--stop)' }}>{error}</p>
              </m.div>
            )}

            <m.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.08 }}>
              <Button type="submit" className="w-full mt-2"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {loading ? null : <div className="flex items-center gap-2"><LogIn className="w-4 h-4" />Sign In</div>}
              </Button>
            </m.div>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: 'var(--text-3)' }}>
            Need access? Contact your Azaman account manager.
          </p>
        </m.div>
      </div>
    </div>
  );
}
