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
        <div {...getRootProps()} className={`border border-dashed rounded p-4 text-center ${isDragActive ? 'border-primary bg-light' : 'border-secondary'}`}>
            <input {...getInputProps()} />
            {
                isDragActive ?
                    <p>Drop the files here ...</p> :
                    <p>Drag 'n' drop some files here, or click to select files</p>
            }
            {uploads.length > 0 && (
                <div className="mt-3 text-start">
                    <h4 className="h6">Uploads:</h4>
                    {uploads.map((upload, index) => (
                        <div key={index} className="my-1">
                            <span>{upload.file.name}</span>
                            <div className="progress" style={{ height: '10px' }}>
                                <div className="progress-bar" role="progressbar" style={{ width: `${upload.progress}%` }} aria-valuenow={upload.progress} aria-valuemin={0} aria-valuemax={100}></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUploader;
