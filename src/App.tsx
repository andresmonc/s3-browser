import { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import BucketList from './components/BucketList';
import ObjectList from './components/ObjectList';
import SettingsModal from './components/SettingsModal';
import PasswordModal from './components/PasswordModal';
import { getS3Client, refreshS3Client } from './s3-client';
import { useCredentials } from './contexts/CredentialContext';
import { hasEncryptedCredentials, verifyPasswordAndDecryptCredentials, clearEncryptedCredentials } from './utils/encryption';
import type { S3Client } from '@aws-sdk/client-s3';
import { useToast } from './hooks/useToast';

function App() {
    const { credentials, setCredentials, clearCredentials } = useCredentials();
    const [s3Client, setS3Client] = useState<S3Client | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const { showSuccess, showError, showInfo } = useToast();

    useEffect(() => {
        // Check if encrypted credentials exist
        if (hasEncryptedCredentials()) {
            // Need to prompt for password
            setIsPasswordModalOpen(true);
        } else {
            // No credentials, show settings
            setIsSettingsOpen(true);
        }
    }, []);

    useEffect(() => {
        // Update S3 client when credentials change
        if (credentials) {
            const client = getS3Client(credentials);
            setS3Client(client);
        } else {
            setS3Client(null);
        }
    }, [credentials]);

    const handlePasswordVerified = async (password: string) => {
        try {
            const decryptedCreds = await verifyPasswordAndDecryptCredentials(password);
            setCredentials(decryptedCreds);
            setIsPasswordModalOpen(false);
            showSuccess('Credentials unlocked successfully!');
        } catch (error: any) {
            showError(error.message || 'Failed to decrypt credentials');
        }
    };

    const handlePasswordSet = async (password: string) => {
        // This shouldn't happen here, but handle it gracefully
        setIsPasswordModalOpen(false);
        setIsSettingsOpen(true);
    };

    const handleResetCredentials = () => {
        clearEncryptedCredentials();
        clearCredentials();
        setIsPasswordModalOpen(false);
        setIsSettingsOpen(true);
        showInfo('Credentials reset. Please reconfigure your S3 settings.');
    };

    const handleSaveCredentials = () => {
        setIsSettingsOpen(false);
        if (credentials) {
            showSuccess('S3 connection established successfully!');
        }
    };

    if (!s3Client) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
                </div>
                
                <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border border-white/20 animate-float">
                    <div className="mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-glow">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">Configuration Required</h1>
                        <p className="text-slate-600 text-lg">Please configure your S3 credentials to continue.</p>
                    </div>
                    <button 
                        className="w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden group"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        <span className="relative z-10 flex items-center justify-center space-x-2">
                            <span>Configure S3 Settings</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </button>
                </div>
                <SettingsModal 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)}
                    onSave={handleSaveCredentials}
                />
                <PasswordModal
                    isOpen={isPasswordModalOpen}
                    isFirstTime={false}
                    onPasswordVerified={handlePasswordVerified}
                    onPasswordSet={handlePasswordSet}
                    onCancel={() => {
                        setIsPasswordModalOpen(false);
                        setIsSettingsOpen(true);
                    }}
                    onReset={handleResetCredentials}
                />
            </div>
        );
    }

    return (
        <>
            <AppContent />
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveCredentials}
            />
        </>
    );
}

function AppContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const { credentials } = useCredentials();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { showSuccess } = useToast();

    const handleSaveCredentials = () => {
        setIsSettingsOpen(false);
        if (credentials) {
            showSuccess('S3 connection established successfully!');
        }
    };

    const handleBucketSelect = (bucket: string | null) => {
        if (bucket) {
            navigate(`/bucket/${encodeURIComponent(bucket)}`);
        } else {
            navigate('/');
        }
    };

    // Get selected bucket from URL
    const bucketMatch = location.pathname.match(/^\/bucket\/([^/]+)/);
    const selectedBucket = bucketMatch ? decodeURIComponent(bucketMatch[1]) : null;

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex relative overflow-hidden">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 min-h-0 min-w-0 relative z-10 overflow-hidden">
                <aside className="w-80 h-full bg-white/70 backdrop-blur-xl border-r border-white/20 shadow-xl flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-white/20 flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md transform hover:scale-110 transition-transform duration-300">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">S3 Browser</h1>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <BucketList 
                            selectedBucket={selectedBucket}
                            onSelectBucket={handleBucketSelect}
                        />
                    </div>
                    <div className="p-4 border-t border-white/20">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-slate-700 hover:text-white bg-white/50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 rounded-lg transition-all duration-300 font-medium text-sm shadow-sm hover:shadow-md border border-slate-200/50 hover:border-transparent"
                            title="Settings"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Settings</span>
                        </button>
                    </div>
                </aside>
                <main className="flex-1 h-full overflow-y-auto p-8 min-w-0 max-w-full">
                    <div className="w-full max-w-full">
                        <Routes>
                            <Route path="/" element={<ObjectList />} />
                            <Route path="/bucket/:bucketName/*" element={<ObjectList />} />
                        </Routes>
                    </div>
                </main>
            </div>
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveCredentials}
            />
        </div>
    );
}

export default App;
