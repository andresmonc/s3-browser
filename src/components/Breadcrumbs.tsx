interface BreadcrumbsProps {
    path: string;
    onNavigate: (path: string) => void;
}

const Breadcrumbs = ({ path, onNavigate }: BreadcrumbsProps) => {
    if (!path) {
        return (
            <div className="flex items-center space-x-2 text-sm">
                <span className="text-slate-500">Root</span>
            </div>
        );
    }

    const parts = path.split('/').filter(Boolean);
    const paths = parts.reduce((acc: string[], part, index) => {
        acc.push(index === 0 ? part : `${acc[index - 1]}/${part}`);
        return acc;
    }, []);

    return (
        <div className="flex items-center space-x-2 text-sm">
            <button
                onClick={() => onNavigate('')}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
                Root
            </button>
            {paths.map((fullPath, index) => (
                <span key={fullPath} className="flex items-center space-x-2">
                    <span className="text-slate-400">/</span>
                    <button
                        onClick={() => onNavigate(fullPath + '/')}
                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                    >
                        {parts[index]}
                    </button>
                </span>
            ))}
        </div>
    );
};

export default Breadcrumbs;

