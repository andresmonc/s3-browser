import { useEffect, useState } from 'react';
import { useS3Client } from '../hooks/useS3Client';
import { GetBucketVersioningCommand, GetBucketEncryptionCommand, GetBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';
import { useToast } from '../hooks/useToast';

interface BucketPropertiesProps {
    bucketName: string;
}

const BucketProperties = ({ bucketName }: BucketPropertiesProps) => {
    const [properties, setProperties] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();
    const s3Client = useS3Client();

    useEffect(() => {
        const loadProperties = async () => {
            if (!s3Client || !bucketName) {
                setLoading(false);
                return;
            }

            try {
                const [versioning, encryption, lifecycle] = await Promise.all([
                    s3Client.send(new GetBucketVersioningCommand({ Bucket: bucketName })).catch(() => ({ Status: 'Disabled' })),
                    s3Client.send(new GetBucketEncryptionCommand({ Bucket: bucketName })).catch(() => null),
                    s3Client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName })).catch(() => null),
                ]);

                setProperties({
                    versioning: versioning.Status || 'Disabled',
                    mfaDelete: versioning.MFADelete || 'Disabled',
                    encryption: encryption?.ServerSideEncryptionConfiguration?.Rules?.[0]?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm || 'None',
                    lifecycleRules: lifecycle?.Rules?.length || 0,
                });
            } catch (error: any) {
                showError(`Failed to load properties: ${error.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        loadProperties();
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
                <h4 className="text-sm font-bold text-slate-700 mb-4">Versioning</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Versioning Status</span>
                        <span className={`text-sm font-semibold ${properties?.versioning === 'Enabled' ? 'text-green-600' : 'text-slate-600'}`}>
                            {properties?.versioning || 'Disabled'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">MFA Delete</span>
                        <span className={`text-sm font-semibold ${properties?.mfaDelete === 'Enabled' ? 'text-green-600' : 'text-slate-600'}`}>
                            {properties?.mfaDelete || 'Disabled'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-4">Encryption</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">Default Encryption</span>
                        <span className={`text-sm font-semibold ${properties?.encryption !== 'None' ? 'text-green-600' : 'text-slate-600'}`}>
                            {properties?.encryption || 'None'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-4">Lifecycle</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">Lifecycle Rules</span>
                        <span className="text-sm font-semibold text-slate-800">{properties?.lifecycleRules || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BucketProperties;

