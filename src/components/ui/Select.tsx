import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
}

export function Select({
  className = '',
  id,
  label,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </span>
      ) : null}
      <select
        id={selectId}
        {...props}
        className={[
          'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200',
          className
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </select>
    </label>
  )
}
