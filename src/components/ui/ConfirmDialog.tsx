import { Button } from './Button'
import { Modal } from './Modal'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  className = ''
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} className={className}>
      <p className="text-sm text-slate-700">{description}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          className="bg-slate-200 text-slate-800 hover:bg-slate-300"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button type="button" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
