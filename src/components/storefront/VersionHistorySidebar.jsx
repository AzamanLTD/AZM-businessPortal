// src/components/storefront/VersionHistorySidebar.jsx
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui';
import { History, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { storefrontApi } from '@/services/storefrontApi';

export default function VersionHistorySidebar({ businessId, onRevert, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await storefrontApi.getHistory(10);
        setVersions(data?.versions ?? []);
      } catch (e) {
        console.error(e);
      } finally { setLoading(false); }
    };
    load();
  }, [businessId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="w-96 h-full overflow-y-auto p-6 border-l" style={{ background: 'var(--f-surface-sunken)', borderColor: 'var(--f-line)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" style={{ color: 'var(--f-tint-color)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--f-text)' }}>Version History</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--f-text-3)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--f-tint-color)', borderTopColor: 'transparent' }} />
          </div>
        ) : versions.length === 0 ? (
          <GlassPanel className="p-6 text-center">
            <p className="text-sm" style={{ color: 'var(--f-text-3)' }}>No published versions yet.</p>
          </GlassPanel>
        ) : (
          <div className="space-y-3">
            {versions.map(v => (
              <GlassPanel key={v.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="primary">v{v.version}</Badge>
                  <span className="text-xs" style={{ color: 'var(--f-text-3)' }}>
                    {new Date(v.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button onClick={() => onRevert(v.id)}
                  className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all"
                  style={{ color: 'var(--f-text)', borderColor: 'var(--f-line)' }}>
                  <RotateCcw className="w-3.5 h-3.5" />Revert to this version
                </button>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
