import { BedDouble, BusFront, ImageOff, Layers3, Package, Utensils } from 'lucide-react';

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : 'Price unavailable';
}

function normalizeImages(item) {
  const value = item?.imageUrls ?? item?.images ?? [];
  if (!Array.isArray(value)) return [];
  return value.filter((url) => typeof url === 'string' && url.trim()).slice(0, 3);
}

function Card({ children }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      {children}
    </div>
  );
}

function ImageTile({ src, label }) {
  return src ? (
    <img src={src} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
  ) : (
    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--bg)', color: 'var(--text-3)' }} aria-label={`${label} has no image`}>
      <ImageOff size={18} />
    </div>
  );
}

function ProductPreview({ category, products }) {
  const isDining = category === 'FOOD_BEVERAGE' || category === 'RESTAURANT';
  const items = [...products]
    .filter((product) => product?.isActive !== false && product?.isAvailable !== false)
    .sort((a, b) => Number(b?.totalOrders || 0) - Number(a?.totalOrders || 0))
    .slice(0, 4);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
            Your storefront content
          </p>
          <h3 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>
            {isDining ? 'Your popular dishes' : 'Your bestsellers'}
          </h3>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>
            The simulator uses these real catalog records when customers browse this experience.
          </p>
        </div>
        {isDining ? <Utensils size={18} style={{ color: 'var(--accent)' }} /> : <Layers3 size={18} style={{ color: 'var(--accent)' }} />}
      </div>

      {items.length ? (
        <div className="mt-4 space-y-2">
          {items.map((product) => {
            const image = normalizeImages(product)[0];
            return (
              <div key={product.id || product.slug || product.name} className="flex items-center gap-3 rounded-xl border p-2.5" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                <ImageTile src={image} label={product.name || 'Product'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>{product.name || 'Unnamed item'}</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
                    {money(product.priceUsdc)}{Number(product.totalOrders || 0) > 0 ? ` · ${product.totalOrders} orders` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>
          Add and publish products in Products to see your real catalog represented here.
        </div>
      )}
    </Card>
  );
}

function HotelPreview({ rooms }) {
  const grouped = rooms.reduce((map, room) => {
    const floor = String(room?.floor || 'Unknown');
    if (!map.has(floor)) map.set(floor, []);
    map.get(floor).push(room);
    return map;
  }, new Map());
  const floors = [...grouped.entries()].sort(([a], [b]) => Number(a) - Number(b)).slice(0, 5);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Your property</p>
          <h3 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>Live room map preview</h3>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>Rooms and floors come from your hotel inventory.</p>
        </div>
        <BedDouble size={18} style={{ color: 'var(--accent)' }} />
      </div>
      {floors.length ? (
        <div className="mt-4 space-y-2">
          {floors.map(([floor, floorRooms]) => {
            const available = floorRooms.filter((room) => String(room?.status || '').toUpperCase() === 'AVAILABLE').length;
            return (
              <div key={floor} className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>Floor {floor}</p>
                  <span className="text-[10px] font-semibold" style={{ color: available ? 'var(--accent)' : 'var(--text-3)' }}>{available} available</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {floorRooms.slice(0, 8).map((room) => (
                    <span key={room.id || room.roomNumber} className="rounded-lg border px-2 py-1 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--text-2)' }}>
                      {room.roomNumber || 'Room'} · {String(room.roomType || 'room').toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>
          Add rooms in Hotel Rooms to preview the building experience with your actual inventory.
        </div>
      )}
    </Card>
  );
}

function TransitPreview({ trips }) {
  const trip = [...trips]
    .filter((item) => String(item?.status || '').toUpperCase() === 'SCHEDULED' || !item?.status)
    .sort((a, b) => new Date(a?.departureAt || 0) - new Date(b?.departureAt || 0))[0];

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>Your service</p>
          <h3 className="mt-1 text-base font-bold" style={{ color: 'var(--text)' }}>Next journey preview</h3>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-3)' }}>The customer journey can use your actual scheduled service.</p>
        </div>
        <BusFront size={18} style={{ color: 'var(--accent)' }} />
      </div>
      {trip ? (
        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{trip.origin || 'Origin'} → {trip.destination || 'Destination'}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>{trip.routeName || 'Scheduled service'}</p>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{money(trip.fareUsdc)}</p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ['Departure', trip.departureAt ? new Date(trip.departureAt).toLocaleString() : '—'],
              ['Vehicle', trip.vehicleType || '—'],
              ['Seats', Number(trip.availableSeats || 0).toString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border px-2.5 py-2" style={{ borderColor: 'var(--line)' }}>
                <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</p>
                <p className="mt-1 text-[10px] font-semibold" style={{ color: 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-3)' }}>
          Schedule a trip in Transit Trips to preview the actual travel experience.
        </div>
      )}
    </Card>
  );
}

export default function ExperienceContentPreview({ category, products = [], rooms = [], trips = [] }) {
  const normalized = String(category || '').trim().toUpperCase();
  if (normalized === 'FOOD_BEVERAGE' || normalized === 'RESTAURANT' || normalized === 'RETAIL') {
    return <ProductPreview category={normalized} products={products} />;
  }
  if (normalized === 'HOSPITALITY' || normalized === 'HOTEL') return <HotelPreview rooms={rooms} />;
  if (normalized === 'LOGISTICS' || normalized === 'TRANSIT') return <TransitPreview trips={trips} />;
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Package size={18} style={{ color: 'var(--accent)' }} />
        <div><p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Your storefront content</p><p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>Add live catalog content to make this preview concrete.</p></div>
      </div>
    </Card>
  );
}
