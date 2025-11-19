import { useState, useEffect } from 'react';
import { getS3Client } from '../s3-client';
import { CreateBucketCommand, DeleteBucketCommand, ListObjectsV2Command, CopyObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import ErrorAlert from './ui/ErrorAlert';
import ProgressBar from './ui/ProgressBar';
import { BUCKET_NAME_REGEX, ICON_GRADIENTS } from '../utils/constants';

interface RenameBucketModalProps {
    oldBucketName: string;
    isOpen: boolean;
    onClose: () => void;
    onRenameSuccess: () => void;
}

const RenameBucketModal = ({ oldBucketName, isOpen, onClose, onRenameSuccess }: RenameBucketModalProps) => {
    const [newBucketName, setNewBucketName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setNewBucketName('');
            setIsRenaming(false);
            setProgress(0);
            setStatus('');
            setError(null);
        }
    }, [isOpen]);

    const handleRename = async () => {
        const client = getS3Client();
        if (!client) return;
        setError(null);

        if (!newBucketName) {
            setError('New bucket name cannot be empty.');
            return;
        }

        if (!BUCKET_NAME_REGEX.test(newBucketName)) {
            setError('Invalid new bucket name. Bucket names must be between 3 and 63 characters long and can only contain lowercase letters, numbers, periods, and hyphens.');
            return;
        }

        if (oldBucketName === newBucketName) {
            setError('New bucket name cannot be the same as the old bucket name.');
            return;
        }

        setIsRenaming(true);
        setStatus('Checking new bucket name availability...');

        try {
            // Check if new bucket name already exists
            await client.send(new CreateBucketCommand({ Bucket: newBucketName }));
            // If it doesn't throw, it means it was created, so we delete it to proceed with copy
            await client.send(new DeleteBucketCommand({ Bucket: newBucketName }));
        } catch (e: any) {
            if (e.name === 'BucketAlreadyOwnedByYou' || e.name === 'BucketAlreadyExists') {
                setError('New bucket name already exists.');
            } else {
                setError(`Error checking new bucket name: ${e.message}`);
            }
            setIsRenaming(false);
            return;
        }

        try {
            setStatus('Listing objects in old bucket...');
            let allObjects: { Key?: string }[] = [];
            let isTruncated = true;
            let continuationToken: string | undefined = undefined;

            while (isTruncated) {
                const listedObjects = await client.send(new ListObjectsV2Command({ Bucket: oldBucketName, ContinuationToken: continuationToken }));
                if (listedObjects.Contents) {
                    allObjects = allObjects.concat(listedObjects.Contents);
                }
                isTruncated = listedObjects.IsTruncated || false;
                continuationToken = listedObjects.NextContinuationToken;
            }

            if (allObjects.length === 0) {
                setStatus('Old bucket is empty. Creating new bucket...');
                await client.send(new CreateBucketCommand({ Bucket: newBucketName }));
            } else {
                setStatus(`Copying ${allObjects.length} objects to new bucket...`);
                let copiedCount = 0;
                for (const obj of allObjects) {
                    if (obj.Key) {
                        await client.send(new CopyObjectCommand({
                            CopySource: `/${oldBucketName}/${obj.Key}`,
                            Bucket: newBucketName,
                            Key: obj.Key,
                        }));
                        copiedCount++;
                        setProgress(Math.round((copiedCount / allObjects.length) * 100));
                    }
                }

                setStatus('Deleting objects from old bucket...');
                const deleteParams = {
                    Bucket: oldBucketName,
                    Delete: {
                        Objects: allObjects.map(({ Key }) => ({ Key }))
                    }
                };
                await client.send(new DeleteObjectsCommand(deleteParams));
            }

            setStatus('Deleting old bucket...');
            await client.send(new DeleteBucketCommand({ Bucket: oldBucketName }));

            setStatus('Rename successful!');
            onRenameSuccess();
            onClose();
        } catch (e: any) {
            setError(`Error during rename: ${e.message}`);
        } finally {
            setIsRenaming(false);
        }
    };

    const icon = (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    );

    const footer = (
        <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose} disabled={isRenaming}>
                Cancel
            </Button>
            <Button variant="indigo" onClick={handleRename} isLoading={isRenaming} disabled={!newBucketName}>
                Rename Bucket
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Rename Bucket"
            subtitle={oldBucketName}
            icon={icon}
            iconGradient={ICON_GRADIENTS.indigo}
            footer={footer}
        >
            {error && <ErrorAlert message={error} className="mb-4" />}
            <Input
                id="newBucketName"
                label="New Bucket Name"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                placeholder="new-bucket-name"
                disabled={isRenaming}
            />
            {isRenaming && <ProgressBar progress={progress} status={status} className="mt-4" />}
        </Modal>
    );
};

export default RenameBucketModal;