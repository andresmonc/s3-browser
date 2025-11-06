import { useState, useEffect } from 'react';
import { s3Client } from '../s3-client';
import { CreateBucketCommand, DeleteBucketCommand, ListObjectsV2Command, CopyObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

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
        if (!s3Client) return;
        setError(null);

        if (!newBucketName) {
            setError('New bucket name cannot be empty.');
            return;
        }

        if (!/^[a-z0-9.-]{3,63}$/.test(newBucketName)) {
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
            await s3Client.send(new CreateBucketCommand({ Bucket: newBucketName }));
            // If it doesn't throw, it means it was created, so we delete it to proceed with copy
            await s3Client.send(new DeleteBucketCommand({ Bucket: newBucketName }));
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
                const listedObjects = await s3Client.send(new ListObjectsV2Command({ Bucket: oldBucketName, ContinuationToken: continuationToken }));
                if (listedObjects.Contents) {
                    allObjects = allObjects.concat(listedObjects.Contents);
                }
                isTruncated = listedObjects.IsTruncated || false;
                continuationToken = listedObjects.NextContinuationToken;
            }

            if (allObjects.length === 0) {
                setStatus('Old bucket is empty. Creating new bucket...');
                await s3Client.send(new CreateBucketCommand({ Bucket: newBucketName }));
            } else {
                setStatus(`Copying ${allObjects.length} objects to new bucket...`);
                let copiedCount = 0;
                for (const obj of allObjects) {
                    if (obj.Key) {
                        await s3Client.send(new CopyObjectCommand({
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
                await s3Client.send(new DeleteObjectsCommand(deleteParams));
            }

            setStatus('Deleting old bucket...');
            await s3Client.send(new DeleteBucketCommand({ Bucket: oldBucketName }));

            setStatus('Rename successful!');
            onRenameSuccess();
            onClose();
        } catch (e: any) {
            setError(`Error during rename: ${e.message}`);
        } finally {
            setIsRenaming(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Rename Bucket: {oldBucketName}</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        <div className="mb-3">
                            <label htmlFor="newBucketName" className="form-label">New Bucket Name</label>
                            <input
                                type="text"
                                id="newBucketName"
                                value={newBucketName}
                                onChange={(e) => setNewBucketName(e.target.value)}
                                className="form-control"
                                disabled={isRenaming}
                            />
                        </div>

                        {isRenaming && (
                            <div className="mb-3">
                                <p>{status}</p>
                                <div className="progress">
                                    <div className="progress-bar" role="progressbar" style={{ width: `${progress}%` }} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isRenaming}>
                            Cancel
                        </button>
                        <button type="button" onClick={handleRename} className="btn btn-primary" disabled={isRenaming || !newBucketName}>
                            {isRenaming ? 'Renaming...' : 'Rename'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RenameBucketModal;