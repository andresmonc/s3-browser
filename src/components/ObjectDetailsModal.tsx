import { useEffect, useState } from 'react';
import { getS3Client } from '../s3-client';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { ICON_GRADIENTS } from '../utils/constants';
import prettyBytes from 'pretty-bytes';
import { useToast } from '../hooks/useToast';

interface ObjectDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    bucketName: string;
    objectKey: string;
}

const ObjectDetailsModal = ({ isOpen, onClose, bucketName, objectKey }: ObjectDetailsModalProps) => {
    const [metadata, setMetadata] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showError: showErrorToast } = useToast();

    useEffect(() => {
        if (!isOpen || !bucketName || !objectKey) return;

        const loadMetadata = async () => {
            setLoading(true);
            setError(null);
            const client = getS3Client();
            if (!client) {
                const errorMsg = 'S3 client not configured';
                setError(errorMsg);
                showErrorToast(errorMsg);
                setLoading(false);
                return;
            }

            try {
                const command = new HeadObjectCommand({ Bucket: bucketName, Key: objectKey });
                const response = await client.send(command);
                setMetadata(response);
            } catch (err: any) {
                const errorMsg = `Error loading metadata: ${err.message}`;
                setError(errorMsg);
                showErrorToast(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        loadMetadata();
    }, [isOpen, bucketName, objectKey]);

    const icon = (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );

    const footer = (
        <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
                Close
            </Button>
        </div>
    );

    const formatValue = (key: string, value: any): string => {
        if (key === 'LastModified' || key === 'lastModified') {
            return new Date(value).toLocaleString();
        }
        if (key === 'ContentLength' || key === 'contentLength' || key === 'Size') {
            return prettyBytes(value || 0);
        }
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Object Details"
            subtitle={objectKey}
            icon={icon}
            iconGradient={ICON_GRADIENTS.indigo}
            footer={footer}
            maxWidth="2xl"
        >
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
            {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            )}
            {!loading && !error && metadata && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Size</div>
                            <div className="text-lg font-bold text-blue-900">{prettyBytes(metadata.ContentLength || 0)}</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                            <div className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Content Type</div>
                            <div className="text-lg font-bold text-purple-900">{metadata.ContentType || 'Unknown'}</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                            <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Last Modified</div>
                            <div className="text-lg font-bold text-green-900">
                                {metadata.LastModified ? new Date(metadata.LastModified).toLocaleString() : 'Unknown'}
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                            <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">ETag</div>
                            <div className="text-sm font-bold text-orange-900 break-all">{metadata.ETag || 'N/A'}</div>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">All Metadata</div>
                        <div className="space-y-2">
                            {Object.entries(metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-start py-2 border-b border-slate-200 last:border-0">
                                    <span className="text-sm font-semibold text-slate-700">{key}</span>
                                    <span className="text-sm text-slate-600 text-right ml-4 break-all">{formatValue(key, value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ObjectDetailsModal;

