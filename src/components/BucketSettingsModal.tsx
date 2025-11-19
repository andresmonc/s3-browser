import { GetBucketCorsCommand, GetBucketLoggingCommand, GetBucketPolicyCommand, GetBucketWebsiteCommand, PutBucketCorsCommand, PutBucketLoggingCommand, PutBucketPolicyCommand, PutBucketWebsiteCommand, DeleteBucketPolicyCommand, DeleteBucketCorsCommand, DeleteBucketWebsiteCommand, GetPublicAccessBlockCommand, PutPublicAccessBlockCommand, DeletePublicAccessBlockCommand } from "@aws-sdk/client-s3";
import { useEffect, useState } from "react";
import { getS3Client } from "../s3-client";


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
            setError(errors.join('\n'));
        } else {
            setHasUnsavedChanges(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={handleClose}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h5 className="modal-title">Bucket Settings: {bucketName}</h5>
                        <button type="button" className="btn-close" aria-label="Close" onClick={handleClose}></button>
                    </div>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger" role="alert">
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        <div className="mb-3">
                            <label className="form-label">Bucket Policy (JSON)</label>
                            <textarea
                                value={bucketPolicy}
                                onChange={(e) => {
                                    setBucketPolicy(e.target.value);
                                    setHasUnsavedChanges(true);
                                }}
                                className="form-control" style={{ height: '150px' }}
                            ></textarea>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">CORS Rules (JSON)</label>
                            <textarea
                                value={corsRules}
                                onChange={(e) => {
                                    setCorsRules(e.target.value);
                                    setHasUnsavedChanges(true);
                                }}
                                className="form-control" style={{ height: '150px' }}
                            ></textarea>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Static Website Hosting (JSON)</label>
                            <textarea
                                value={websiteConfig}
                                onChange={(e) => {
                                    setWebsiteConfig(e.target.value);
                                    setHasUnsavedChanges(true);
                                }}
                                className="form-control" style={{ height: '100px' }}
                            ></textarea>
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Server Access Logging (JSON)</label>
                            <textarea
                                value={loggingConfig}
                                onChange={(e) => {
                                    setLoggingConfig(e.target.value);
                                    setHasUnsavedChanges(true);
                                }}
                                className="form-control" style={{ height: '100px' }}
                            ></textarea>
                        </div>

                        <div className="mb-3">
                            <h5 className="mb-2">Public Access Block Settings</h5>
                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    id="blockPublicAcls"
                                    checked={blockPublicAcls}
                                    onChange={(e) => {
                                        setBlockPublicAcls(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="form-check-input"
                                />
                                <label className="form-check-label" htmlFor="blockPublicAcls">Block Public ACLs</label>
                            </div>
                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    id="ignorePublicAcls"
                                    checked={ignorePublicAcls}
                                    onChange={(e) => {
                                        setIgnorePublicAcls(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="form-check-input"
                                />
                                <label className="form-check-label" htmlFor="ignorePublicAcls">Ignore Public ACLs</label>
                            </div>
                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    id="blockPublicPolicy"
                                    checked={blockPublicPolicy}
                                    onChange={(e) => {
                                        setBlockPublicPolicy(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="form-check-input"
                                />
                                <label className="form-check-label" htmlFor="blockPublicPolicy">Block Public Policy</label>
                            </div>
                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    id="restrictPublicBuckets"
                                    checked={restrictPublicBuckets}
                                    onChange={(e) => {
                                        setRestrictPublicBuckets(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="form-check-input"
                                />
                                <label className="form-check-label" htmlFor="restrictPublicBuckets">Restrict Public Buckets</label>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button onClick={handleClose} className="btn btn-secondary me-2">
                            Cancel
                        </button>
                        <button onClick={handleSave} className={`btn btn-primary ${!hasUnsavedChanges ? 'disabled' : ''}`}>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BucketSettingsModal;