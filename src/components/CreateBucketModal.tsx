import { useState, useEffect } from 'react';
import { s3Client } from '../s3-client';
import { HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';

interface CreateBucketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (bucketName: string) => void;
}

const CreateBucketModal = ({ isOpen, onClose, onCreate }: CreateBucketModalProps) => {
    const [bucketName, setBucketName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setBucketName('');
            setCreating(false);
        }
    }, [isOpen]);

    const handleCreate = async () => {
        if (!/^[a-z0-9.-]{3,63}$/.test(bucketName)) {
            alert('Invalid bucket name. Bucket names must be between 3 and 63 characters long and can only contain lowercase letters, numbers, periods, and hyphens.');
            return;
        }
        setCreating(true);
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
            alert('Bucket name already exists.');
        } catch (error) {
            if ((error as any).name === 'NotFound') {
                try {
                    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
                    onCreate(bucketName);
                } catch (createError) {
                    console.error('Error creating bucket:', createError);
                    alert(`Error creating bucket: ${(createError as any).message}`);
                }
            } else {
                console.error('Error checking bucket name:', error);
                alert(`Error checking bucket name: ${(error as any).message}`);
            }
        }
        setCreating(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Create New Bucket</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="mb-3">
                            <label htmlFor="bucketName" className="form-label">Bucket Name</label>
                            <input
                                type="text"
                                id="bucketName"
                                value={bucketName}
                                onChange={(e) => setBucketName(e.target.value)}
                                className="form-control"
                                placeholder="Bucket Name"
                                disabled={creating}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={creating}>
                            Cancel
                        </button>
                        <button type="button" onClick={handleCreate} className="btn btn-primary" disabled={creating || !bucketName}>
                            {creating ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBucketModal;
