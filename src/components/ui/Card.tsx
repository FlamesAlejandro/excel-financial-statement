import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <section
      {...props}
      className={[
        'rounded-3xl border border-white/50 bg-white/60 shadow-sm backdrop-blur',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  )
}
