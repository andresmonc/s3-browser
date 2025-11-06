import { GetBucketCorsCommand, GetBucketLoggingCommand, GetBucketPolicyCommand, GetBucketWebsiteCommand, PutBucketCorsCommand, PutBucketLoggingCommand, PutBucketPolicyCommand, PutBucketWebsiteCommand, DeleteBucketPolicyCommand, DeleteBucketCorsCommand, DeleteBucketWebsiteCommand } from "@aws-sdk/client-s3";
import { useEffect, useState } from "react";
import { s3Client } from "../s3-client";


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
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        setHasUnsavedChanges(false);

        const fetchBucketSettings = async () => {
            if (!s3Client) return;

            try {
                const policy = await s3Client.send(new GetBucketPolicyCommand({ Bucket: bucketName }));
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
                const cors = await s3Client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
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
                const website = await s3Client.send(new GetBucketWebsiteCommand({ Bucket: bucketName }));
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
                const logging = await s3Client.send(new GetBucketLoggingCommand({ Bucket: bucketName }));
                setLoggingConfig(JSON.stringify(logging.LoggingEnabled, null, 2));
            } catch (error) {
                console.error('Error fetching bucket logging configuration:', error);
                setLoggingConfig(JSON.stringify({
                    "TargetBucket": "your-log-bucket",
                    "TargetPrefix": `logs/${bucketName}/`
                }, null, 2));
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
        if (!s3Client || !hasUnsavedChanges) return;
        const errors: string[] = [];

        try {
            if (bucketPolicy) {
                await s3Client.send(new PutBucketPolicyCommand({ Bucket: bucketName, Policy: bucketPolicy }));
            } else {
                await s3Client.send(new DeleteBucketPolicyCommand({ Bucket: bucketName }));
            }
        } catch (e: any) {
            errors.push(`Error saving bucket policy: ${e.message}`);
        }

        try {
            if (corsRules) {
                await s3Client.send(new PutBucketCorsCommand({ Bucket: bucketName, CORSConfiguration: { CORSRules: JSON.parse(corsRules) } }));
            } else {
                await s3Client.send(new DeleteBucketCorsCommand({ Bucket: bucketName }));
            }
        } catch (e: any) {
            errors.push(`Error saving CORS rules: ${e.message}`);
        }

        try {
            if (websiteConfig) {
                await s3Client.send(new PutBucketWebsiteCommand({ Bucket: bucketName, WebsiteConfiguration: JSON.parse(websiteConfig) }));
            } else {
                await s3Client.send(new DeleteBucketWebsiteCommand({ Bucket: bucketName }));
            }
        } catch (e: any) {
            errors.push(`Error saving website configuration: ${e.message}`);
        }

        try {
            if (loggingConfig) {
                await s3Client.send(new PutBucketLoggingCommand({ Bucket: bucketName, BucketLoggingStatus: { LoggingEnabled: JSON.parse(loggingConfig) } }));
            } else {
                await s3Client.send(new PutBucketLoggingCommand({ Bucket: bucketName, BucketLoggingStatus: {} }));
            }
        } catch (e: any) {
            errors.push(`Error saving logging configuration: ${e.message}`);
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center" onClick={handleClose}>
            <div className="bg-white rounded-lg p-8 w-1/2 max-w-4xl h-3/4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">Bucket Settings: {bucketName}</h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong className="font-bold">Error:</strong>
                        <span className="block sm:inline"> {error}</span>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Bucket Policy (JSON)</label>
                    <textarea
                        value={bucketPolicy}
                        onChange={(e) => {
                            setBucketPolicy(e.target.value);
                            setHasUnsavedChanges(true);
                        }}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-48"
                    ></textarea>
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">CORS Rules (JSON)</label>
                    <textarea
                        value={corsRules}
                        onChange={(e) => {
                            setCorsRules(e.target.value);
                            setHasUnsavedChanges(true);
                        }}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-48"
                    ></textarea>
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Static Website Hosting (JSON)</label>
                    <textarea
                        value={websiteConfig}
                        onChange={(e) => {
                            setWebsiteConfig(e.target.value);
                            setHasUnsavedChanges(true);
                        }}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
                    ></textarea>
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Server Access Logging (JSON)</label>
                    <textarea
                        value={loggingConfig}
                        onChange={(e) => {
                            setLoggingConfig(e.target.value);
                            setHasUnsavedChanges(true);
                        }}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
                    ></textarea>
                </div>

                <div className="flex justify-end">
                    <button onClick={handleClose} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2">
                        Cancel
                    </button>
                    <button onClick={handleSave} className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${!hasUnsavedChanges && 'opacity-50 cursor-not-allowed'}`}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BucketSettingsModal;