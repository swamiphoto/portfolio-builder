import PopoverShell from './PopoverShell'

function Section({ label, children }) {
  return (
    <div className="px-3 py-3 border-b border-stone-100 last:border-b-0">
      <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">{label}</div>
      {children}
    </div>
  )
}

function PillSelector({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map(({ value: v, label, title }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          title={title || label}
          className={`min-w-[28px] px-2 py-0.5 text-xs rounded-full border transition-colors ${
            value === v
              ? 'bg-stone-800 border-stone-800 text-white'
              : 'border-stone-300 text-stone-500 hover:border-stone-500 hover:text-stone-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

const selectCls = 'w-full text-sm text-stone-700 border-b border-stone-200 p-0 pb-1 outline-none bg-transparent'

export default function SiteDesignPopover({ siteConfig, anchorEl, onUpdate, onClose }) {
  const design = siteConfig?.design || {}

  function update(patch) {
    onUpdate({ ...siteConfig, design: { ...design, ...patch } })
  }

  return (
    <PopoverShell anchorEl={anchorEl} onClose={onClose} width={260} title="Site Design">

      <Section label="Theme">
        <select
          className={selectCls}
          value={design.theme || 'minimal-light'}
          onChange={(e) => update({ theme: e.target.value })}
        >
          <option value="minimal-light">Minimal Light</option>
          <option value="minimal-dark">Minimal Dark</option>
          <option value="editorial">Editorial</option>
        </select>
      </Section>

      <Section label="Navigation">
        <PillSelector
          value={design.navStyle || 'minimal'}
          onChange={(v) => update({ navStyle: v })}
          options={[
            { value: 'minimal',  label: '1', title: 'Minimal'  },
            { value: 'centered', label: '2', title: 'Centered' },
            { value: 'fixed',    label: '3', title: 'Fixed'    },
          ]}
        />
      </Section>

      <Section label="Sub-navigation">
        <select
          className={selectCls}
          value={design.subNavStyle || 'dropdown'}
          onChange={(e) => update({ subNavStyle: e.target.value })}
        >
          <option value="dropdown">Dropdown</option>
          <option value="inline">Links below page title</option>
        </select>
      </Section>

      <Section label="Footer Layout">
        <PillSelector
          value={design.footerLayout || 'standard'}
          onChange={(v) => update({ footerLayout: v })}
          options={[
            { value: 'none',     label: '0', title: 'None'     },
            { value: 'compact',  label: '1', title: 'Compact'  },
            { value: 'standard', label: '2', title: 'Standard' },
            { value: 'full',     label: '3', title: 'Full'     },
          ]}
        />
      </Section>

    </PopoverShell>
  )
}
