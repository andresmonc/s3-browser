import { useEffect, useState } from 'react';
import { s3Client } from '../s3-client';
import { CreateBucketCommand, DeleteBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import CreateBucketModal from './CreateBucketModal';

interface BucketListProps {
    selectedBucket: string | null;
    onSelectBucket: (bucket: string | null) => void;
}

const BucketList = ({ selectedBucket, onSelectBucket }: BucketListProps) => {
    const [buckets, setBuckets] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refresh, setRefresh] = useState(false);

    useEffect(() => {
        const fetchBuckets = async () => {
            if (!s3Client) return;
            try {
                const response = await s3Client.send(new ListBucketsCommand({}));
                setBuckets(response.Buckets?.map(bucket => bucket.Name || '').filter(Boolean) || []);
            } catch (error) {
                console.error('Error fetching buckets:', error);
            }
        };

        fetchBuckets();
    }, [refresh]);

    const handleCreateBucket = async (bucketName: string) => {
        if (!s3Client) return;
        try {
            await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
            setIsModalOpen(false);
            setRefresh(!refresh);
        } catch (error) {
            console.error('Error creating bucket:', error);
        }
    };

    const handleDeleteBucket = async (bucketName: string) => {
        if (!s3Client) return;
        if (window.confirm(`Are you sure you want to delete bucket "${bucketName}"?`)) {
            try {
                await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
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
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Buckets</h2>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    New
                </button>
            </div>
            <ul>
                {buckets.map(bucket => (
                    <li key={bucket} 
                        className={`flex justify-between items-center p-2 rounded cursor-pointer ${
                            selectedBucket === bucket ? 'bg-gray-600' : 'hover:bg-gray-700'
                        }`}>
                        <span onClick={() => onSelectBucket(bucket)} className="flex-grow">{bucket}</span>
                        <button onClick={() => handleDeleteBucket(bucket)} className="text-red-500 hover:text-red-700 font-bold">X</button>
                    </li>
                ))}
            </ul>
            <CreateBucketModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateBucket}
            />
        </div>
    );
};

export default BucketList;
