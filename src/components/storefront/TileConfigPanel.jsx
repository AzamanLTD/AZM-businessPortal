// src/components/storefront/TileConfigPanel.jsx
// Schema-driven tile configuration panel — reads the widget's configSchema
// from the backend catalog and renders the appropriate input for each property.
import { Card } from '@/components/forge';
import { Badge } from '@/components/ui';
import { useToast } from '@/components/forge';
import { Trash2, Settings, Upload, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { storefrontApi } from '@/services/storefrontApi';

// Human-readable labels for known config keys
const FIELD_LABELS = {
  title: 'Title',
  subtitle: 'Subtitle',
  mediaUrl: 'Background Media URL',
  mediaType: 'Media Type',
  overlayOpacity: 'Overlay Opacity',
  height: 'Banner Height',
  showHours: 'Show Hours',
  showRating: 'Show Rating',
  showCategory: 'Show Category',
  customInfo: 'Custom Info Text',
  maxItems: 'Max Items',
  columns: 'Columns',
  showPrice: 'Show Price',
  autoplay: 'Autoplay',
  maxReviews: 'Max Reviews',
  minRating: 'Minimum Rating',
  showPhone: 'Show Phone',
  showWhatsApp: 'Show WhatsApp',
  showEmail: 'Show Email',
  showWebsite: 'Show Website',
  zoom: 'Map Zoom Level',
  showOrder: 'Show Order Button',
  showBook: 'Show Book Button',
  showFollow: 'Show Follow Button',
  showShare: 'Show Share Button',
  videoUrl: 'Video URL',
  posterUrl: 'Poster Image URL',
  loop: 'Loop Video',
  muted: 'Muted',
  ctaText: 'Button Text',
  ctaAction: 'Button Action URL',
  backgroundColor: 'Background Color',
  platform: 'Platform',
  handle: 'Social Handle',
  maxPosts: 'Max Posts',
  showFollowers: 'Show Followers',
  showReviews: 'Show Reviews Count',
  showOrders: 'Show Orders Count',
  label: 'Label',
  value: 'Value',
  suffix: 'Suffix',
  prefix: 'Prefix',
  html: 'HTML Content',
  sanitize: 'Sanitize HTML',
  gradientFrom: 'Gradient Start Color',
  gradientTo: 'Gradient End Color',
  animationSpeed: 'Animation Speed',
};

// Fields that support file upload
const UPLOADABLE_FIELDS = new Set(['mediaUrl', 'videoUrl', 'posterUrl']);

function ConfigField({ fieldKey, schemaProp, value, onChange }) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const label = FIELD_LABELS[fieldKey] || fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  const type = schemaProp?.type || 'string';
  const isUploadable = UPLOADABLE_FIELDS.has(fieldKey);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await storefrontApi.uploadMedia(formData);
      onChange({ [fieldKey]: result.url });
      toast({ title: 'Upload complete', description: 'Media uploaded successfully.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const inputStyle = {
    background: 'var(--f-surface-sunken)',
    border: '1.5px solid var(--f-line)',
    color: 'var(--f-text)',
  };
  const focusStyle = e => { e.target.style.borderColor = 'var(--f-tint-color)'; };
  const blurStyle = e => { e.target.style.borderColor = 'var(--f-line)'; };

  // Boolean → toggle switch
  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold" style={{ color: 'var(--f-text-2)' }}>{label}</label>
        <button
          onClick={() => onChange({ [fieldKey]: !value })}
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{ background: value ? 'var(--f-tint-color)' : 'var(--f-line)' }}
        >
          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-[var(--f-surface)] transition-transform"
            style={{ transform: value ? 'translateX(20px)' : 'translateX(2px)' }} />
        </button>
      </div>
    );
  }

  // Enum → select dropdown
  if (schemaProp?.enum) {
    return (
      <div>
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--f-text-2)' }}>{label}</label>
        <select
          value={value ?? schemaProp.default ?? ''}
          onChange={e => onChange({ [fieldKey]: e.target.value })}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={inputStyle}
          onFocus={focusStyle}
          onBlur={blurStyle}
        >
          {schemaProp.enum.map(opt => (
            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
      </div>
    );
  }

  // Number → number input
  if (type === 'number' || type === 'integer') {
    return (
      <div>
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--f-text-2)' }}>{label}</label>
        <input
          type="number"
          value={value ?? schemaProp.default ?? 0}
          min={schemaProp.minimum}
          max={schemaProp.maximum}
          step={type === 'number' ? '0.1' : '1'}
          onChange={e => onChange({ [fieldKey]: type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value) })}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={inputStyle}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      </div>
    );
  }

  // Color fields (detected by key name)
  if (fieldKey.toLowerCase().includes('color') || fieldKey === 'gradientFrom' || fieldKey === 'gradientTo') {
    return (
      <div>
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--f-text-2)' }}>{label}</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={value || '#6C4FD1'}
            onChange={e => onChange({ [fieldKey]: e.target.value })}
            className="w-10 h-9 rounded-lg border-0 cursor-pointer"
            style={{ background: 'transparent' }}
          />
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange({ [fieldKey]: e.target.value })}
            placeholder="#6C4FD1"
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none font-mono"
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>
      </div>
    );
  }

  // HTML content → textarea with hint
  if (fieldKey === 'html') {
    return (
      <div>
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--f-text-2)' }}>{label}</label>
        <textarea
          value={value || ''}
          onChange={e => onChange({ [fieldKey]: e.target.value })}
          rows={5}
          placeholder="<p>Custom HTML content</p>"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none font-mono"
          style={inputStyle}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
        <p className="text-[10px] mt-1" style={{ color: 'var(--f-text-3)' }}>Sanitized on render. Supports basic HTML tags.</p>
      </div>
    );
  }

  // URL with upload support
  if (isUploadable) {
    return (
      <div>
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--f-text-2)' }}>{label}</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={value || ''}
            onChange={e => onChange({ [fieldKey]: e.target.value })}
            placeholder="https://..."
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={inputStyle}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 px-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)', border: '1.5px solid var(--f-line)' }}
            title="Upload file"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </button>
        </div>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} />
        {value && (
          <div className="mt-1.5 rounded-lg overflow-hidden" style={{ maxHeight: 80 }}>
            {value.match(/\.(mp4|mov|avi|webm)$/i) ? (
              <video src={value} className="w-full h-20 object-cover" controls />
            ) : (
              <img src={value} alt="" className="w-full h-20 object-cover" />
            )}
          </div>
        )}
      </div>
    );
  }

  // Long text (subtitle, ctaAction) → textarea
  if (fieldKey === 'subtitle' || fieldKey === 'ctaAction') {
    return (
      <div>
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--f-text-2)' }}>{label}</label>
        <textarea
          value={value || ''}
          onChange={e => onChange({ [fieldKey]: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
          style={inputStyle}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      </div>
    );
  }

  // Default → text input
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--f-text-2)' }}>{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange({ [fieldKey]: e.target.value })}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={inputStyle}
        onFocus={focusStyle}
        onBlur={blurStyle}
      />
    </div>
  );
}

