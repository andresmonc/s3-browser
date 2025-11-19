import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = ({ label, error, helperText, className = '', ...props }: InputProps) => {
    const baseClasses = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 bg-white font-medium';
    const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : '';

    return (
        <div>
            {label && (
                <label htmlFor={props.id} className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                className={`${baseClasses} ${errorClasses} ${className}`}
                {...props}
            />
            {error && (
                <p className="text-red-600 text-xs mt-1 font-medium">{error}</p>
            )}
            {helperText && !error && (
                <small className="text-slate-500 text-xs mt-1 block">{helperText}</small>
            )}
        </div>
    );
};

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = ({ label, error, helperText, className = '', ...props }: TextareaProps) => {
    const baseClasses = 'w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 font-mono text-sm';
    const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : '';

    return (
        <div>
            {label && (
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {label}
                </label>
            )}
            <textarea
                className={`${baseClasses} ${errorClasses} ${className}`}
                {...props}
            />
            {error && (
                <p className="text-red-600 text-xs mt-1.5 font-medium">{error}</p>
            )}
            {helperText && !error && (
                <small className="text-slate-500 text-xs mt-1.5 block font-medium">{helperText}</small>
            )}
        </div>
    );
};

