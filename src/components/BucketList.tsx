import { useEffect, useState } from 'react';
import { getS3Client } from '../s3-client';
import { CreateBucketCommand, DeleteBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import CreateBucketModal from './CreateBucketModal';
import BucketSettingsModal from './BucketSettingsModal';
import RenameBucketModal from './RenameBucketModal';

interface BucketListProps {
    selectedBucket: string | null;
    onSelectBucket: (bucket: string | null) => void;
}

const BucketList = ({ selectedBucket, onSelectBucket }: BucketListProps) => {
    const [buckets, setBuckets] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [selectedBucketToRename, setSelectedBucketToRename] = useState<string | null>(null);
    const [selectedBucketForSettings, setSelectedBucketForSettings] = useState<string | null>(null);
    const [refresh, setRefresh] = useState(false);

    const handleRenameBucket = (bucketName: string) => {
        setSelectedBucketToRename(bucketName);
        setIsRenameModalOpen(true);
    };

    useEffect(() => {
        const fetchBuckets = async () => {
            const client = getS3Client();
            if (!client) return;
            try {
                const response = await client.send(new ListBucketsCommand({}));
                setBuckets(response.Buckets?.map(bucket => bucket.Name || '').filter(Boolean) || []);
            } catch (error) {
                console.error('Error fetching buckets:', error);
            }
        };

        fetchBuckets();
    }, [refresh]);

    const handleCreateBucket = async (bucketName: string) => {
        const client = getS3Client();
        if (!client) return;
        try {
            await client.send(new CreateBucketCommand({ Bucket: bucketName }));
            setIsModalOpen(false);
            setRefresh(!refresh);
        } catch (error) {
            console.error('Error creating bucket:', error);
        }
    };

    const handleDeleteBucket = async (bucketName: string) => {
        const client = getS3Client();
        if (!client) return;
        if (window.confirm(`Are you sure you want to delete bucket "${bucketName}"?`)) {
            try {
                await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
                setRefresh(!refresh);
                if (selectedBucket === bucketName) {
                    onSelectBucket(null);
                }
            } catch (error) {
                console.error('Error deleting bucket:', error);
            }
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5">Buckets</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                    New
                </button>
            </div>
            <ul className="list-group">
                {buckets.map(bucket => (
                    <li key={bucket} 
                        className={`list-group-item d-flex justify-content-between align-items-center ${selectedBucket === bucket ? 'active' : ''}`}>
                        <span onClick={() => onSelectBucket(bucket)} className="flex-grow-1">{bucket}</span>
                        <button onClick={() => {
                            setSelectedBucketForSettings(bucket);
                            setIsSettingsModalOpen(true);
                        }} className="btn btn-sm btn-outline-secondary me-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-three-dots" viewBox="0 0 16 16">
                                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                            </svg>
                        </button>
                        <button onClick={() => handleRenameBucket(bucket)} className="btn btn-sm btn-outline-secondary me-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil" viewBox="0 0 16 16">
                                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                            </svg>
                        </button>
                        <button onClick={() => handleDeleteBucket(bucket)} className="btn btn-sm btn-danger">X</button>
                    </li>
                ))}
            </ul>
            <CreateBucketModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateBucket}
            />
            {selectedBucketForSettings && (
                <BucketSettingsModal
                    bucketName={selectedBucketForSettings}
                    isOpen={isSettingsModalOpen}
                    onClose={() => {
                        setIsSettingsModalOpen(false);
                        setSelectedBucketForSettings(null);
                    }}
                />
            )}
            {selectedBucketToRename && (
                <RenameBucketModal
                    oldBucketName={selectedBucketToRename}
                    isOpen={isRenameModalOpen}
                    onClose={() => {
                        setIsRenameModalOpen(false);
                        setSelectedBucketToRename(null);
                    }}
                    onRenameSuccess={() => {
                        setRefresh(!refresh);
                        onSelectBucket(null);
                    }}
                />
            )}
        </div>
    );
};

export default BucketList;
