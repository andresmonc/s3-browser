import { ReactNode } from 'react';

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
        ? `sticky top-0 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 px-8 py-6 rounded-t-3xl flex items-center justify-between shadow-lg`
        : `sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between`;

    const titleClasses = headerGradient ? 'text-2xl font-bold text-white' : 'text-xl font-bold text-slate-800';
    const subtitleClasses = headerGradient ? 'text-sm text-white/80' : 'text-sm text-slate-500';
    const closeButtonClasses = headerGradient
        ? 'p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 transform hover:rotate-90'
        : 'p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200';

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn"
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div 
                className={`bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] overflow-hidden border border-white/20 animate-scaleIn`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={headerClasses}>
                    <div className="flex items-center space-x-3">
                        {icon && (
                            <div className={`w-10 h-10 bg-gradient-to-br ${iconGradient} rounded-lg flex items-center justify-center ${headerGradient ? 'bg-white/20 backdrop-blur-sm shadow-lg' : ''}`}>
                                {icon}
                            </div>
                        )}
                        <div>
                            <h5 className={titleClasses}>{title}</h5>
                            {subtitle && <p className={subtitleClasses}>{subtitle}</p>}
                        </div>
                    </div>
                    <button 
                        type="button" 
                        className={closeButtonClasses}
                        onClick={onClose}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {children}
                </div>
                {footer && (
                    <div className={`sticky bottom-0 ${headerGradient ? 'bg-gradient-to-r from-slate-50 to-blue-50/30' : 'bg-slate-50'} border-t-2 border-slate-200 px-6 py-4 rounded-b-3xl`}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;

