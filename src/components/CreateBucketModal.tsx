import { useState, useEffect } from 'react';
import { getS3Client } from '../s3-client';
import { HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import { BUCKET_NAME_REGEX, ICON_GRADIENTS } from '../utils/constants';

interface CreateBucketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (bucketName: string) => void;
}

const CreateBucketModal = ({ isOpen, onClose, onCreate }: CreateBucketModalProps) => {
    const [bucketName, setBucketName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setBucketName('');
            setCreating(false);
            setError(null);
        }
    }, [isOpen]);

    const handleCreate = async () => {
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
        } catch (error) {
            if ((error as any).name === 'NotFound') {
                try {
                    await client.send(new CreateBucketCommand({ Bucket: bucketName }));
                    onCreate(bucketName);
                } catch (createError) {
                    console.error('Error creating bucket:', createError);
                    setError(`Error creating bucket: ${(createError as any).message}`);
                }
            } else {
                console.error('Error checking bucket name:', error);
                setError(`Error checking bucket name: ${(error as any).message}`);
            }
        }
        setCreating(false);
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
