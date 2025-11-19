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
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Buckets</h2>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 relative overflow-hidden group"
                >
                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
            </div>
            <div className="space-y-3">
                {buckets.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-float">
                            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <p className="text-base font-semibold text-slate-600 mb-1">No buckets yet</p>
                        <p className="text-sm text-slate-400">Create your first bucket to get started</p>
                    </div>
                ) : (
                    buckets.map((bucket, index) => (
                        <div
                            key={bucket}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className={`group relative flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                                selectedBucket === bucket
                                    ? 'bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 border-transparent shadow-xl text-white'
                                    : 'bg-white/80 backdrop-blur-sm border-slate-200 hover:border-blue-300 hover:shadow-lg'
                            }`}
                        >
                            <div 
                                onClick={() => onSelectBucket(bucket)} 
                                className="flex-1 min-w-0 pr-3"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                        selectedBucket === bucket 
                                            ? 'bg-white shadow-lg' 
                                            : 'bg-gradient-to-r from-blue-400 to-purple-400'
                                    } animate-pulse`}></div>
                                    <span className={`font-bold truncate text-base ${
                                        selectedBucket === bucket 
                                            ? 'text-white' 
                                            : 'text-slate-700'
                                    }`}>
                                        {bucket}
                                    </span>
                                </div>
                            </div>
                            <div className={`flex items-center space-x-1 transition-opacity duration-300 ${
                                selectedBucket === bucket ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedBucketForSettings(bucket);
                                        setIsSettingsModalOpen(true);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${
                                        selectedBucket === bucket
                                            ? 'text-white hover:bg-white/20'
                                            : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                    }`}
                                    title="Settings"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRenameBucket(bucket);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${
                                        selectedBucket === bucket
                                            ? 'text-white hover:bg-white/20'
                                            : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                                    }`}
                                    title="Rename"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBucket(bucket);
                                    }}
                                    className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-110 ${
                                        selectedBucket === bucket
                                            ? 'text-white hover:bg-white/20'
                                            : 'text-slate-600 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title="Delete"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
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
