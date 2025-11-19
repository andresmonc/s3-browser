import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { getS3Client } from '../s3-client';
import { Upload } from '@aws-sdk/lib-storage';
import { useToast } from '../hooks/useToast';

interface FileUploaderProps {
    selectedBucket: string | null;
    onUploadSuccess: () => void;
}

interface UploadProgress {
    file: File;
    progress: number;
}

const FileUploader = ({ selectedBucket, onUploadSuccess }: FileUploaderProps) => {
    const [uploads, setUploads] = useState<UploadProgress[]>([]);
    const { showSuccess, showError } = useToast();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const client = getS3Client();
        if (!selectedBucket || !client) return;

        const newUploads = acceptedFiles.map(file => ({ file, progress: 0 }));
        setUploads(prev => [...prev, ...newUploads]);

        for (let i = 0; i < acceptedFiles.length; i++) {
            const file = acceptedFiles[i];
            try {
                const upload = new Upload({
                    client: client,
                    params: {
                        Bucket: selectedBucket,
                        Key: file.name,
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
        onUploadSuccess();
        // Clear completed uploads after a delay
        setTimeout(() => setUploads([]), 3000);

    }, [selectedBucket, onUploadSuccess]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div>
            <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
                    isDragActive 
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 scale-[1.03] shadow-2xl' 
                        : 'border-slate-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-slate-50 hover:via-blue-50/30 hover:to-purple-50/30 hover:shadow-xl'
                }`}
            >
                <input {...getInputProps()} />
                <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 transform ${
                        isDragActive 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 scale-110 rotate-12 shadow-lg' 
                            : 'bg-gradient-to-br from-blue-100 to-purple-100 group-hover:scale-110 group-hover:rotate-6'
                    }`}>
                        <svg className={`w-8 h-8 transition-all duration-300 ${isDragActive ? 'text-white' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <p className="text-lg font-bold text-slate-700 mb-2 group-hover:text-blue-600 transition-colors duration-300">Drag & drop files here</p>
                            <p className="text-sm text-slate-500 group-hover:text-blue-500 transition-colors duration-300">or click to select files</p>
                        </>
                    )}
                </div>
                {!isDragActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500"></div>
                )}
            </div>
            {uploads.length > 0 && (
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
    );
};

export default FileUploader;
