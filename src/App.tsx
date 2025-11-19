import { useState, useEffect } from 'react';
import BucketList from './components/BucketList';
import ObjectList from './components/ObjectList';
import SettingsModal from './components/SettingsModal';
import { getS3Client, refreshS3Client } from './s3-client';
import type { S3Client } from '@aws-sdk/client-s3';

function App() {
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
    const [s3Client, setS3Client] = useState<S3Client | null>(getS3Client());
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        // Check if credentials exist on mount
        const client = getS3Client();
        if (!client) {
            setIsSettingsOpen(true);
        }
        setS3Client(client);
    }, []);

    const handleSaveCredentials = () => {
        const client = refreshS3Client();
        setS3Client(client);
        setIsSettingsOpen(false);
    };

    if (!s3Client) {
        return (
            <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
                <div className="p-4 bg-white rounded shadow text-center">
                    <h1 className="h2 text-danger mb-3">Configuration Required</h1>
                    <p className="text-secondary">Please configure your S3 credentials to continue.</p>
                    <button 
                        className="btn btn-primary mt-3"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        Configure S3 Settings
                    </button>
                </div>
                <SettingsModal 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)}
                    onSave={handleSaveCredentials}
                />
            </div>
        );
    }

    return (
        <div className="d-flex vh-100 bg-light font-sans">
            <div className="w-25 bg-dark text-white p-3 overflow-auto position-relative">
                <button
                    className="btn btn-sm btn-outline-light position-absolute top-0 end-0 m-2"
                    onClick={() => setIsSettingsOpen(true)}
                    title="Settings"
                    style={{ zIndex: 10 }}
                >
                    ⚙️ Settings
                </button>
                <BucketList selectedBucket={selectedBucket} onSelectBucket={setSelectedBucket} />
            </div>
            <div className="w-75 p-3 d-flex flex-column">
                <ObjectList selectedBucket={selectedBucket} />
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
