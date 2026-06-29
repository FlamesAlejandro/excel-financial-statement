import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export function Button({ className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={[
        'inline-flex items-center justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
