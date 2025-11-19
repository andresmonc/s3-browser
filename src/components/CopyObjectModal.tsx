import { useState, useEffect } from 'react';
import { getS3Client } from '../s3-client';
import { CopyObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import ErrorAlert from './ui/ErrorAlert';
import { ICON_GRADIENTS } from '../utils/constants';

interface CopyObjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceBucket: string;
    sourceKey: string;
    onCopySuccess: () => void;
}

const CopyObjectModal = ({ isOpen, onClose, sourceBucket, sourceKey, onCopySuccess }: CopyObjectModalProps) => {
    const [targetBucket, setTargetBucket] = useState(sourceBucket);
    const [targetKey, setTargetKey] = useState(sourceKey);
    const [buckets, setBuckets] = useState<string[]>([]);
    const [copying, setCopying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTargetBucket(sourceBucket);
            setTargetKey(sourceKey);
            setError(null);
            loadBuckets();
        }
    }, [isOpen, sourceBucket, sourceKey]);

    const loadBuckets = async () => {
        const client = getS3Client();
        if (!client) return;
        try {
            const response = await client.send(new ListBucketsCommand({}));
            setBuckets(response.Buckets?.map(b => b.Name || '').filter(Boolean) || []);
        } catch (err) {
            console.error('Error loading buckets:', err);
        }
    };

    const handleCopy = async () => {
        if (!targetBucket || !targetKey) {
            setError('Please fill in all fields');
            return;
        }

        if (targetBucket === sourceBucket && targetKey === sourceKey) {
            setError('Target cannot be the same as source');
            return;
        }

        setError(null);
        setCopying(true);
        const client = getS3Client();
        if (!client) {
            setError('S3 client not configured');
            setCopying(false);
            return;
        }

        try {
            await client.send(new CopyObjectCommand({
                CopySource: `/${sourceBucket}/${sourceKey}`,
                Bucket: targetBucket,
                Key: targetKey,
            }));
            onCopySuccess();
            onClose();
        } catch (err: any) {
            setError(`Error copying object: ${err.message}`);
        } finally {
            setCopying(false);
        }
    };

    const icon = (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    );

    const footer = (
        <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose} disabled={copying}>
                Cancel
            </Button>
            <Button variant="primary" onClick={handleCopy} isLoading={copying}>
                Copy Object
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Copy Object"
            subtitle={`From: ${sourceBucket}/${sourceKey}`}
            icon={icon}
            iconGradient={ICON_GRADIENTS.primary}
            footer={footer}
        >
            <div className="space-y-5">
                {error && <ErrorAlert message={error} />}

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                        Target Bucket
                    </label>
                    <select
                        value={targetBucket}
                        onChange={(e) => setTargetBucket(e.target.value)}
                        className="w-full px-5 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm font-medium shadow-sm hover:shadow-md"
                        disabled={copying}
                    >
                        {buckets.map(bucket => (
                            <option key={bucket} value={bucket}>{bucket}</option>
                        ))}
                    </select>
                </div>

                <Input
                    id="targetKey"
                    label="Target Key (Path)"
                    value={targetKey}
                    onChange={(e) => setTargetKey(e.target.value)}
                    placeholder="path/to/new-object.ext"
                    disabled={copying}
                    helperText="Enter the new path/name for the copied object"
                />
            </div>
        </Modal>
    );
};

export default CopyObjectModal;

