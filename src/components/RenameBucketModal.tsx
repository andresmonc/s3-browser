import { useState, useEffect } from 'react';
import { getS3Client } from '../s3-client';
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
        const client = getS3Client();
        if (!client) return;
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

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                            <h5 className="text-xl font-bold text-slate-800">Rename Bucket</h5>
                            <p className="text-sm text-slate-500">{oldBucketName}</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                        onClick={onClose}
                        disabled={isRenaming}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 mb-4">
                            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <strong className="text-red-800 font-semibold">Error:</strong>
                                <p className="text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <label htmlFor="newBucketName" className="block text-sm font-semibold text-slate-700 mb-2">New Bucket Name</label>
                        <input
                            type="text"
                            id="newBucketName"
                            value={newBucketName}
                            onChange={(e) => setNewBucketName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                            placeholder="new-bucket-name"
                            disabled={isRenaming}
                        />
                    </div>

                    {isRenaming && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <p className="text-sm font-medium text-blue-800 mb-3">{status}</p>
                            <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-blue-600 mt-2 text-right">{progress}%</p>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end space-x-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isRenaming}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={handleRename} 
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        disabled={isRenaming || !newBucketName}
                    >
                        {isRenaming ? (
                            <span className="flex items-center space-x-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Renaming...</span>
                            </span>
                        ) : 'Rename Bucket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameBucketModal;