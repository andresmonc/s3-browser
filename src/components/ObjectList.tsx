import { useEffect, useState } from 'react';
import { getS3Client } from '../s3-client';
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, _Object } from '@aws-sdk/client-s3';
import prettyBytes from 'pretty-bytes';
import FileUploader from './FileUploader';

interface ObjectListProps {
    selectedBucket: string | null;
}

const ObjectList = ({ selectedBucket }: ObjectListProps) => {
    const [objects, setObjects] = useState<_Object[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [refresh, setRefresh] = useState(false);

    const forceRefresh = () => setRefresh(!refresh);

    useEffect(() => {
        const client = getS3Client();
        if (!selectedBucket || !client) {
            setObjects([]);
            return;
        }

        const fetchObjects = async () => {
            try {
                const response = await client.send(new ListObjectsV2Command({ Bucket: selectedBucket }));
                setObjects(response.Contents || []);
            } catch (error) {
                console.error('Error fetching objects:', error);
            }
        };

        fetchObjects();
    }, [selectedBucket, refresh]);

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

    const filteredObjects = objects.filter(obj => obj.Key?.toLowerCase().includes(searchTerm.toLowerCase()));

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
                <FileUploader selectedBucket={selectedBucket} onUploadSuccess={forceRefresh} />
            </div>
            
            <div className="p-8 flex-1 overflow-auto">
                <div className="mb-6">
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
                </div>
                
                {filteredObjects.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-float">
                            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-lg font-bold text-slate-600 mb-2">{searchTerm ? 'No objects found' : 'No objects in this bucket'}</p>
                        {!searchTerm && <p className="text-sm text-slate-400">Upload files to get started</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/50 bg-white/50 backdrop-blur-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-b-2 border-slate-200">
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Name</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Size</th>
                                    <th className="text-left py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Last Modified</th>
                                    <th className="text-right py-4 px-6 text-sm font-bold text-slate-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredObjects.map((obj, index) => (
                                    <tr 
                                        key={obj.Key}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                        className="border-b border-slate-100/50 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200 group"
                                    >
                                        <td className="py-4 px-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-slate-700 font-semibold group-hover:text-blue-600 transition-colors duration-200">{obj.Key}</span>
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
                                                <button 
                                                    onClick={() => handleDownloadObject(obj.Key!)} 
                                                    className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                                >
                                                    Download
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteObject(obj.Key!)} 
                                                    className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ObjectList;
