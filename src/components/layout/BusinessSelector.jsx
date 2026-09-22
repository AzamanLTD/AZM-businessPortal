import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getTypeConfig, BUSINESS_TYPES } from '@/lib/businessTypes';
import { ChevronDown, Search } from 'lucide-react';

export function BusinessSelector() {
  const { adminBusinesses, selectedBusinessId, selectBusiness, bizProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  // Group businesses by type
  const grouped = useMemo(() => {
    const filtered = (adminBusinesses || []).filter(b => {
      return !search || b.businessName?.toLowerCase().includes(search.toLowerCase()) ||
        b.category?.toLowerCase().includes(search.toLowerCase());
    });
    const groups = {};
    for (const b of filtered) {
      const cfg = getTypeConfig(b);
      if (!groups[cfg.type]) groups[cfg.type] = { label: cfg.label, icon: cfg.icon, color: cfg.color, businesses: [] };
      groups[cfg.type].businesses.push(b);
    }
    // Sort: HOTEL, RESTAURANT, TRANSIT, RETAIL, SERVICES, GENERAL
    const order = ['HOTEL', 'RESTAURANT', 'TRANSIT', 'RETAIL', 'SERVICES', 'GENERAL'];
    return order.map(k => groups[k]).filter(Boolean);
  }, [adminBusinesses, search]);

  const selectedBiz = (adminBusinesses || []).find(b => b.id === selectedBusinessId);
  const selectedCfg = selectedBiz ? getTypeConfig(selectedBiz) : null;

  const handleSelect = (bizId) => {
    localStorage.setItem('admin_selected_biz', bizId);
    selectBusiness(bizId);
    setOpen(false);
  };

  const handleClear = () => {
    localStorage.removeItem('admin_selected_biz');
    selectBusiness(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--f-text-3)] mb-1.5 block">
        Viewing as
      </label>

      {/* Selected business display / trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-md px-2.5 py-2 text-xs border flex items-center justify-between gap-2 transition-colors"
        style={{
          background: 'var(--f-surface)',
          borderColor: open ? 'var(--f-tint-color)' : 'var(--f-line)',
          color: 'var(--f-text)',
        }}
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedBiz ? (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedCfg?.color }} />
              {selectedBiz.businessName}
            </>
          ) : (
            <span className="text-[var(--f-text-3)]">— Select a business —</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 mt-1 rounded-lg border shadow-sn-dropdown z-50 max-h-[60vh] overflow-hidden flex flex-col"
            style={{ background: 'var(--f-surface)', borderColor: 'var(--f-line-strong)' }}
          >
            {/* Search */}
            <div className="p-2 border-b border-[var(--f-line)] flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--f-text-3)]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search businesses..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border focus:outline-none focus:ring-1 focus:ring-[var(--f-tint-color)]/40"
                  style={{ background: 'var(--f-surface)', borderColor: 'var(--f-line)', color: 'var(--f-text)' }}
                />
              </div>
            </div>

            {/* Clear selection */}
            {selectedBusinessId && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs text-[var(--f-text-3)] hover:text-[var(--f-text)] hover:bg-[var(--f-surface-sunken)] text-left flex-shrink-0 border-b border-[var(--f-line)]"
              >
                ← Clear (Admin View-All)
              </button>
            )}

            {/* Grouped business list */}
            <div className="overflow-y-auto flex-1 py-1">
              {grouped.length === 0 && (
                <p className="px-3 py-3 text-xs text-[var(--f-text-3)]">No businesses found.</p>
              )}
              {grouped.map(group => (
                <div key={group.label} className="mb-1">
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: group.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: group.color }} />
                    {group.label}
                    <span className="text-[var(--f-text-3)] font-normal normal-case">({group.businesses.length})</span>
                  </p>
                  {group.businesses.map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleSelect(b.id)}
                      className="w-full px-3 py-1.5 text-xs text-left flex items-center justify-between gap-2 hover:bg-[var(--f-surface-sunken)] transition-colors"
                      style={selectedBusinessId === b.id ? { background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)' } : { color: 'var(--f-text-3)' }}
                    >
                      <span className="truncate">{b.businessName}</span>
                      <span className="text-[10px] text-[var(--f-text-3)] flex-shrink-0">{b.kybStatus || 'UNVERIFIED'}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Selected business info */}
      {selectedBusinessId && bizProfile && (
        <div className="mt-2 text-[11px] text-[var(--f-text-3)]">
          Type: {getTypeConfig(bizProfile).label} · KYB: {bizProfile.kybStatus}
        </div>
      )}
    </div>
  );
}
