interface ErrorAlertProps {
    message: string;
    className?: string;
}

const ErrorAlert = ({ message, className = '' }: ErrorAlertProps) => {
    return (
        <div className={`bg-red-50/50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 ${className}`}>
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-red-900 font-medium leading-relaxed">{message}</p>
            </div>
        </div>
    );
};

export default ErrorAlert;

