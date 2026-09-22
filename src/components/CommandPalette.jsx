import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ShoppingBag, LineChart, Users, BedDouble, ChefHat, 
  ShoppingCart, Package, Settings, Search, PlusCircle, UserPlus, FileText, ArrowRight
} from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';
import { useAuth } from '@/lib/AuthContext';

// Define core navigation items
const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Orders', icon: ShoppingBag, path: '/orders' },
  { label: 'Finance', icon: LineChart, path: '/finance' },
  { label: 'Employees', icon: Users, path: '/employees' },
  { label: 'Hotel Rooms', icon: BedDouble, path: '/hotel-rooms' },
  { label: 'Restaurant Kitchen', icon: ChefHat, path: '/restaurant-kitchen' },
  { label: 'POS', icon: ShoppingCart, path: '/dine-in' },
];

const QUICK_ACTIONS = [
  { label: 'New Order', subtitle: 'Create a new client order', icon: PlusCircle, path: '/orders?action=new' },
  { label: 'Add Product', subtitle: 'Publish a new item', icon: Package, path: '/products?action=new' },
  { label: 'Invite Employee', subtitle: 'Add a new member', icon: UserPlus, path: '/employees?action=invite' },
  { label: 'View Reports', subtitle: 'Open financial analytics', icon: FileText, path: '/finance?action=reports' },
];

export function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { bizProfile } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Recents loaded from localStorage
  const recents = useMemo(() => {
    try {
      const stored = localStorage.getItem('az-recent-pages');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [isOpen]);

  // Handle Ctrl+K / Cmd+K global trigger handled in parent/Layout, 
  // but escape key is handled locally too
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Combine items to search
  const searchableItems = useMemo(() => {
    const items = [];

    // Navigation section
    // Filter POS item if business type is not restaurant or hotel
    const isFoodOrHotel = ['RESTAURANT', 'HOTEL', 'DINE_IN', 'CAFE'].includes(bizProfile?.businessType?.toUpperCase());
    const filteredNav = NAV_ITEMS.filter(item => {
      if (item.label === 'POS' && !isFoodOrHotel) return false;
      return true;
    });

    filteredNav.forEach(nav => {
      items.push({
        ...nav,
        type: 'navigation',
        group: 'Quick Navigation'
      });
    });

    // Recent items section
    recents.forEach(rec => {
      items.push({
        label: rec.label,
        path: rec.path,
        icon: LayoutDashboard, // fallback
        type: 'recent',
        group: 'Recent Pages'
      });
    });

    // Quick Actions section
    QUICK_ACTIONS.forEach(act => {
      items.push({
        ...act,
        type: 'action',
        group: 'Quick Actions'
      });
    });

    return items;
  }, [bizProfile, recents]);

  // Fuzzy filter by typing
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return searchableItems;
    return searchableItems.filter(item => 
      item.label.toLowerCase().includes(q) || 
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.group.toLowerCase().includes(q)
    );
  }, [query, searchableItems]);

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle execute / navigation
  const handleExecute = (item) => {
    if (!item) return;

    // Save to recents in localStorage (up to 5 items, avoid duplicates)
    try {
      const stored = localStorage.getItem('az-recent-pages');
      let currentRecents = stored ? JSON.parse(stored) : [];
      currentRecents = currentRecents.filter(r => r.path !== item.path);
      currentRecents.unshift({ label: item.label, path: item.path });
      localStorage.setItem('az-recent-pages', JSON.stringify(currentRecents.slice(0, 5)));
    } catch (e) {
      console.error(e);
    }

    navigate(item.path);
    onClose();
    setQuery('');
  };

  // Keyboard navigation inside the palette
  useEffect(() => {
    if (!isOpen) return;
    const handleKeys = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleExecute(filtered[selectedIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [isOpen, selectedIndex, filtered]);

  // Group items by category to render
  const groupedResults = useMemo(() => {
    const groups = {};
    filtered.forEach((item, idx) => {
      const g = item.group;
      if (!groups[g]) groups[g] = [];
      groups[g].push({ ...item, globalIndex: idx });
    });
    return groups;
  }, [filtered]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 f-scrim"
          />

          {/* Centered glass panel */}
          <m.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-2xl relative z-10"
          >
            <GlassPanel className="border border-line bg-surface/80 shadow-sm rounded-lg overflow-hidden flex flex-col max-h-[70vh]">
              {/* Input header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line">
                <Search className="w-5 h-5 text-ink-2" />
                <input 
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
                />
                <kbd className="text-[10px] font-sans bg-surface-sunken px-1.5 py-0.5 rounded border border-line text-ink-2">ESC</kbd>
              </div>

              {/* Scrollable list */}
              <div className="overflow-y-auto p-2 max-h-96 custom-scrollbar">
                {filtered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-ink-3">No commands or actions found</p>
                ) : (
                  Object.entries(groupedResults).map(([group, items]) => (
                    <div key={group} className="space-y-1">
                      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-3">{group}</p>
                      {items.map(item => {
                        const isSelected = item.globalIndex === selectedIndex;
                        const Icon = item.icon || Search;
                        return (
                          <button
                            key={item.label + item.path}
                            onClick={() => handleExecute(item)}
                            onMouseEnter={() => setSelectedIndex(item.globalIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all ${
                              isSelected 
                                ? 'bg-tint text-[var(--f-text)] shadow-sm' 
                                : 'text-ink-2 hover:bg-surface-sunken hover:text-ink'
                            }`}
                          >
                            <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isSelected ? 'text-[var(--f-text)]' : 'text-ink-2'}`} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">{item.label}</span>
                              {item.subtitle && (
                                <span className={`text-xs block truncate ${isSelected ? 'text-[var(--f-text)]/80' : 'text-ink-3'}`}>
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <ArrowRight className="w-4 h-4 text-[var(--f-text)]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
