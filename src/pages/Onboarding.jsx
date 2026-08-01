import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { business as businessApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { Store, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: '',                   label: 'Select your business type...' },
  // ── Primary: Transit, Restaurants, Hotels ──────────────────────────────
  { value: 'LOGISTICS',          label: 'Transit & Transport' },
  { value: 'FOOD_BEVERAGE',      label: 'Restaurants' },
  { value: 'REAL_ESTATE',        label: 'Hotels & Stays' },
  // ── Secondary ───────────────────────────────────────────────────────────
  { value: 'RETAIL',             label: 'Retail' },
  { value: 'HEALTH_WELLNESS',    label: 'Health & Wellness' },
  { value: 'EDUCATION',          label: 'Education' },
  { value: 'ENTERTAINMENT',      label: 'Entertainment' },
  { value: 'FREELANCE_SERVICES', label: 'Services' },
  { value: 'TECHNOLOGY',         label: 'Technology' },
  { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
  { value: 'OTHER',              label: 'Other' },
];

export default function Onboarding() {
  const { refreshProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    description: '',
    website: '',
    phoneNumber: '',
    contactEmail: '',
    address: '',
    country: 'GH',
  });
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data) => businessApi.register(data),
    onSuccess: () => {
      toast.success('Business profile created!');
      refreshProfile();
    },
    onError: (e) => setError(e.message),
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.businessName.trim()) return setError('Business name is required.');
      if (!form.category)            return setError('Please select a category.');
    }
    setStep(s => s + 1);
  };

  const handleSubmit = () => {
    setError('');
    if (!form.businessName.trim()) return setError('Business name is required.');
    createMutation.mutate(form);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--f-ink-900)' }}>
      <div className="w-full max-w-md ">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[var(--f-surface-sunken)] border border-[var(--f-tint-color)] flex items-center justify-center az-glow-emerald">
            <Store className="w-5 h-5 text-[var(--f-tint-color)]" />
          </div>
          <div>
            <p className="text-base font-bold text-[var(--f-text)]">AZAMAN</p>
            <p className="text-xs text-[var(--f-tint-color)]">Business Portal</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={s <= step
                  ? { background: 'var(--f-surface-sunken)', border: '1.5px solid #00d97e', color: 'var(--f-tint-color)' }
                  : { background: 'transparent', border: '1.5px solid #2a2a3e', color: 'var(--f-text-3)' }
                }
              >
                {s}
              </div>
              {s < 2 && <div className="w-12 h-0.5 rounded-full" style={{ background: step > s ? 'var(--f-tint-color)' : 'var(--f-line)' }} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-[var(--f-text-3)]">Step {step} of 2</span>
        </div>

        {/* Step 1 — Core info */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[var(--f-text)]">Set up your business</h2>
              <p className="text-sm text-[var(--f-text-3)] mt-1">Tell us the basics about your business.</p>
            </div>
            <Input
              label="Business Name"
              placeholder="e.g. Kofi Designs, Ama's Kitchen..."
              value={form.businessName}
              onChange={set('businessName')}
              autoFocus
            />
            <Select
              label="Business Category"
              value={form.category}
              onChange={set('category')}
              options={CATEGORIES}
            />
            <Textarea
              label="Description (optional)"
              placeholder="What does your business offer? Who are your customers?"
              value={form.description}
              onChange={set('description')}
              rows={3}
            />
          </div>
        )}

        {/* Step 2 — Contact info */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-[var(--f-text)]">Contact information</h2>
              <p className="text-sm text-[var(--f-text-3)] mt-1">Help customers reach you. All fields are optional.</p>
            </div>
            <Input label="Phone Number"  placeholder="+233 20 000 0000"    value={form.phoneNumber}   onChange={set('phoneNumber')} />
            <Input label="Contact Email" placeholder="contact@yourbiz.com" value={form.contactEmail}  onChange={set('contactEmail')} type="email" />
            <Input label="Website"       placeholder="https://yourbiz.com"  value={form.website}       onChange={set('website')} />
            <Input label="Address"       placeholder="Business address"      value={form.address}       onChange={set('address')} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--f-bad)] border border-[var(--f-bad)] mt-4">
            <AlertCircle className="w-4 h-4 text-[var(--f-bad)] flex-shrink-0" />
            <p className="text-xs text-[var(--f-bad)]">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={nextStep} className="flex-1">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="flex-1">
              Create My Business
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
