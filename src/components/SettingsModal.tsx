import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import ErrorAlert from './ui/ErrorAlert';
import { ICON_GRADIENTS } from '../utils/constants';

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

    const icon = (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );

    const footer = (
        <div className="flex justify-end space-x-4">
            <Button variant="secondary" onClick={onClose}>
                Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            }>
                Save Configuration
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="S3 Configuration"
            icon={icon}
            iconGradient={ICON_GRADIENTS.primary}
            footer={footer}
            maxWidth="2xl"
            headerGradient={true}
        >
            <div className="space-y-6">
                {error && <ErrorAlert message={error} />}
                
                <Input
                    id="endpoint"
                    label="S3 Endpoint"
                    type="text"
                    value={endpoint}
                    onChange={(e) => {
                        setEndpoint(e.target.value);
                        setError(null);
                    }}
                    placeholder="https://s3.amazonaws.com or http://localhost:9000"
                    required
                    helperText="The S3 endpoint URL"
                />

                <Input
                    id="region"
                    label="Region"
                    type="text"
                    value={region}
                    onChange={(e) => {
                        setRegion(e.target.value);
                        setError(null);
                    }}
                    placeholder="us-east-1"
                    helperText="AWS region (default: us-east-1)"
                />

                <Input
                    id="accessKeyId"
                    label="Access Key ID"
                    type="text"
                    value={accessKeyId}
                    onChange={(e) => {
                        setAccessKeyId(e.target.value);
                        setError(null);
                    }}
                    placeholder="Your access key ID (optional)"
                    helperText="Optional: Required only for authenticated access"
                />

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
                        <Button
                            variant="secondary"
                            onClick={() => setShowSecret(!showSecret)}
                            className="px-6"
                        >
                            {showSecret ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                    <small className="text-slate-500 text-xs mt-2 block font-medium">Optional: Required only for authenticated access</small>
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;

