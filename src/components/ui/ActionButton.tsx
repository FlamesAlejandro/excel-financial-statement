type ActionButtonProps = {
  label: string
  onClick?: () => void
  disabled?: boolean
}

export function ActionButton({
  label,
  onClick,
  disabled = false
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-slate-300/70 bg-white/70 px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-500/50 hover:bg-white hover:shadow-md"
    >
      {label}
    </button>
  )
}
