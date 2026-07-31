import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Centered glass panel */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-2xl relative z-10"
          >
            <GlassPanel className="border border-az-border bg-az-surface/80 shadow-az-card rounded-az-lg overflow-hidden flex flex-col max-h-[70vh]">
              {/* Input header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-az-border">
                <Search className="w-5 h-5 text-az-text-secondary" />
                <input 
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-sm text-az-text outline-none placeholder:text-az-text-muted"
                />
                <kbd className="text-[10px] font-sans bg-az-bg-alt px-1.5 py-0.5 rounded border border-az-border text-az-text-secondary">ESC</kbd>
              </div>

              {/* Scrollable list */}
              <div className="overflow-y-auto p-2 max-h-96 custom-scrollbar">
                {filtered.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-az-text-muted">No commands or actions found</p>
                ) : (
                  Object.entries(groupedResults).map(([group, items]) => (
                    <div key={group} className="space-y-1">
                      <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-az-text-muted">{group}</p>
                      {items.map(item => {
                        const isSelected = item.globalIndex === selectedIndex;
                        const Icon = item.icon || Search;
                        return (
                          <button
                            key={item.label + item.path}
                            onClick={() => handleExecute(item)}
                            onMouseEnter={() => setSelectedIndex(item.globalIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-az-md text-left transition-all ${
                              isSelected 
                                ? 'bg-az-accent text-[var(--az-text)] shadow-sm' 
                                : 'text-az-text-secondary hover:bg-az-bg-alt hover:text-az-text'
                            }`}
                          >
                            <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isSelected ? 'text-[var(--az-text)]' : 'text-az-text-secondary'}`} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">{item.label}</span>
                              {item.subtitle && (
                                <span className={`text-xs block truncate ${isSelected ? 'text-[var(--az-text)]/80' : 'text-az-text-muted'}`}>
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <ArrowRight className="w-4 h-4 text-[var(--az-text)]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
