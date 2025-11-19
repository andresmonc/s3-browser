interface ErrorAlertProps {
    message: string;
    className?: string;
}

const ErrorAlert = ({ message, className = '' }: ErrorAlertProps) => {
    return (
        <div className={`bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-5 flex items-start space-x-4 shadow-lg ${className}`}>
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div className="flex-1">
                <strong className="text-red-800 font-bold text-lg">Error:</strong>
                <pre className="text-red-700 mt-1 text-sm whitespace-pre-wrap font-medium">{message}</pre>
            </div>
        </div>
    );
};

export default ErrorAlert;

