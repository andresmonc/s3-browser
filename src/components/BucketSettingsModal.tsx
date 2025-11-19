import { GetBucketCorsCommand, GetBucketLoggingCommand, GetBucketPolicyCommand, GetBucketWebsiteCommand, PutBucketCorsCommand, PutBucketLoggingCommand, PutBucketPolicyCommand, PutBucketWebsiteCommand, DeleteBucketPolicyCommand, DeleteBucketCorsCommand, DeleteBucketWebsiteCommand, GetPublicAccessBlockCommand, PutPublicAccessBlockCommand, DeletePublicAccessBlockCommand } from "@aws-sdk/client-s3";
import { useEffect, useState } from "react";
import { getS3Client } from "../s3-client";
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Textarea } from './ui/Input';
import ErrorAlert from './ui/ErrorAlert';
import { ICON_GRADIENTS } from '../utils/constants';
import { useToast } from '../hooks/useToast';


interface BucketSettingsModalProps {
    bucketName: string;
    isOpen: boolean;
    onClose: () => void;
}

const BucketSettingsModal = ({ bucketName, isOpen, onClose }: BucketSettingsModalProps) => {
    const [bucketPolicy, setBucketPolicy] = useState('');
    const [corsRules, setCorsRules] = useState('');
    const [websiteConfig, setWebsiteConfig] = useState('');
    const [loggingConfig, setLoggingConfig] = useState('');
    const [blockPublicAcls, setBlockPublicAcls] = useState(false);
    const [ignorePublicAcls, setIgnorePublicAcls] = useState(false);
    const [blockPublicPolicy, setBlockPublicPolicy] = useState(false);
    const [restrictPublicBuckets, setRestrictPublicBuckets] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const { showSuccess, showError: showErrorToast } = useToast();

    useEffect(() => {
        if (!isOpen) return;

        setHasUnsavedChanges(false);

        const fetchBucketSettings = async () => {
            const client = getS3Client();
            if (!client) return;

            try {
                const policy = await client.send(new GetBucketPolicyCommand({ Bucket: bucketName }));
                setBucketPolicy(policy.Policy || JSON.stringify({
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": `arn:aws:s3:::${bucketName}/*`
                        }
                    ]
                }, null, 2));
            } catch (error) {
                if ((error as any).name !== 'NoSuchBucketPolicy') {
                    console.error('Error fetching bucket policy:', error);
                } else {
                    setBucketPolicy(JSON.stringify({
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Principal": "*",
                                "Action": "s3:GetObject",
                                "Resource": `arn:aws:s3:::${bucketName}/*`
                            }
                        ]
                    }, null, 2));
                }
            }

            try {
                const cors = await client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
                setCorsRules(JSON.stringify(cors.CORSRules, null, 2));
            } catch (error) {
                if ((error as any).name !== 'NoSuchCORSConfiguration') {
                    console.error('Error fetching bucket CORS rules:', error);
                } else {
                    setCorsRules(JSON.stringify([{
                        "AllowedHeaders": ["*"],
                        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
                        "AllowedOrigins": ["*"],
                        "ExposeHeaders": []
                    }], null, 2));
                }
            }

            try {
                const website = await client.send(new GetBucketWebsiteCommand({ Bucket: bucketName }));
                setWebsiteConfig(JSON.stringify({ IndexDocument: website.IndexDocument, ErrorDocument: website.ErrorDocument }, null, 2));
            } catch (error) {
                if ((error as any).name !== 'NoSuchWebsiteConfiguration') {
                    console.error('Error fetching bucket website configuration:', error);
                } else {
                    setWebsiteConfig(JSON.stringify({
                        "IndexDocument": {
                            "Suffix": "index.html"
                        },
                        "ErrorDocument": {
                            "Key": "error.html"
                        }
                    }, null, 2));
                }
            }

            try {
                const logging = await client.send(new GetBucketLoggingCommand({ Bucket: bucketName }));
                setLoggingConfig(JSON.stringify(logging.LoggingEnabled, null, 2));
            } catch (error) {
                console.error('Error fetching bucket logging configuration:', error);
                setLoggingConfig(JSON.stringify({
                    "TargetBucket": "your-log-bucket",
                    "TargetPrefix": `logs/${bucketName}/`
                }, null, 2));
            }

            try {
                const publicAccessBlock = await client.send(new GetPublicAccessBlockCommand({ Bucket: bucketName }));
                setBlockPublicAcls(publicAccessBlock.PublicAccessBlockConfiguration?.BlockPublicAcls || false);
                setIgnorePublicAcls(publicAccessBlock.PublicAccessBlockConfiguration?.IgnorePublicAcls || false);
                setBlockPublicPolicy(publicAccessBlock.PublicAccessBlockConfiguration?.BlockPublicPolicy || false);
                setRestrictPublicBuckets(publicAccessBlock.PublicAccessBlockConfiguration?.RestrictPublicBuckets || false);
            } catch (error) {
                if ((error as any).name !== 'NoSuchPublicAccessBlockConfiguration') {
                    console.error('Error fetching public access block configuration:', error);
                } else {
                    setBlockPublicAcls(false);
                    setIgnorePublicAcls(false);
                    setBlockPublicPolicy(false);
                    setRestrictPublicBuckets(false);
                }
            }
        };

        fetchBucketSettings();
    }, [bucketName, isOpen]);

    const handleClose = () => {
        if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
        setError(null);
        setHasUnsavedChanges(false);
        onClose();
    };
    const handleSave = async () => {
        const client = getS3Client();
        if (!client || !hasUnsavedChanges) return;
        const errors: string[] = [];

        try {
            if (bucketPolicy) {
                await client.send(new PutBucketPolicyCommand({ Bucket: bucketName, Policy: bucketPolicy }));
            } else {
                await client.send(new DeleteBucketPolicyCommand({ Bucket: bucketName }));
            }
        } catch (e: any) {
            errors.push(`Error saving bucket policy: ${e.message}`);
        }

        try {
            if (corsRules) {
                await client.send(new PutBucketCorsCommand({ Bucket: bucketName, CORSConfiguration: { CORSRules: JSON.parse(corsRules) } }));
            } else {
                await client.send(new DeleteBucketCorsCommand({ Bucket: bucketName }));
            }
        } catch (e: any) {
            errors.push(`Error saving CORS rules: ${e.message}`);
        }

        try {
            if (websiteConfig) {
                await client.send(new PutBucketWebsiteCommand({ Bucket: bucketName, WebsiteConfiguration: JSON.parse(websiteConfig) }));
            } else {
                await client.send(new DeleteBucketWebsiteCommand({ Bucket: bucketName }));
            }
        } catch (e: any) {
            errors.push(`Error saving website configuration: ${e.message}`);
        }

        try {
            if (loggingConfig) {
                await client.send(new PutBucketLoggingCommand({ Bucket: bucketName, BucketLoggingStatus: { LoggingEnabled: JSON.parse(loggingConfig) } }));
            } else {
                await client.send(new PutBucketLoggingCommand({ Bucket: bucketName, BucketLoggingStatus: {} }));
            }
        } catch (e: any) {
            errors.push(`Error saving logging configuration: ${e.message}`);
        }

        try {
            if (blockPublicAcls || ignorePublicAcls || blockPublicPolicy || restrictPublicBuckets) {
                await client.send(new PutPublicAccessBlockCommand({
                    Bucket: bucketName,
                    PublicAccessBlockConfiguration: {
                        BlockPublicAcls: blockPublicAcls,
                        IgnorePublicAcls: ignorePublicAcls,
                        BlockPublicPolicy: blockPublicPolicy,
                        RestrictPublicBuckets: restrictPublicBuckets,
                    },
                }));
            } else {
                await client.send(new DeletePublicAccessBlockCommand({ Bucket: bucketName }));
            }
        } catch (e: any) {
            errors.push(`Error saving public access block configuration: ${e.message}`);
        }

        if (errors.length > 0) {
            const errorMsg = errors.join('\n');
            setError(errorMsg);
            showErrorToast(errorMsg);
        } else {
            setHasUnsavedChanges(false);
            showSuccess('Bucket settings saved successfully!');
            onClose();
        }
    };

    const icon = (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );

    const footer = (
        <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={handleClose}>
                Cancel
            </Button>
            <Button 
                variant="primary" 
                onClick={handleSave} 
                disabled={!hasUnsavedChanges}
                className={!hasUnsavedChanges ? 'opacity-50 cursor-not-allowed' : ''}
            >
                Save Changes
            </Button>
        </div>
    );

    const handleChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setter(e.target.value);
        setHasUnsavedChanges(true);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Bucket Settings"
            subtitle={bucketName}
            icon={icon}
            iconGradient={ICON_GRADIENTS.purple}
            footer={footer}
            maxWidth="4xl"
        >
            <div className="space-y-6">
                {error && <ErrorAlert message={error} />}

                <Textarea
                    label="Bucket Policy (JSON)"
                    value={bucketPolicy}
                    onChange={handleChange(setBucketPolicy)}
                    style={{ height: '150px' }}
                    placeholder="Enter bucket policy JSON..."
                />

                <Textarea
                    label="CORS Rules (JSON)"
                    value={corsRules}
                    onChange={handleChange(setCorsRules)}
                    style={{ height: '150px' }}
                    placeholder="Enter CORS rules JSON..."
                />

                <Textarea
                    label="Static Website Hosting (JSON)"
                    value={websiteConfig}
                    onChange={handleChange(setWebsiteConfig)}
                    style={{ height: '100px' }}
                    placeholder="Enter website configuration JSON..."
                />

                <Textarea
                    label="Server Access Logging (JSON)"
                    value={loggingConfig}
                    onChange={handleChange(setLoggingConfig)}
                    style={{ height: '100px' }}
                    placeholder="Enter logging configuration JSON..."
                />

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-slate-800 mb-3">Public Access Block Settings</h5>
                    <div className="space-y-2">
                        {[
                            { id: 'blockPublicAcls', label: 'Block Public ACLs', checked: blockPublicAcls, onChange: setBlockPublicAcls },
                            { id: 'ignorePublicAcls', label: 'Ignore Public ACLs', checked: ignorePublicAcls, onChange: setIgnorePublicAcls },
                            { id: 'blockPublicPolicy', label: 'Block Public Policy', checked: blockPublicPolicy, onChange: setBlockPublicPolicy },
                            { id: 'restrictPublicBuckets', label: 'Restrict Public Buckets', checked: restrictPublicBuckets, onChange: setRestrictPublicBuckets },
                        ].map(({ id, label, checked, onChange }) => (
                            <label key={id} className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id={id}
                                    checked={checked}
                                    onChange={(e) => {
                                        onChange(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-slate-700">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default BucketSettingsModal;