export default function TileConfigPanel({ tile, widget, onUpdate, onRemove }) {
  const props = tile?.props || {};
  const schema = widget?.configSchema?.properties || {};
  // Use schema keys if available, otherwise fall back to props keys
  const editableKeys = Object.keys(schema).length > 0
    ? Object.keys(schema)
    : Object.keys(props).filter(k => typeof props[k] === 'string' || typeof props[k] === 'number' || typeof props[k] === 'boolean');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" style={{ color: 'var(--f-text-3)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--f-text)' }}>Configure</h3>
        </div>
        <Badge variant="primary">{widget?.displayName || tile?.widgetType}</Badge>
      </div>
      <GlassPanel className="p-4 space-y-3">
        {editableKeys.length === 0 ? (
          <p className="text-xs text-center" style={{ color: 'var(--f-text-3)' }}>
            No configurable properties for this widget.
          </p>
        ) : (
          editableKeys.map(key => (
            <ConfigField
              key={key}
              fieldKey={key}
              schemaProp={schema[key]}
              value={props[key]}
              onChange={onUpdate}
            />
          ))
        )}
      </GlassPanel>
      <button onClick={onRemove}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{ background: 'var(--f-bad-bg)', color: 'var(--f-bad)', border: '1px solid rgba(225,83,97,0.2)' }}>
        <Trash2 className="w-4 h-4" />Remove Widget
      </button>
    </div>
  );
}
