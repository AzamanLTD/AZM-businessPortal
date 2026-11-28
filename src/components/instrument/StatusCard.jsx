// StatusCard: the dashboard stat tile the hotel and transit pages use
// ({ icon, label, value, status }), drawn with the kit's StatCard. The pages
// kept rendering <StatusCard> after the component was removed, which crashed
// both pages on load.
import { StatCard } from './StatCard';

const TONE = { active: 'go', success: 'go', warning: 'hold', danger: 'stop', info: 'neutral', neutral: 'neutral' };

export function StatusCard({ icon, label, value, status = 'neutral', loading }) {
  return <StatCard icon={icon} label={label} value={value} tone={TONE[status] || 'neutral'} loading={loading} />;
}
