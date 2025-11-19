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
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={onClose}>
            <div className="modal-dialog">
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h5 className="modal-title">S3 Configuration</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        <div className="mb-3">
                            <label htmlFor="endpoint" className="form-label">
                                S3 Endpoint <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                id="endpoint"
                                value={endpoint}
                                onChange={(e) => {
                                    setEndpoint(e.target.value);
                                    setError(null);
                                }}
                                className="form-control"
                                placeholder="https://s3.amazonaws.com or http://localhost:9000"
                                required
                            />
                            <small className="form-text text-muted">The S3 endpoint URL</small>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="region" className="form-label">Region</label>
                            <input
                                type="text"
                                id="region"
                                value={region}
                                onChange={(e) => {
                                    setRegion(e.target.value);
                                    setError(null);
                                }}
                                className="form-control"
                                placeholder="us-east-1"
                            />
                            <small className="form-text text-muted">AWS region (default: us-east-1)</small>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="accessKeyId" className="form-label">
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
                                className="form-control"
                                placeholder="Your access key ID (optional)"
                            />
                            <small className="form-text text-muted">Optional: Required only for authenticated access</small>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="secretAccessKey" className="form-label">
                                Secret Access Key
                            </label>
                            <div className="input-group">
                                <input
                                    type={showSecret ? 'text' : 'password'}
                                    id="secretAccessKey"
                                    value={secretAccessKey}
                                    onChange={(e) => {
                                        setSecretAccessKey(e.target.value);
                                        setError(null);
                                    }}
                                    className="form-control"
                                    placeholder="Your secret access key (optional)"
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowSecret(!showSecret)}
                                >
                                    {showSecret ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            <small className="form-text text-muted">Optional: Required only for authenticated access</small>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="button" onClick={handleSave} className="btn btn-primary">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

