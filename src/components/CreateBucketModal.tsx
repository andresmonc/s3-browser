import { useState, useEffect } from 'react';
import { getS3Client } from '../s3-client';
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
        const client = getS3Client();
        if (!client) {
            alert('S3 client not configured. Please configure your credentials.');
            return;
        }
        if (!/^[a-z0-9.-]{3,63}$/.test(bucketName)) {
            alert('Invalid bucket name. Bucket names must be between 3 and 63 characters long and can only contain lowercase letters, numbers, periods, and hyphens.');
            return;
        }
        setCreating(true);
        try {
            await client.send(new HeadBucketCommand({ Bucket: bucketName }));
            alert('Bucket name already exists.');
        } catch (error) {
            if ((error as any).name === 'NotFound') {
                try {
                    await client.send(new CreateBucketCommand({ Bucket: bucketName }));
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
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h5 className="text-xl font-bold text-slate-800">Create New Bucket</h5>
                    </div>
                    <button 
                        type="button" 
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                        onClick={onClose}
                        disabled={creating}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    <div>
                        <label htmlFor="bucketName" className="block text-sm font-semibold text-slate-700 mb-2">Bucket Name</label>
                        <input
                            type="text"
                            id="bucketName"
                            value={bucketName}
                            onChange={(e) => setBucketName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                            placeholder="my-bucket-name"
                            disabled={creating}
                        />
                        <small className="text-slate-500 text-xs mt-1.5 block">Bucket names must be 3-63 characters and contain only lowercase letters, numbers, periods, and hyphens</small>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex justify-end space-x-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={creating}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        onClick={handleCreate} 
                        className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        disabled={creating || !bucketName}
                    >
                        {creating ? (
                            <span className="flex items-center space-x-2">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Creating...</span>
                            </span>
                        ) : 'Create Bucket'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateBucketModal;
