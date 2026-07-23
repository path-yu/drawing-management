import { ReactNode, useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalAnimation = 'fade' | 'scale' | 'slide-up' | 'slide-down';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  animation?: ModalAnimation;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'w-[90vw] h-[90vh]',
};

const overlayAnimations: Record<ModalAnimation, string> = {
  fade: 'animate-fade-in',
  scale: 'animate-fade-in',
  'slide-up': 'animate-fade-in',
  'slide-down': 'animate-fade-in',
};

const contentAnimations: Record<ModalAnimation, string> = {
  fade: 'animate-modal-fade',
  scale: 'animate-modal-scale',
  'slide-up': 'animate-modal-slide-up',
  'slide-down': 'animate-modal-slide-down',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  animation = 'scale',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  className = '',
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    } else if (isVisible) {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open, isVisible]);

  const handleClose = useCallback(() => {
    if (!closeOnEsc) return;
    onClose();
  }, [closeOnEsc, onClose]);

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEsc, handleClose]);

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/50 ${isAnimating ? overlayAnimations[animation] : 'opacity-0'}`}
        onClick={handleOverlayClick}
      />
      <div
        className={`relative bg-white rounded-xl shadow-2xl overflow-hidden ${sizeClasses[size]} ${
          isAnimating ? contentAnimations[animation] : 'opacity-0 scale-95'
        } ${size === 'full' ? 'flex flex-col' : ''} ${className} dark:bg-slate-800`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-700 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className={`${size === 'full' ? 'flex-1 overflow-auto' : 'p-5'}`}>
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmType?: 'primary' | 'danger' | 'success';
  animation?: ModalAnimation;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  confirmType = 'primary',
  animation = 'scale',
}: ConfirmModalProps) {
  const confirmBtnClass = {
    primary: 'bg-primary-600 hover:bg-primary-700',
    danger: 'bg-red-600 hover:bg-red-700',
    success: 'bg-green-600 hover:bg-green-700',
  }[confirmType];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      animation={animation}
      showCloseButton={false}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${confirmBtnClass}`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 py-2 dark:text-slate-300">{message}</p>
    </Modal>
  );
}
