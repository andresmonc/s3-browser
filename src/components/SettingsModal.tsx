import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import ErrorAlert from './ui/ErrorAlert';
import PasswordModal from './PasswordModal';
import { ICON_GRADIENTS } from '../utils/constants';
import { useToast } from '../hooks/useToast';
import { encryptAndStoreCredentials, hasEncryptedCredentials } from '../utils/encryption';
import { useCredentials } from '../contexts/CredentialContext';
import { downloadOfflineBundle } from '../utils/downloadBundle';

export interface S3Credentials {
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

const SettingsModal = ({ isOpen, onClose, onSave }: SettingsModalProps) => {
    const [endpoint, setEndpoint] = useState('');
    const [region, setRegion] = useState('us-east-1');
    const [accessKeyId, setAccessKeyId] = useState('');
    const [secretAccessKey, setSecretAccessKey] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingCredentials, setPendingCredentials] = useState<S3Credentials | null>(null);
    const { showSuccess, showError: showErrorToast } = useToast();
    const { credentials: currentCreds, setCredentials } = useCredentials();

    useEffect(() => {
        if (isOpen) {
            // Load from in-memory credentials if available
            if (currentCreds) {
                setEndpoint(currentCreds.endpoint || '');
                setRegion(currentCreds.region || 'us-east-1');
                setAccessKeyId(currentCreds.accessKeyId || '');
                setSecretAccessKey(currentCreds.secretAccessKey || '');
            } else {
                // Reset to defaults
                setEndpoint('');
                setRegion('us-east-1');
                setAccessKeyId('');
                setSecretAccessKey('');
            }
            setError(null);
        }
    }, [isOpen, currentCreds]);

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

        // Check if we need to set/update password
        if (hasEncryptedCredentials()) {
            // Credentials exist, need password to update
            setPendingCredentials(credentials);
            setShowPasswordModal(true);
        } else {
            // First time setup - need to set password
            setPendingCredentials(credentials);
            setShowPasswordModal(true);
        }
    };

    const handlePasswordSet = async (password: string) => {
        if (!pendingCredentials) return;

        try {
            await encryptAndStoreCredentials(pendingCredentials, password);
            setCredentials(pendingCredentials);
            showSuccess('S3 configuration saved and encrypted successfully!');
            onSave(pendingCredentials);
            setShowPasswordModal(false);
            setPendingCredentials(null);
            onClose();
        } catch (error: any) {
            showErrorToast(`Failed to encrypt credentials: ${error.message}`);
        }
    };

    const handlePasswordVerified = async (password: string) => {
        if (!pendingCredentials) return;

        try {
            await encryptAndStoreCredentials(pendingCredentials, password);
            setCredentials(pendingCredentials);
            showSuccess('S3 configuration updated successfully!');
            onSave(pendingCredentials);
            setShowPasswordModal(false);
            setPendingCredentials(null);
            onClose();
        } catch (error: any) {
            showErrorToast(`Failed to update credentials: ${error.message}`);
        }
    };

    const icon = (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );

    const footer = (
        <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={onClose} size="sm">
                Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} size="sm" icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            }>
                Save Configuration
            </Button>
        </div>
    );

    return (
        <>
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
            <div className="space-y-4">
                {error && <ErrorAlert message={error} />}
                
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h4 className="text-xs font-semibold text-slate-900 mb-1">Offline Bundle</h4>
                            <p className="text-xs text-slate-600">Download instructions for running offline</p>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={downloadOfflineBundle}
                            icon={
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            }
                        >
                            Download Bundle
                        </Button>
                    </div>
                </div>
                
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
                    <label htmlFor="secretAccessKey" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Secret Access Key
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type={showSecret ? 'text' : 'password'}
                            id="secretAccessKey"
                            value={secretAccessKey}
                            onChange={(e) => {
                                setSecretAccessKey(e.target.value);
                                setError(null);
                            }}
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 bg-white font-medium"
                            placeholder="Your secret access key (optional)"
                        />
                        <Button
                            variant="secondary"
                            onClick={() => setShowSecret(!showSecret)}
                            size="sm"
                            className="px-3"
                        >
                            {showSecret ? 'Hide' : 'Show'}
                        </Button>
                    </div>
                    <small className="text-slate-500 text-xs mt-1 block">Optional: Required only for authenticated access</small>
                </div>
            </div>
        </Modal>
        {showPasswordModal && (
            <PasswordModal
                isOpen={showPasswordModal}
                isFirstTime={!hasEncryptedCredentials()}
                onPasswordSet={handlePasswordSet}
                onPasswordVerified={handlePasswordVerified}
                onCancel={() => {
                    setShowPasswordModal(false);
                    setPendingCredentials(null);
                }}
            />
        )}
    </>
    );
};

export default SettingsModal;

