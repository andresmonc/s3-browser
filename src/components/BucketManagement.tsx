import { useEffect, useState } from 'react';
import { getS3Client } from '../s3-client';
import { GetBucketVersioningCommand, GetBucketLifecycleConfigurationCommand, GetBucketEncryptionCommand } from '@aws-sdk/client-s3';
import { useToast } from '../hooks/useToast';

interface BucketManagementProps {
    bucketName: string;
}

const BucketManagement = ({ bucketName }: BucketManagementProps) => {
    const [management, setManagement] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();

    useEffect(() => {
        const loadManagement = async () => {
            const client = getS3Client();
            if (!client || !bucketName) {
                setLoading(false);
                return;
            }

            try {
                const [versioning, lifecycle, encryption] = await Promise.all([
                    client.send(new GetBucketVersioningCommand({ Bucket: bucketName })).catch(() => ({ Status: 'Disabled' })),
                    client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName })).catch(() => null),
                    client.send(new GetBucketEncryptionCommand({ Bucket: bucketName })).catch(() => null),
                ]);

                setManagement({
                    versioning: versioning.Status || 'Disabled',
                    lifecycleRules: lifecycle?.Rules || [],
                    encryption: encryption?.ServerSideEncryptionConfiguration?.Rules?.[0]?.ApplyServerSideEncryptionByDefault || null,
                });
            } catch (error: any) {
                showError(`Failed to load management settings: ${error.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        loadManagement();
    }, [bucketName]);

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
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">Status</span>
                        <span className={`text-sm font-semibold ${management?.versioning === 'Enabled' ? 'text-green-600' : 'text-slate-600'}`}>
                            {management?.versioning || 'Disabled'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-4">Lifecycle Rules</h4>
                <div className="space-y-3">
                    {management?.lifecycleRules && management.lifecycleRules.length > 0 ? (
                        <div className="space-y-2">
                            {management.lifecycleRules.map((rule: any, index: number) => (
                                <div key={index} className="bg-slate-50 p-3 rounded-lg">
                                    <div className="font-semibold text-sm text-slate-800">{rule.Id || `Rule ${index + 1}`}</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        Status: <span className={rule.Status === 'Enabled' ? 'text-green-600' : 'text-slate-600'}>{rule.Status}</span>
                                    </div>
                                    {rule.Transitions && rule.Transitions.length > 0 && (
                                        <div className="text-xs text-slate-600 mt-1">
                                            Transitions: {rule.Transitions.length}
                                        </div>
                                    )}
                                    {rule.Expiration && (
                                        <div className="text-xs text-slate-600 mt-1">
                                            Expiration: {rule.Expiration.Days ? `${rule.Expiration.Days} days` : 'Configured'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span className="text-sm text-slate-500">No lifecycle rules configured</span>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-4">Encryption</h4>
                <div className="space-y-3">
                    {management?.encryption ? (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm text-slate-600">Algorithm</span>
                                <span className="text-sm font-semibold text-green-600">
                                    {management.encryption.SSEAlgorithm || 'AES256'}
                                </span>
                            </div>
                            {management.encryption.KMSMasterKeyID && (
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-slate-600">KMS Key ID</span>
                                    <span className="text-sm font-semibold text-slate-800 text-xs">
                                        {management.encryption.KMSMasterKeyID}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-slate-500">No encryption configured</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BucketManagement;

