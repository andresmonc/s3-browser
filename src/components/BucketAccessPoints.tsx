import { useEffect, useState } from 'react';
import { useS3Client } from '../hooks/useS3Client';
import { useToast } from '../hooks/useToast';

interface BucketAccessPointsProps {
    bucketName: string;
}

const BucketAccessPoints = ({ bucketName }: BucketAccessPointsProps) => {
    const [accessPoints, setAccessPoints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { showError } = useToast();
    const s3Client = useS3Client();

    useEffect(() => {
        const loadAccessPoints = async () => {
            if (!s3Client || !bucketName) {
                setLoading(false);
                return;
            }

            try {
                // Note: ListAccessPointsCommand requires account ID and may not be available in all S3-compatible services
                // This is a placeholder that will show a message if not available
                setError('Access Points API may not be available in this S3-compatible service');
                setAccessPoints([]);
            } catch (error: any) {
                const errorMsg = error.message || 'Unknown error';
                setError(errorMsg);
                showError(`Failed to load access points: ${errorMsg}`);
            } finally {
                setLoading(false);
            }
        };

        loadAccessPoints();
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
                <h4 className="text-sm font-bold text-slate-700 mb-4">Access Points</h4>
                {error ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">{error}</p>
                        <p className="text-xs text-yellow-700 mt-2">
                            Access Points are an AWS S3 feature that may not be available in all S3-compatible services.
                        </p>
                    </div>
                ) : accessPoints.length > 0 ? (
                    <div className="space-y-2">
                        {accessPoints.map((ap: any, index: number) => (
                            <div key={index} className="bg-slate-50 p-3 rounded-lg">
                                <div className="font-semibold text-sm text-slate-800">{ap.Name}</div>
                                <div className="text-xs text-slate-600 mt-1">ARN: {ap.AccessPointArn}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="text-sm text-slate-500">No access points configured</span>
                )}
            </div>
        </div>
    );
};

export default BucketAccessPoints;

