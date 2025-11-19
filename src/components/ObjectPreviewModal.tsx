import { useEffect, useState } from 'react';
import { getS3Client } from '../s3-client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { ICON_GRADIENTS } from '../utils/constants';
import { useToast } from '../hooks/useToast';

interface ObjectPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    bucketName: string;
    objectKey: string;
}

const ObjectPreviewModal = ({ isOpen, onClose, bucketName, objectKey }: ObjectPreviewModalProps) => {
    const [content, setContent] = useState<string | null>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contentType, setContentType] = useState<string>('');
    const { showError: showErrorToast } = useToast();

    useEffect(() => {
        if (!isOpen || !bucketName || !objectKey) return;

        const loadPreview = async () => {
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
                const command = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
                const response = await client.send(command);
                const detectedContentType = response.ContentType || '';
                setContentType(detectedContentType);

                if (detectedContentType.startsWith('image/')) {
                    const blob = await response.Body?.transformToByteArray();
                    if (blob) {
                        const url = URL.createObjectURL(new Blob([blob], { type: detectedContentType }));
                        setObjectUrl(url);
                    }
                } else if (detectedContentType.startsWith('text/') || detectedContentType === 'application/json') {
                    const text = await response.Body?.transformToString();
                    setContent(text || '');
                } else {
                    setError('Preview not available for this file type');
                }
            } catch (err: any) {
                const errorMsg = `Error loading preview: ${err.message}`;
                setError(errorMsg);
                showErrorToast(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        loadPreview();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [isOpen, bucketName, objectKey]);

    const icon = (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    );

    const footer = (
        <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
                Close
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Object Preview"
            subtitle={objectKey}
            icon={icon}
            iconGradient={ICON_GRADIENTS.primary}
            footer={footer}
            maxWidth="4xl"
        >
            <div className="min-h-[400px]">
                {loading && (
                    <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                            <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-slate-600 font-medium">Loading preview...</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-700 font-medium">{error}</p>
                    </div>
                )}
                {!loading && !error && objectUrl && (
                    <div className="flex items-center justify-center bg-slate-50 rounded-xl p-4">
                        <img src={objectUrl} alt={objectKey} className="max-w-full max-h-[600px] rounded-lg shadow-lg" />
                    </div>
                )}
                {!loading && !error && content !== null && (
                    <div className="bg-slate-900 rounded-xl p-6 overflow-auto max-h-[600px]">
                        <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">{content}</pre>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ObjectPreviewModal;

