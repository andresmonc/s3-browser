import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { s3Client } from '../s3-client';
import { Upload } from '@aws-sdk/lib-storage';

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

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (!selectedBucket || !s3Client) return;

        const newUploads = acceptedFiles.map(file => ({ file, progress: 0 }));
        setUploads(prev => [...prev, ...newUploads]);

        for (let i = 0; i < acceptedFiles.length; i++) {
            const file = acceptedFiles[i];
            try {
                const upload = new Upload({
                    client: s3Client,
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

            } catch (error) {
                console.error(`Error uploading ${file.name}:`, error);
            }
        }
        onUploadSuccess();
        // Clear completed uploads after a delay
        setTimeout(() => setUploads([]), 3000);

    }, [selectedBucket, onUploadSuccess]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
            <input {...getInputProps()} />
            {
                isDragActive ?
                    <p>Drop the files here ...</p> :
                    <p>Drag 'n' drop some files here, or click to select files</p>
            }
            {uploads.length > 0 && (
                <div className="mt-4 text-left">
                    <h4 className="font-bold">Uploads:</h4>
                    {uploads.map((upload, index) => (
                        <div key={index} className="my-1">
                            <span>{upload.file.name}</span>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${upload.progress}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUploader;
