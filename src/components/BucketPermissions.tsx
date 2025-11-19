import { useEffect, useState } from 'react';
import { getS3Client } from '../s3-client';
import { GetBucketAclCommand, GetBucketPolicyCommand, PutBucketPolicyCommand, DeleteBucketPolicyCommand } from '@aws-sdk/client-s3';
import { useToast } from '../hooks/useToast';
import Button from './ui/Button';
import { Textarea } from './ui/Input';

interface BucketPermissionsProps {
    bucketName: string;
}

const BucketPermissions = ({ bucketName }: BucketPermissionsProps) => {
    const [permissions, setPermissions] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingPolicy, setIsEditingPolicy] = useState(false);
    const [policyText, setPolicyText] = useState('');
    const [saving, setSaving] = useState(false);
    const { showError, showSuccess } = useToast();

    useEffect(() => {
        const loadPermissions = async () => {
            const client = getS3Client();
            if (!client || !bucketName) {
                setLoading(false);
                return;
            }

            try {
                const [acl, policy] = await Promise.all([
                    client.send(new GetBucketAclCommand({ Bucket: bucketName })).catch(() => null),
                    client.send(new GetBucketPolicyCommand({ Bucket: bucketName })).catch(() => null),
                ]);

                const policyJson = policy?.Policy ? JSON.parse(policy.Policy) : null;
                setPermissions({
                    owner: acl?.Owner?.DisplayName || acl?.Owner?.ID || 'Unknown',
                    grants: acl?.Grants || [],
                    hasPolicy: policy?.Policy !== undefined,
                    policy: policyJson,
                    policyRaw: policy?.Policy || '',
                });
                setPolicyText(policy?.Policy ? JSON.stringify(policyJson, null, 2) : '');
            } catch (error: any) {
                showError(`Failed to load permissions: ${error.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        loadPermissions();
    }, [bucketName]);

    const validateJSON = (text: string): { valid: boolean; error?: string } => {
        if (!text.trim()) {
            return { valid: true }; // Empty is valid (will delete policy)
        }
        
        try {
            const parsed = JSON.parse(text);
            
            // Basic S3 policy structure validation
            if (typeof parsed !== 'object' || parsed === null) {
                return { valid: false, error: 'Policy must be a JSON object' };
            }
            
            if (!parsed.Version) {
                return { valid: false, error: 'Policy must include a "Version" field' };
            }
            
            if (!parsed.Statement || !Array.isArray(parsed.Statement)) {
                return { valid: false, error: 'Policy must include a "Statement" array' };
            }
            
            return { valid: true };
        } catch (error: any) {
            return { 
                valid: false, 
                error: `Invalid JSON: ${error.message || 'Syntax error'}` 
            };
        }
    };

    const handleSavePolicy = async () => {
        const client = getS3Client();
        if (!client || !bucketName) return;

        // Validate JSON before attempting to save
        const validation = validateJSON(policyText);
        if (!validation.valid) {
            showError(validation.error || 'Invalid JSON format');
            return;
        }

        setSaving(true);
        try {
            if (policyText.trim()) {
                const parsed = JSON.parse(policyText);
                await client.send(new PutBucketPolicyCommand({ 
                    Bucket: bucketName, 
                    Policy: JSON.stringify(parsed) 
                }));
                showSuccess('Bucket policy saved successfully!');
            } else {
                await client.send(new DeleteBucketPolicyCommand({ Bucket: bucketName }));
                showSuccess('Bucket policy deleted successfully!');
            }
            setIsEditingPolicy(false);
            // Reload permissions
            const [acl, policy] = await Promise.all([
                client.send(new GetBucketAclCommand({ Bucket: bucketName })).catch(() => null),
                client.send(new GetBucketPolicyCommand({ Bucket: bucketName })).catch(() => null),
            ]);
            const policyJson = policy?.Policy ? JSON.parse(policy.Policy) : null;
            setPermissions({
                owner: acl?.Owner?.DisplayName || acl?.Owner?.ID || 'Unknown',
                grants: acl?.Grants || [],
                hasPolicy: policy?.Policy !== undefined,
                policy: policyJson,
                policyRaw: policy?.Policy || '',
            });
            setPolicyText(policy?.Policy ? JSON.stringify(policyJson, null, 2) : '');
        } catch (error: any) {
            showError(`Failed to save policy: ${error.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePolicy = async () => {
        if (!window.confirm('Are you sure you want to delete the bucket policy?')) return;
        
        const client = getS3Client();
        if (!client || !bucketName) return;

        setSaving(true);
        try {
            await client.send(new DeleteBucketPolicyCommand({ Bucket: bucketName }));
            showSuccess('Bucket policy deleted successfully!');
            setIsEditingPolicy(false);
            setPolicyText('');
            setPermissions((prev: any) => ({
                ...prev,
                hasPolicy: false,
                policy: null,
                policyRaw: '',
            }));
        } catch (error: any) {
            showError(`Failed to delete policy: ${error.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

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
                <h4 className="text-sm font-bold text-slate-700 mb-4">Access Control List (ACL)</h4>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Owner</span>
                        <span className="text-sm font-semibold text-slate-800">{permissions?.owner || '-'}</span>
                    </div>
                    <div className="py-2">
                        <span className="text-sm text-slate-600 mb-2 block">Grants</span>
                        {permissions?.grants && permissions.grants.length > 0 ? (
                            <div className="space-y-2 mt-2">
                                {permissions.grants.map((grant: any, index: number) => (
                                    <div key={index} className="text-xs bg-slate-50 p-2 rounded">
                                        <div className="font-semibold">{grant.Grantee?.DisplayName || grant.Grantee?.ID || 'Unknown'}</div>
                                        <div className="text-slate-600">Permission: {grant.Permission}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span className="text-sm text-slate-500">No grants configured</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-slate-700">Bucket Policy</h4>
                    <div className="flex items-center space-x-2">
                        {!isEditingPolicy ? (
                            <>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setIsEditingPolicy(true)}
                                >
                                    {permissions?.hasPolicy ? 'Edit Policy' : 'Add Policy'}
                                </Button>
                                {permissions?.hasPolicy && (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={handleDeletePolicy}
                                        disabled={saving}
                                    >
                                        Delete
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setIsEditingPolicy(false);
                                        setPolicyText(permissions?.policyRaw ? JSON.stringify(permissions.policy, null, 2) : '');
                                    }}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleSavePolicy}
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Policy'}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Policy Status</span>
                        <span className={`text-sm font-semibold ${permissions?.hasPolicy ? 'text-green-600' : 'text-slate-600'}`}>
                            {permissions?.hasPolicy ? 'Configured' : 'Not Configured'}
                        </span>
                    </div>
                    {isEditingPolicy ? (
                        <div className="mt-4">
                            <Textarea
                                label="Policy Document (JSON)"
                                value={policyText}
                                onChange={(e) => setPolicyText(e.target.value)}
                                style={{ height: '400px', fontFamily: 'monospace' }}
                                placeholder='{\n  "Version": "2012-10-17",\n  "Statement": [...]\n}'
                            />
                        </div>
                    ) : permissions?.hasPolicy && permissions.policy ? (
                        <div className="mt-4">
                            <span className="text-sm text-slate-600 mb-2 block">Policy Document</span>
                            <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                                {JSON.stringify(permissions.policy, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <div className="mt-4 text-sm text-slate-500">
                            No bucket policy configured. Click "Add Policy" to create one.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BucketPermissions;

