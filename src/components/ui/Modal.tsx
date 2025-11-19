import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    iconGradient?: string;
    children: ReactNode;
    footer?: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
    headerGradient?: boolean;
}

const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    subtitle,
    icon,
    iconGradient = 'from-blue-500 to-indigo-600',
    children,
    footer,
    maxWidth = 'md',
    headerGradient = false
}: ModalProps) => {
    if (!isOpen) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '4xl': 'max-w-4xl'
    };

    const headerClasses = headerGradient
        ? `sticky top-0 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between`
        : `sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between`;

    const titleClasses = headerGradient ? 'text-base font-semibold text-white' : 'text-base font-semibold text-slate-900';
    const subtitleClasses = headerGradient ? 'text-xs text-white/90 mt-0.5' : 'text-xs text-slate-500 mt-0.5';
    const closeButtonClasses = headerGradient
        ? 'p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-all duration-200'
        : 'p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-all duration-200';

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn"
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div 
                className={`bg-white rounded-2xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] overflow-hidden border border-slate-200/50 animate-scaleIn flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={headerClasses}>
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                        {icon && (
                            <div className={`w-7 h-7 bg-gradient-to-br ${iconGradient} rounded-md flex items-center justify-center flex-shrink-0 ${headerGradient ? 'bg-white/20 shadow-sm' : 'shadow-sm'}`}>
                                {icon}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h5 className={titleClasses}>{title}</h5>
                            {subtitle && <p className={subtitleClasses}>{subtitle}</p>}
                        </div>
                    </div>
                    <button 
                        type="button" 
                        className={closeButtonClasses}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="px-4 py-4 overflow-y-auto flex-1 min-h-0">
                    {children}
                </div>
                {footer && (
                    <div className={`border-t border-slate-100 px-4 py-3 bg-slate-50/50 ${headerGradient ? '' : ''}`}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    // Render modal using portal to ensure it's always on top
    return createPortal(modalContent, document.body);
};

export default Modal;

