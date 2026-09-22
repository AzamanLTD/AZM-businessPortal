import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { STOREFRONT_ACTION_DEFINITIONS, STOREFRONT_ACTION_TYPES } from '@/lib/storefrontStudioActions';

const TABS = ['content', 'style', 'layout', 'actions', 'responsive'];

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium" style={{ color: 'var(--f-text-3)' }}>{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder = '' }) {
  return (
    <input
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
      style={{ borderColor: 'var(--f-line)', background: 'var(--f-surface)', color: 'var(--f-text)' }}
    />
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
      style={{ borderColor: 'var(--f-line)', background: 'var(--f-surface)', color: 'var(--f-text)' }}
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border px-2.5 py-2 text-xs outline-none"
      style={{ borderColor: 'var(--f-line)', background: 'var(--f-surface)', color: 'var(--f-text)' }}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function Collapsible({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--f-line)' }}>
      <button type="button" className="w-full flex items-center gap-1 px-3 py-2 text-xs font-semibold" onClick={() => setOpen((v) => !v)} style={{ color: 'var(--f-text)' }}>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {open && <div className="space-y-3 px-3 pb-3">{children}</div>}
    </div>
  );
}

export default function StudioInspector({ node, pages = [], nodeIds = [], activeTab = 'content', onTabChange, onPatch }) {
  const tab = TABS.includes(activeTab) ? activeTab : 'content';
  const patch = (domain, value) => onPatch?.(domain, value);
  const actions = node?.actions || {};
  const actionEntries = useMemo(() => Object.entries(actions), [actions]);

  if (!node) {
    return <div className="p-4 text-xs" style={{ color: 'var(--f-text-3)' }}>Select a layer to edit its properties.</div>;
  }

  const props = node.props || {};
  const style = node.style || {};
  const layout = node.layout || {};
  const responsive = node.responsive || {};

  const actionFields = (type) => STOREFRONT_ACTION_DEFINITIONS[type]?.fields || {};

  return (
    <div className="flex h-full min-h-0 flex-col" aria-label="Storefront inspector">
      <div className="border-b px-3 py-3" style={{ borderColor: 'var(--f-line)' }}>
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--f-text)' }}>{props.label || props.title || node.type}</div>
        <div className="text-[10px] mt-0.5" style={{ color: 'var(--f-text-3)' }}>{node.type} · {node.id}</div>
      </div>
      <div className="grid grid-cols-5 border-b" style={{ borderColor: 'var(--f-line)' }}>
        {TABS.map((item) => (
          <button key={item} type="button" className="px-1 py-2 text-[10px] font-medium capitalize" onClick={() => onTabChange?.(item)} style={{ color: item === tab ? 'var(--f-tint-color)' : 'var(--f-text-3)', borderBottom: item === tab ? '2px solid var(--f-tint-color)' : '2px solid transparent' }}>{item}</button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'content' && (
          <>
            <Collapsible title="Identity">
              <Field label="Label"><TextInput value={props.label} onChange={(value) => patch('content', { label: value })} placeholder="Optional layer label" /></Field>
            </Collapsible>
            {node.type === 'text' && <Collapsible title="Text"><Field label="Text"><TextInput value={props.value} onChange={(value) => patch('content', { value })} /></Field></Collapsible>}
            {(node.type === 'button' || node.type === 'icon-button') && (
              <Collapsible title="Button content">
                <Field label="Button label"><TextInput value={props.label} onChange={(value) => patch('content', { label: value })} placeholder="Shop now" /></Field>
                <Field label="Icon"><TextInput value={props.icon} onChange={(value) => patch('content', { icon: value })} placeholder="Icon key" /></Field>
                <Field label="Icon position"><SelectInput value={props.iconPosition || 'end'} onChange={(value) => patch('content', { iconPosition: value })} options={[{ value: 'start', label: 'Start' }, { value: 'end', label: 'End' }]} /></Field>
              </Collapsible>
            )}
            {node.type === 'hero' && (
              <Collapsible title="Hero content">
                <Field label="Title"><TextInput value={props.title} onChange={(value) => patch('content', { title: value })} /></Field>
                <Field label="Subtitle"><TextInput value={props.subtitle} onChange={(value) => patch('content', { subtitle: value })} /></Field>
                <Field label="Media URL"><TextInput value={props.mediaUrl} onChange={(value) => patch('content', { mediaUrl: value })} placeholder="https://…" /></Field>
              </Collapsible>
            )}
          </>
        )}

        {tab === 'style' && (
          <>
            <Collapsible title="Appearance">
              <Field label="Variant"><SelectInput value={style.variant || 'default'} onChange={(value) => patch('style', { variant: value })} options={[{ value: 'default', label: 'Default' }, { value: 'filled', label: 'Filled' }, { value: 'outline', label: 'Outline' }, { value: 'ghost', label: 'Ghost' }, { value: 'tonal', label: 'Tonal' }]} /></Field>
              <Field label="Fill"><TextInput value={style.fill} onChange={(value) => patch('style', { fill: value })} placeholder="Theme token or color" /></Field>
              <Field label="Text color"><TextInput value={style.textColor} onChange={(value) => patch('style', { textColor: value })} placeholder="Theme token or color" /></Field>
              <Field label="Border color"><TextInput value={style.borderColor} onChange={(value) => patch('style', { borderColor: value })} placeholder="Theme token or color" /></Field>
              <Field label="Radius"><SelectInput value={style.radius || 'medium'} onChange={(value) => patch('style', { radius: value })} options={[{ value: 'none', label: 'None' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }, { value: 'pill', label: 'Pill' }]} /></Field>
            </Collapsible>
            <Collapsible title="Effects">
              <Field label="Shadow"><SelectInput value={style.shadow || 'none'} onChange={(value) => patch('style', { shadow: value })} options={[{ value: 'none', label: 'None' }, { value: 'soft', label: 'Soft' }, { value: 'medium', label: 'Medium' }, { value: 'strong', label: 'Strong' }]} /></Field>
              <Field label="Opacity"><NumberInput value={style.opacity ?? 1} onChange={(value) => patch('style', { opacity: value })} min={0} max={1} step={0.05} /></Field>
            </Collapsible>
          </>
        )}

        {tab === 'layout' && (
          <>
            <Collapsible title="Geometry">
              <Field label="Width"><NumberInput value={layout.width} onChange={(value) => patch('layout', { width: value })} min={1} /></Field>
              <Field label="Height"><NumberInput value={layout.height} onChange={(value) => patch('layout', { height: value })} min={1} /></Field>
              <Field label="Alignment"><SelectInput value={layout.align || 'stretch'} onChange={(value) => patch('layout', { align: value })} options={[{ value: 'start', label: 'Start' }, { value: 'center', label: 'Center' }, { value: 'end', label: 'End' }, { value: 'stretch', label: 'Stretch' }]} /></Field>
            </Collapsible>
            <Collapsible title="Spacing">
              <Field label="Padding"><NumberInput value={layout.padding} onChange={(value) => patch('layout', { padding: value })} min={0} /></Field>
              <Field label="Gap"><NumberInput value={layout.gap} onChange={(value) => patch('layout', { gap: value })} min={0} /></Field>
            </Collapsible>
          </>
        )}

        {tab === 'actions' && (
          <Collapsible title="Interactions">
            {actionEntries.length === 0 && <p className="text-[11px]" style={{ color: 'var(--f-text-3)' }}>No customer action configured.</p>}
            {actionEntries.map(([trigger, action]) => (
              <div key={trigger} className="space-y-2 rounded-lg border p-2" style={{ borderColor: 'var(--f-line)' }}>
                <div className="text-[10px] font-semibold uppercase" style={{ color: 'var(--f-text-3)' }}>{trigger}</div>
                <Field label="Action"><SelectInput value={action.type} onChange={(value) => patch('actions', { [trigger]: { ...action, type: value } })} options={Object.values(STOREFRONT_ACTION_TYPES).map((value) => ({ value, label: value }))} /></Field>
                {Object.keys(actionFields(action.type)).map((field) => (
                  <Field key={field} label={field}>
                    <TextInput value={action[field]} onChange={(value) => patch('actions', { [trigger]: { ...action, [field]: value } })} />
                  </Field>
                ))}
              </div>
            ))}
            <button type="button" className="w-full rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: 'var(--f-surface-sunken)', color: 'var(--f-tint-color)' }} onClick={() => patch('actions', { tap: { type: STOREFRONT_ACTION_TYPES.OPEN_CART } })}>
              Add tap action
            </button>
          </Collapsible>
        )}

        {tab === 'responsive' && (
          <Collapsible title="Breakpoint overrides">
            {['mobile', 'tablet', 'desktop'].map((breakpoint) => (
              <div key={breakpoint} className="space-y-2 rounded-lg border p-2" style={{ borderColor: 'var(--f-line)' }}>
                <div className="text-xs font-semibold capitalize" style={{ color: 'var(--f-text)' }}>{breakpoint}</div>
                <Field label="Width"><NumberInput value={responsive[breakpoint]?.width} onChange={(value) => patch('responsive', { [breakpoint]: { ...(responsive[breakpoint] || {}), width: value } })} min={1} /></Field>
                <Field label="Visibility"><SelectInput value={responsive[breakpoint]?.visibility ?? 'inherit'} onChange={(value) => patch('responsive', { [breakpoint]: { ...(responsive[breakpoint] || {}), visibility: value === 'inherit' ? undefined : value === 'show' } })} options={[{ value: 'inherit', label: 'Inherit' }, { value: 'show', label: 'Show' }, { value: 'hide', label: 'Hide' }]} /></Field>
              </div>
            ))}
          </Collapsible>
        )}
      </div>
    </div>
  );
}
