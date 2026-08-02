// src/pages/settings/BusinessMeta.jsx
// =============================================================================
// Settings → Category-Specific Fields
//
// Shows additional form fields depending on the business category:
// - HOTELS & REAL_ESTATE: star rating, check-in/check-out times, amenities
// - FOOD_BEVERAGE: cuisine type, dress code, reservation policy, price range
// - LOGISTICS (Transit): service area, vehicle types, booking lead time
// - RETAIL: return policy, delivery options
// =============================================================================

import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, Input, Textarea, Switch, Tag } from '@/components/instrument';
import { Building, Utensils, Bus, ShoppingBag, Star, Clock, Tag as TagIcon } from 'lucide-react';

// ── Category-specific field configs ────────────────────────────────────────
const CATEGORY_FIELDS = {
  REAL_ESTATE: {
    icon: Building,
    label: 'Hotel & Stay Details',
    fields: [
      { key: 'starRating', label: 'Star Rating', type: 'select', options: [1,2,3,4,5], placeholder: 'Select rating' },
      { key: 'checkInTime', label: 'Check-in Time', type: 'time' },
      { key: 'checkOutTime', label: 'Check-out Time', type: 'time' },
      { key: 'totalRooms', label: 'Total Rooms', type: 'number' },
      { key: 'amenities', label: 'Amenities (comma-separated)', type: 'text', placeholder: 'Pool, Gym, WiFi, Spa, Restaurant' },
      { key: 'petPolicy', label: 'Pet-Friendly', type: 'switch' },
    ],
  },
  FOOD_BEVERAGE: {
    icon: Utensils,
    label: 'Restaurant Details',
    fields: [
      { key: 'cuisine', label: 'Cuisine Type', type: 'text', placeholder: 'e.g. Ghanaian, Continental, Fusion' },
      { key: 'priceRange', label: 'Price Range', type: 'select', options: ['$', '$$', '$$$', '$$$$'] },
      { key: 'dressCode', label: 'Dress Code', type: 'text', placeholder: 'e.g. Smart Casual' },
      { key: 'reservationPolicy', label: 'Reservation Policy', type: 'text', placeholder: 'e.g. Recommended for parties of 4+' },
      { key: 'seatingCapacity', label: 'Seating Capacity', type: 'number' },
      { key: 'servesAlcohol', label: 'Serves Alcohol', type: 'switch' },
      { key: 'vegetarianOptions', label: 'Vegetarian Options Available', type: 'switch' },
    ],
  },
  LOGISTICS: {
    icon: Bus,
    label: 'Transit & Transport Details',
    fields: [
      { key: 'serviceArea', label: 'Service Area (comma-separated)', type: 'text', placeholder: 'e.g. Accra, Kumasi, Takoradi' },
      { key: 'vehicleTypes', label: 'Vehicle Types (comma-separated)', type: 'text', placeholder: 'e.g. Sedan, SUV, Bus, Motorcycle' },
      { key: 'bookingLeadTime', label: 'Booking Lead Time (hours)', type: 'number', placeholder: '24' },
      { key: 'maxPassengers', label: 'Max Passengers per Vehicle', type: 'number' },
      { key: 'allowsPets', label: 'Allows Pets', type: 'switch' },
      { key: 'airportPickup', label: 'Airport Pickup Available', type: 'switch' },
    ],
  },
  RETAIL: {
    icon: ShoppingBag,
    label: 'Retail Details',
    fields: [
      { key: 'returnPolicy', label: 'Return Policy', type: 'text', placeholder: 'e.g. 30-day returns with receipt' },
      { key: 'deliveryAvailable', label: 'Delivery Available', type: 'switch' },
      { key: 'pickupAvailable', label: 'In-Store Pickup', type: 'switch' },
      { key: 'minOrderAmount', label: 'Minimum Order Amount (GHS)', type: 'number' },
    ],
  },
};

export default function BusinessMeta({ meta, setMeta, category, canManage }) {
  const config = CATEGORY_FIELDS[category];

  if (!config) return null;

  const MetaIcon = config.icon;

  const updateField = (key, value) => {
    setMeta({ ...meta, [key]: value });
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <MetaIcon className="w-4 h-4 text-[var(--f-tint-color)]" />
        <h3 className="text-sm font-semibold text-[var(--f-text)]">{config.label}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.fields.map(field => {
          const value = meta[field.key];

          switch (field.type) {
            case 'switch':
              return (
                <div key={field.key} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[var(--f-text)]">{field.label}</span>
                  <Switch
                    checked={!!value}
                    onChange={(v) => updateField(field.key, v)}
                    disabled={!canManage}
                  />
                </div>
              );

            case 'select':
              return (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--f-text-3)] uppercase tracking-wider">{field.label}</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-[var(--f-ink-900)] border border-[var(--f-line)] text-[var(--f-text)] text-sm outline-none focus:border-[var(--f-tint-color)] disabled:opacity-50"
                    value={value || ''}
                    onChange={e => updateField(field.key, e.target.value)}
                    disabled={!canManage}
                  >
                    <option value="">{field.placeholder || 'Select...'}</option>
                    {field.options.map(opt => (
                      <option key={opt} value={opt} style={{ background: 'var(--f-surface)' }}>
                        {field.key === 'starRating' ? `${'★'.repeat(opt)} ${opt} Star${opt > 1 ? 's' : ''}` : opt}
                      </option>
                    ))}
                  </select>
                </div>
              );

            case 'time':
              return (
                <Input
                  key={field.key}
                  label={field.label}
                  type="time"
                  value={value || ''}
                  onChange={e => updateField(field.key, e.target.value)}
                  disabled={!canManage}
                />
              );

            case 'number':
              return (
                <Input
                  key={field.key}
                  label={field.label}
                  type="number"
                  placeholder={field.placeholder || ''}
                  value={value || ''}
                  onChange={e => updateField(field.key, e.target.value)}
                  disabled={!canManage}
                />
              );

            default: // text
              return (
                <Input
                  key={field.key}
                  label={field.label}
                  type="text"
                  placeholder={field.placeholder || ''}
                  value={value || ''}
                  onChange={e => updateField(field.key, e.target.value)}
                  disabled={!canManage}
                />
              );
          }
        })}
      </div>
    </Card>
  );
}
