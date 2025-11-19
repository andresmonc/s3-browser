import { useEffect, useState } from 'react';
import { useS3Client } from '../hooks/useS3Client';
import { HeadBucketCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { useToast } from '../hooks/useToast';

interface BucketMetadataProps {
    bucketName: string;
}

const BucketMetadata = ({ bucketName }: BucketMetadataProps) => {
    const [metadata, setMetadata] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();
    const s3Client = useS3Client();

    useEffect(() => {
        const loadMetadata = async () => {
            if (!s3Client || !bucketName) {
                setLoading(false);
                return;
            }

            try {
                const [headResponse, locationResponse] = await Promise.all([
                    s3Client.send(new HeadBucketCommand({ Bucket: bucketName })).catch(() => null),
                    s3Client.send(new GetBucketLocationCommand({ Bucket: bucketName })).catch(() => null),
                ]);

                setMetadata({
                    bucketName,
                    location: locationResponse?.LocationConstraint || 'us-east-1',
                    exists: headResponse !== null,
                });
            } catch (error: any) {
                showError(`Failed to load metadata: ${error.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        loadMetadata();
    }, [bucketName, s3Client, showError]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-4">Basic Information</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Bucket Name</span>
                        <span className="text-sm font-semibold text-slate-800">{metadata?.bucketName || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Region</span>
                        <span className="text-sm font-semibold text-slate-800">{metadata?.location || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">Status</span>
                        <span className="text-sm font-semibold text-green-600">Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BucketMetadata;

