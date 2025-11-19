import { useState, useEffect } from 'react';
import { getS3Client } from '../s3-client';
import { HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import { BUCKET_NAME_REGEX, ICON_GRADIENTS } from '../utils/constants';
import { useToast } from '../hooks/useToast';

interface CreateBucketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (bucketName: string) => void;
}

const CreateBucketModal = ({ isOpen, onClose, onCreate }: CreateBucketModalProps) => {
    const [bucketName, setBucketName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        if (!isOpen) {
            setBucketName('');
            setCreating(false);
            setError(null);
        }
    }, [isOpen]);

    const handleCreate = async () => {
        // Prevent double submission
        if (creating) return;
        
        const client = getS3Client();
        if (!client) {
            setError('S3 client not configured. Please configure your credentials.');
            return;
        }
        if (!BUCKET_NAME_REGEX.test(bucketName)) {
            setError('Invalid bucket name. Bucket names must be between 3 and 63 characters long and can only contain lowercase letters, numbers, periods, and hyphens.');
            return;
        }
        setError(null);
        setCreating(true);
        try {
            await client.send(new HeadBucketCommand({ Bucket: bucketName }));
            setError('Bucket name already exists.');
            setCreating(false);
        } catch (error) {
            if ((error as any).name === 'NotFound') {
                try {
                    await client.send(new CreateBucketCommand({ Bucket: bucketName }));
                    showSuccess(`Bucket "${bucketName}" created successfully!`);
                    onCreate(bucketName);
                    setCreating(false);
                } catch (createError) {
                    const errorMsg = `Error creating bucket: ${(createError as any).message}`;
                    setError(errorMsg);
                    showError(errorMsg);
                    setCreating(false);
                }
            } else {
                const errorMsg = `Error checking bucket name: ${(error as any).message}`;
                setError(errorMsg);
                showError(errorMsg);
                setCreating(false);
            }
        }
    };

    const icon = (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );

    const footer = (
        <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose} disabled={creating}>
                Cancel
            </Button>
            <Button variant="success" onClick={handleCreate} isLoading={creating} disabled={!bucketName}>
                Create Bucket
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Bucket"
            icon={icon}
            iconGradient={ICON_GRADIENTS.success}
            footer={footer}
        >
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
            )}
            <Input
                id="bucketName"
                label="Bucket Name"
                value={bucketName}
                onChange={(e) => {
                    setBucketName(e.target.value);
                    setError(null);
                }}
                placeholder="my-bucket-name"
                disabled={creating}
                helperText="Bucket names must be 3-63 characters and contain only lowercase letters, numbers, periods, and hyphens"
            />
        </Modal>
    );
};

export default CreateBucketModal;
