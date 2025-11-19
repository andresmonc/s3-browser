interface ProgressBarProps {
    progress: number;
    status?: string;
    className?: string;
}

const ProgressBar = ({ progress, status, className = '' }: ProgressBarProps) => {
    return (
        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
            {status && (
                <p className="text-sm font-medium text-blue-800 mb-3">{status}</p>
            )}
            <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute inset-0 animate-shimmer"></div>
                </div>
            </div>
            <p className="text-xs text-blue-600 mt-2 text-right font-medium">{progress}%</p>
        </div>
    );
};

export default ProgressBar;

