import { useState, useEffect } from 'react';

interface S3Credentials {
    endpoint: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (credentials: S3Credentials) => void;
}

const STORAGE_KEY = 's3-browser-credentials';

export const loadCredentialsFromStorage = (): S3Credentials | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading credentials from storage:', error);
    }
    return null;
};

export const saveCredentialsToStorage = (credentials: S3Credentials): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    } catch (error) {
        console.error('Error saving credentials to storage:', error);
    }
};

const SettingsModal = ({ isOpen, onClose, onSave }: SettingsModalProps) => {
    const [endpoint, setEndpoint] = useState('');
    const [region, setRegion] = useState('us-east-1');
    const [accessKeyId, setAccessKeyId] = useState('');
    const [secretAccessKey, setSecretAccessKey] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const stored = loadCredentialsFromStorage();
            if (stored) {
                setEndpoint(stored.endpoint || '');
                setRegion(stored.region || 'us-east-1');
                setAccessKeyId(stored.accessKeyId || '');
                setSecretAccessKey(stored.secretAccessKey || '');
            } else {
                // Reset to defaults
                setEndpoint('');
                setRegion('us-east-1');
                setAccessKeyId('');
                setSecretAccessKey('');
            }
            setError(null);
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!endpoint) {
            setError('Please fill in the required field (Endpoint)');
            return;
        }

        const credentials: S3Credentials = {
            endpoint: endpoint.trim(),
            region: region.trim() || 'us-east-1',
            accessKeyId: accessKeyId.trim() || undefined,
            secretAccessKey: secretAccessKey.trim() || undefined,
        };

        saveCredentialsToStorage(credentials);
        onSave(credentials);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/20 animate-scaleIn"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 px-8 py-6 rounded-t-3xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h5 className="text-2xl font-bold text-white">S3 Configuration</h5>
                    </div>
                    <button 
                        type="button" 
                        className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 transform hover:rotate-90"
                        onClick={onClose}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {error && (
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-5 flex items-start space-x-4 shadow-lg">
                            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <strong className="text-red-800 font-bold text-lg">Error:</strong>
                                <p className="text-red-700 mt-1 font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="endpoint" className="block text-sm font-bold text-slate-700 mb-3">
                            S3 Endpoint <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="endpoint"
                            value={endpoint}
                            onChange={(e) => {
                                setEndpoint(e.target.value);
                                setError(null);
                            }}
                            className="w-full px-5 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium shadow-sm hover:shadow-md"
                            placeholder="https://s3.amazonaws.com or http://localhost:9000"
                            required
                        />
                        <small className="text-slate-500 text-xs mt-2 block font-medium">The S3 endpoint URL</small>
                    </div>

                    <div>
                        <label htmlFor="region" className="block text-sm font-bold text-slate-700 mb-3">Region</label>
                        <input
                            type="text"
                            id="region"
                            value={region}
                            onChange={(e) => {
                                setRegion(e.target.value);
                                setError(null);
                            }}
                            className="w-full px-5 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium shadow-sm hover:shadow-md"
                            placeholder="us-east-1"
                        />
                        <small className="text-slate-500 text-xs mt-2 block font-medium">AWS region (default: us-east-1)</small>
                    </div>

                    <div>
                        <label htmlFor="accessKeyId" className="block text-sm font-bold text-slate-700 mb-3">
                            Access Key ID
                        </label>
                        <input
                            type="text"
                            id="accessKeyId"
                            value={accessKeyId}
                            onChange={(e) => {
                                setAccessKeyId(e.target.value);
                                setError(null);
                            }}
                            className="w-full px-5 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium shadow-sm hover:shadow-md"
                            placeholder="Your access key ID (optional)"
                        />
                        <small className="text-slate-500 text-xs mt-2 block font-medium">Optional: Required only for authenticated access</small>
                    </div>

                    <div>
                        <label htmlFor="secretAccessKey" className="block text-sm font-bold text-slate-700 mb-3">
                            Secret Access Key
                        </label>
                        <div className="flex space-x-3">
                            <input
                                type={showSecret ? 'text' : 'password'}
                                id="secretAccessKey"
                                value={secretAccessKey}
                                onChange={(e) => {
                                    setSecretAccessKey(e.target.value);
                                    setError(null);
                                }}
                                className="flex-1 px-5 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium shadow-sm hover:shadow-md"
                                placeholder="Your secret access key (optional)"
                            />
                            <button
                                type="button"
                                className="px-6 py-3.5 border-2 border-slate-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white hover:border-transparent text-slate-700 font-bold transition-all duration-300 shadow-sm hover:shadow-lg transform hover:scale-105"
                                onClick={() => setShowSecret(!showSecret)}
                            >
                                {showSecret ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <small className="text-slate-500 text-xs mt-2 block font-medium">Optional: Required only for authenticated access</small>
                    </div>
                </div>
                <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 to-blue-50/30 border-t-2 border-slate-200 px-8 py-6 rounded-b-3xl flex justify-end space-x-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-6 py-3 border-2 border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-white hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSave} 
                        className="px-8 py-3 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 relative overflow-hidden group"
                    >
                        <span className="relative z-10 flex items-center space-x-2">
                            <span>Save Configuration</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

