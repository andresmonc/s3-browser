import { useEffect, useState } from 'react';
import { getS3Client } from '../s3-client';
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, _Object } from '@aws-sdk/client-s3';
import prettyBytes from 'pretty-bytes';
import FileUploader from './FileUploader';
import Button from './ui/Button';
import ObjectPreviewModal from './ObjectPreviewModal';
import ObjectDetailsModal from './ObjectDetailsModal';
import CopyObjectModal from './CopyObjectModal';
import Breadcrumbs from './Breadcrumbs';
import BucketStats from './BucketStats';

interface ObjectListProps {
    selectedBucket: string | null;
}

const ObjectList = ({ selectedBucket }: ObjectListProps) => {
    const [objects, setObjects] = useState<_Object[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPath, setCurrentPath] = useState('');
    const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
    const [refresh, setRefresh] = useState(false);
    const [previewObject, setPreviewObject] = useState<string | null>(null);
    const [detailsObject, setDetailsObject] = useState<string | null>(null);
    const [copyObject, setCopyObject] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'images' | 'documents' | 'videos'>('all');

    const forceRefresh = () => {
        setRefresh(!refresh);
        setSelectedObjects(new Set());
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
            } catch (error) {
                console.error('Error fetching objects:', error);
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
            } catch (error) {
                console.error('Error deleting object:', error);
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
            } catch (error) {
                console.error('Error deleting objects:', error);
                alert('Error deleting some objects');
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
            }
        } catch (error) {
            console.error('Error downloading object:', error);
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

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 h-full flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-200/50 bg-gradient-to-r from-blue-50/50 via-indigo-50/50 to-purple-50/50">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">Objects</h2>
                        <p className="text-sm text-slate-600 font-medium">Bucket: <span className="font-bold text-slate-800 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">{selectedBucket}</span></p>
                    </div>
                    <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-md">
                        <span className="text-sm font-bold text-slate-700">
                            {filteredObjects.length} <span className="text-slate-500 font-normal">{filteredObjects.length === 1 ? 'object' : 'objects'}</span>
                        </span>
                    </div>
                </div>
                <BucketStats bucketName={selectedBucket} />
                <div className="mt-6">
                    <FileUploader selectedBucket={selectedBucket} onUploadSuccess={forceRefresh} />
                </div>
            </div>
            
            <div className="p-8 flex-1 overflow-auto">
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
                
                {filteredObjects.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float">
                            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-lg font-bold text-slate-600 mb-2">{searchTerm ? 'No objects found' : 'No objects in this folder'}</p>
                        {!searchTerm && <p className="text-sm text-slate-400">Upload files to get started</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/50 bg-white/50 backdrop-blur-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b-2 border-slate-200">
                                    <th className="text-left py-4 px-6">
                                        <input
                                            type="checkbox"
                                            checked={selectedObjects.size === filteredObjects.length && filteredObjects.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                        />
                                    </th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Name</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Size</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Last Modified</th>
                                    <th className="text-right py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Actions</th>
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
                                            <td className="py-4 px-6">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelection(key)}
                                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="py-4 px-6">
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
                                            <td className="py-4 px-6">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold text-sm">
                                                    {prettyBytes(obj.Size || 0)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-slate-600 font-medium text-sm">{obj.LastModified?.toLocaleString()}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {isImage(key) && (
                                                        <Button 
                                                            onClick={() => setPreviewObject(key)} 
                                                            variant="primary"
                                                            size="sm"
                                                        >
                                                            Preview
                                                        </Button>
                                                    )}
                                                    <Button 
                                                        onClick={() => setDetailsObject(key)} 
                                                        variant="secondary"
                                                        size="sm"
                                                    >
                                                        Details
                                                    </Button>
                                                    <Button 
                                                        onClick={() => setCopyObject(key)} 
                                                        variant="indigo"
                                                        size="sm"
                                                    >
                                                        Copy
                                                    </Button>
                                                    <Button 
                                                        onClick={() => handleDownloadObject(key)} 
                                                        variant="primary"
                                                        size="sm"
                                                    >
                                                        Download
                                                    </Button>
                                                    <Button 
                                                        onClick={() => handleDeleteObject(key)} 
                                                        variant="danger"
                                                        size="sm"
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
