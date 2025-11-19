import { useEffect, useState, useCallback } from 'react';
import { getS3Client } from '../s3-client';
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, _Object } from '@aws-sdk/client-s3';
import prettyBytes from 'pretty-bytes';
import { useDropzone } from 'react-dropzone';
import { Upload } from '@aws-sdk/lib-storage';
import Button from './ui/Button';
import ObjectPreviewModal from './ObjectPreviewModal';
import ObjectDetailsModal from './ObjectDetailsModal';
import CopyObjectModal from './CopyObjectModal';
import Breadcrumbs from './Breadcrumbs';
import BucketStats from './BucketStats';
import { useToast } from '../hooks/useToast';

interface ObjectListProps {
    selectedBucket: string | null;
}

interface UploadProgress {
    file: File;
    progress: number;
}

type TabType = 'objects' | 'metadata' | 'properties' | 'permissions' | 'metrics' | 'management' | 'access-points';

const ObjectList = ({ selectedBucket }: ObjectListProps) => {
    const [activeTab, setActiveTab] = useState<TabType>('objects');
    const [objects, setObjects] = useState<_Object[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPath, setCurrentPath] = useState('');
    const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
    const [refresh, setRefresh] = useState(false);
    const [previewObject, setPreviewObject] = useState<string | null>(null);
    const [detailsObject, setDetailsObject] = useState<string | null>(null);
    const [copyObject, setCopyObject] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'images' | 'documents' | 'videos'>('all');
    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const { showSuccess, showError, showInfo } = useToast();

    const forceRefresh = () => {
        setRefresh(!refresh);
        setSelectedObjects(new Set());
    };

    const handleFileUpload = useCallback(async (acceptedFiles: File[]) => {
        const client = getS3Client();
        if (!selectedBucket || !client) return;

        const newUploads = acceptedFiles.map(file => ({ file, progress: 0 }));
        setUploads(prev => [...prev, ...newUploads]);

        for (let i = 0; i < acceptedFiles.length; i++) {
            const file = acceptedFiles[i];
            try {
                // Use currentPath as prefix for uploaded files
                const key = currentPath ? `${currentPath}${file.name}` : file.name;
                
                const upload = new Upload({
                    client: client,
                    params: {
                        Bucket: selectedBucket,
                        Key: key,
                        Body: file,
                    },
                });

                upload.on("httpUploadProgress", (progress) => {
                    const percent = Math.round(((progress.loaded || 0) / (progress.total || 1)) * 100);
                    setUploads(prev => prev.map(u => u.file === file ? { ...u, progress: percent } : u));
                });

                await upload.done();
                showSuccess(`"${file.name}" uploaded successfully!`);

            } catch (error: any) {
                showError(`Failed to upload "${file.name}": ${error.message || 'Unknown error'}`);
            }
        }
        forceRefresh();
        // Clear completed uploads after a delay
        setTimeout(() => setUploads([]), 3000);
    }, [selectedBucket, currentPath, showSuccess, showError]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
        onDrop: handleFileUpload,
        noClick: true // Handle clicks manually via button and empty state
    });

    const handleUploadButtonClick = () => {
        open();
    };

    useEffect(() => {
        const client = getS3Client();
        if (!selectedBucket || !client) {
            setObjects([]);
            return;
        }

        const fetchObjects = async () => {
            try {
                const response = await client.send(new ListObjectsV2Command({ 
                    Bucket: selectedBucket,
                    Prefix: currentPath || undefined,
                    Delimiter: '/'
                }));
                // Combine objects and common prefixes (folders)
                const allItems = [
                    ...(response.CommonPrefixes?.map(cp => ({ Key: cp.Prefix, Size: 0, LastModified: undefined })) || []),
                    ...(response.Contents || [])
                ];
                setObjects(allItems);
            } catch (error: any) {
                showError(`Failed to load objects: ${error.message || 'Unknown error'}`);
            }
        };

        fetchObjects();
    }, [selectedBucket, currentPath, refresh]);

    const handleDeleteObject = async (key: string) => {
        const client = getS3Client();
        if (!selectedBucket || !client) return;

        if (window.confirm(`Are you sure you want to delete "${key}"?`)) {
            try {
                await client.send(new DeleteObjectCommand({ Bucket: selectedBucket, Key: key }));
                forceRefresh();
                showSuccess(`Object "${key.split('/').pop()}" deleted successfully!`);
            } catch (error: any) {
                showError(`Failed to delete object: ${error.message || 'Unknown error'}`);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedObjects.size === 0) return;
        const client = getS3Client();
        if (!selectedBucket || !client) return;

        if (window.confirm(`Are you sure you want to delete ${selectedObjects.size} object(s)?`)) {
            try {
                const keys = Array.from(selectedObjects);
                await client.send(new DeleteObjectsCommand({
                    Bucket: selectedBucket,
                    Delete: {
                        Objects: keys.map(Key => ({ Key })),
                        Quiet: false
                    }
                }));
                forceRefresh();
                showSuccess(`Successfully deleted ${selectedObjects.size} object(s)!`);
            } catch (error: any) {
                showError(`Failed to delete objects: ${error.message || 'Unknown error'}`);
            }
        }
    };

    const toggleSelection = (key: string) => {
        const newSelection = new Set(selectedObjects);
        if (newSelection.has(key)) {
            newSelection.delete(key);
        } else {
            newSelection.add(key);
        }
        setSelectedObjects(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedObjects.size === filteredObjects.length) {
            setSelectedObjects(new Set());
        } else {
            setSelectedObjects(new Set(filteredObjects.map(obj => obj.Key!).filter(Boolean)));
        }
    };

    const navigateToFolder = (prefix: string) => {
        setCurrentPath(prefix);
        setSelectedObjects(new Set());
    };

    const navigateUp = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        setCurrentPath(parts.length > 0 ? parts.join('/') + '/' : '');
        setSelectedObjects(new Set());
    };

    const isImage = (key: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key);
    const isDocument = (key: string) => /\.(pdf|doc|docx|txt|md|json|xml|csv)$/i.test(key);
    const isVideo = (key: string) => /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(key);

    const handleDownloadObject = async (key: string) => {
        const client = getS3Client();
        if (!selectedBucket || !client) return;

        try {
            showInfo(`Downloading "${key.split('/').pop()}"...`);
            const command = new GetObjectCommand({ Bucket: selectedBucket, Key: key });
            const response = await client.send(command);
            const body = response.Body;

            if (body) {
                const blob = await body.transformToByteArray();
                const url = window.URL.createObjectURL(new Blob([blob]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', key);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                showSuccess(`"${key.split('/').pop()}" downloaded successfully!`);
            }
        } catch (error: any) {
            showError(`Failed to download object: ${error.message || 'Unknown error'}`);
        }
    };

    const filteredObjects = objects.filter(obj => {
        const key = obj.Key || '';
        const matchesSearch = key.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'all' || 
            (filterType === 'images' && isImage(key)) ||
            (filterType === 'documents' && isDocument(key)) ||
            (filterType === 'videos' && isVideo(key));
        return matchesSearch && matchesFilter;
    });

    const folders = objects
        .map(obj => obj.Key)
        .filter(key => key && key.endsWith('/') && key !== currentPath)
        .map(key => key!.substring(currentPath.length).split('/')[0] + '/')
        .filter((folder, index, self) => self.indexOf(folder) === index);

    if (!selectedBucket) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float shadow-lg">
                        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">No bucket selected</h3>
                    <p className="text-slate-500 text-lg">Select a bucket from the sidebar to view its objects</p>
                </div>
            </div>
        );
    }

    const hasFilterOrSearch = filterType !== 'all' || searchTerm;
    const isEmpty = filteredObjects.length === 0 && folders.length === 0 && !hasFilterOrSearch;
    const noFilterResults = filteredObjects.length === 0 && folders.length === 0 && hasFilterOrSearch;

    return (
        <div 
            {...getRootProps()} 
            className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 h-full flex flex-col overflow-hidden w-full max-w-full ${
                isDragActive ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
            }`}
        >
            <input {...getInputProps()} />
            <div className="border-b border-slate-200/50 bg-gradient-to-r from-blue-50/50 via-indigo-50/50 to-purple-50/50">
                <div className="p-8 pb-4">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Bucket Viewer</h2>
                            <p className="text-sm text-slate-600 font-medium">Bucket: <span className="font-bold text-slate-800 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">{selectedBucket}</span></p>
                        </div>
                        {activeTab === 'objects' && (
                            <div className="flex items-center space-x-4">
                                <Button 
                                    onClick={handleUploadButtonClick}
                                    variant="primary"
                                    className="flex items-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span>Upload Files</span>
                                </Button>
                            </div>
                        )}
                    </div>
                    {activeTab === 'objects' && uploads.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center space-x-2">
                                <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Uploading:</span>
                            </h4>
                            {uploads.map((upload, index) => (
                                <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200 shadow-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-sm font-bold text-slate-700 truncate">{upload.file.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-blue-600 bg-white px-2 py-1 rounded-lg ml-2">{upload.progress}%</span>
                                    </div>
                                    <div className="w-full bg-white rounded-full h-3 overflow-hidden shadow-inner">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                                            style={{ width: `${upload.progress}%` }}
                                        >
                                            <div className="absolute inset-0 animate-shimmer"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Tabs */}
                <div className="px-8 border-t border-slate-200/50">
                    <div className="flex space-x-1 overflow-x-auto">
                        {(['objects', 'metadata', 'properties', 'permissions', 'metrics', 'management', 'access-points'] as TabType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap border-b-2 ${
                                    activeTab === tab
                                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                        : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                                }`}
                            >
                                {tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="p-8 flex-1 overflow-x-hidden overflow-y-auto w-full max-w-full">
                {activeTab === 'objects' && (
                    <>
                        {/* Breadcrumbs */}
                        {currentPath && (
                    <div className="mb-4 flex items-center justify-between">
                        <Breadcrumbs path={currentPath} onNavigate={navigateToFolder} />
                        <Button variant="secondary" size="sm" onClick={navigateUp}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Up
                        </Button>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="mb-6 space-y-4">
                    <div className="relative group">
                        <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search objects..."
                            className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md font-medium"
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold text-slate-700">Filter:</span>
                        {(['all', 'images', 'documents', 'videos'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                    filterType === type
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedObjects.size > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 flex items-center justify-between">
                        <span className="font-bold text-blue-700">{selectedObjects.size} object(s) selected</span>
                        <div className="flex space-x-2">
                            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                                Delete Selected
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setSelectedObjects(new Set())}>
                                Clear Selection
                            </Button>
                        </div>
                    </div>
                )}

                {/* Folders */}
                {folders.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">Folders</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {folders.map(folder => (
                                <button
                                    key={folder}
                                    onClick={() => navigateToFolder(currentPath + folder)}
                                    className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-200 text-left group"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                    </div>
                                    <span className="font-semibold text-slate-700 group-hover:text-blue-600">{folder}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {noFilterResults ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float">
                            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-lg font-bold text-slate-600 mb-2">No objects found</p>
                        <p className="text-sm text-slate-500">Try adjusting your search or filter</p>
                    </div>
                ) : isEmpty ? (
                    <div 
                        onClick={handleUploadButtonClick}
                        className={`text-center py-16 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
                            isDragActive 
                                ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 scale-[1.02] shadow-2xl' 
                                : 'border-slate-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-slate-50 hover:via-blue-50/30 hover:to-purple-50/30'
                        }`}
                    >
                        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-300 transform ${
                            isDragActive 
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600 scale-110 rotate-12 shadow-lg' 
                                : 'bg-gradient-to-br from-blue-100 to-purple-100 animate-float'
                        }`}>
                            <svg className={`w-12 h-12 transition-all duration-300 ${isDragActive ? 'text-white' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        {isDragActive ? (
                            <>
                                <p className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">Drop the files here...</p>
                                <p className="text-sm text-blue-500 font-medium">Release to upload</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold text-slate-600 mb-2">This folder is empty</p>
                                <p className="text-sm text-slate-500 mb-4">Drag & drop files here to upload, or click below to select files</p>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUploadButtonClick();
                                    }}
                                    className="mt-4 inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span>Select Files</span>
                                </button>
                            </>
                        )}
                    </div>
                ) : filteredObjects.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float">
                            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-lg font-bold text-slate-600 mb-2">No objects found</p>
                        <p className="text-sm text-slate-400">Try adjusting your search or filter</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/50 bg-white/50 backdrop-blur-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b-2 border-slate-200">
                                    <th className="text-left py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedObjects.size === filteredObjects.length && filteredObjects.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-700 uppercase tracking-wider">Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-700 uppercase tracking-wider">Size</th>
                                    <th className="text-left py-3 px-4 text-sm font-bold text-slate-700 uppercase tracking-wider">Last Modified</th>
                                    <th className="text-right py-3 px-4 text-sm font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredObjects.map((obj, index) => {
                                    const key = obj.Key!;
                                    const displayName = key.replace(currentPath, '');
                                    const isSelected = selectedObjects.has(key);
                                    return (
                                        <tr 
                                            key={key}
                                            style={{ animationDelay: `${index * 30}ms` }}
                                            className={`border-b border-slate-100/50 transition-all duration-200 group ${
                                                isSelected ? 'bg-blue-50' : 'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50'
                                            }`}
                                        >
                                            <td className="py-3 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelection(key)}
                                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200 ${
                                                        isImage(key) ? 'bg-gradient-to-br from-pink-400 to-rose-500' :
                                                        isDocument(key) ? 'bg-gradient-to-br from-blue-400 to-indigo-500' :
                                                        isVideo(key) ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
                                                        'bg-gradient-to-br from-blue-400 to-purple-400'
                                                    }`}>
                                                        {isImage(key) ? (
                                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className="text-slate-700 font-semibold group-hover:text-blue-600 transition-colors duration-200 cursor-pointer" 
                                                          onClick={() => isImage(key) && setPreviewObject(key)}>
                                                        {displayName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 whitespace-nowrap">
                                                <span className="text-slate-700 font-medium text-sm">
                                                    {prettyBytes(obj.Size || 0)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-slate-600 font-medium text-sm whitespace-nowrap">{obj.LastModified?.toLocaleString()}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-end space-x-1">
                                                    {isImage(key) && (
                                                        <button
                                                            onClick={() => setPreviewObject(key)}
                                                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-200"
                                                            title="Preview"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setDetailsObject(key)}
                                                        className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors duration-200"
                                                        title="Details"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setCopyObject(key)}
                                                        className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors duration-200"
                                                        title="Copy"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadObject(key)}
                                                        className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors duration-200"
                                                        title="Download"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteObject(key)}
                                                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                    </>
                )}
                
                {activeTab === 'metadata' && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Metadata</h3>
                            <p className="text-slate-500">Bucket metadata information will be displayed here.</p>
                        </div>
                    </div>
                )}
                
                {activeTab === 'properties' && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Properties</h3>
                            <p className="text-slate-500">Bucket properties and configuration will be displayed here.</p>
                        </div>
                    </div>
                )}
                
                {activeTab === 'permissions' && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Permissions</h3>
                            <p className="text-slate-500">Bucket access permissions and policies will be displayed here.</p>
                        </div>
                    </div>
                )}
                
                {activeTab === 'metrics' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-700 mb-4">Bucket Statistics</h3>
                            <BucketStats bucketName={selectedBucket} />
                        </div>
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Additional Metrics</h3>
                                <p className="text-slate-500">Additional bucket usage metrics and analytics will be displayed here.</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'management' && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Management</h3>
                            <p className="text-slate-500">Bucket management settings and lifecycle policies will be displayed here.</p>
                        </div>
                    </div>
                )}
                
                {activeTab === 'access-points' && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Access Points</h3>
                            <p className="text-slate-500">Bucket access points configuration will be displayed here.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {previewObject && selectedBucket && (
                <ObjectPreviewModal
                    isOpen={!!previewObject}
                    onClose={() => setPreviewObject(null)}
                    bucketName={selectedBucket}
                    objectKey={previewObject}
                />
            )}
            {detailsObject && selectedBucket && (
                <ObjectDetailsModal
                    isOpen={!!detailsObject}
                    onClose={() => setDetailsObject(null)}
                    bucketName={selectedBucket}
                    objectKey={detailsObject}
                />
            )}
            {copyObject && selectedBucket && (
                <CopyObjectModal
                    isOpen={!!copyObject}
                    onClose={() => setCopyObject(null)}
                    sourceBucket={selectedBucket}
                    sourceKey={copyObject}
                    onCopySuccess={forceRefresh}
                />
            )}
        </div>
    );
};

export default ObjectList;
