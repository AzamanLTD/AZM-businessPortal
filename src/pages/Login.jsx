import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import ParticleField from '@/components/ui/ParticleField';
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
        style={{ borderColor: 'var(--f-line)', background: 'var(--az-bg-alt)' }}>

        {/* Particle field */}
        <ParticleField color="#6C4FD1" count={400} />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 0%, var(--az-bg-alt) 85%)' }} />

        <div className="relative z-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-12"
          >
            <img src="/azaman-logo.png" alt="Azaman" className="w-10 h-10 rounded-xl object-contain"
              style={{ filter: 'drop-shadow(0 0 8px rgba(108, 79, 209, 0.4))' }} />
            <div>
              <p className="text-base font-bold tracking-tight" style={{ color: 'var(--f-text)' }}>AZAMAN</p>
              <p className="text-xs font-medium" style={{ color: 'var(--f-tint-color)' }}>Business Portal</p>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-bold leading-tight mb-4"
            style={{ color: 'var(--f-text)' }}
          >
            Manage your<br />
            <span style={{ color: 'var(--f-tint-color)' }}>business</span> with ease
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-sm leading-relaxed"
            style={{ color: 'var(--f-text-3)' }}
          >
            List products, receive payments, track orders, and grow your business on Ghana's most trusted P2P platform.
          </motion.p>
        </div>

        {/* Feature list */}
        <motion.div
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
              <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--f-tint-color)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--f-text)' }}>{title}</p>
                <p className="text-xs" style={{ color: 'var(--f-text-3)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <p className="text-xs relative z-10" style={{ color: 'var(--f-text-3)' }}>© 2026 Azaman. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'var(--f-bg)' }}>
        <motion.div
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/azaman-logo.png" alt="Azaman" className="w-9 h-9 rounded-xl object-contain" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--f-text)' }}>AZAMAN</p>
              <p className="text-xs" style={{ color: 'var(--f-tint-color)' }}>Business Portal</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--f-text)' }}>Welcome back</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--f-text-3)' }}>Sign in to your business account</p>

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
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--f-text-3)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="az-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--f-text-3)' }}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={spring.snappy}
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'var(--az-danger-subtle)', border: '1px solid var(--az-danger-subtle)' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--f-bad)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--f-bad)' }}>{error}</p>
              </motion.div>
            )}

            <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.08 }}>
              <Button type="submit" className="w-full mt-2"
                style={{ background: 'var(--f-tint-color)', color: '#fff' }}>
                {loading ? null : <div className="flex items-center gap-2"><LogIn className="w-4 h-4" />Sign In</div>}
              </Button>
            </motion.div>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: 'var(--f-text-3)' }}>
            Need access? Contact your Azaman account manager.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
