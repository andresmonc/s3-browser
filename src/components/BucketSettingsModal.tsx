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
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto"
            onClick={handleClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <h5 className="text-xl font-bold text-slate-800">Bucket Settings</h5>
                            <p className="text-sm text-slate-500">{bucketName}</p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
                        onClick={handleClose}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                            <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <strong className="text-red-800 font-semibold">Error:</strong>
                                <pre className="text-red-700 mt-1 text-sm whitespace-pre-wrap">{error}</pre>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Bucket Policy (JSON)</label>
                        <textarea
                            value={bucketPolicy}
                            onChange={(e) => {
                                setBucketPolicy(e.target.value);
                                setHasUnsavedChanges(true);
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 font-mono text-sm"
                            style={{ height: '150px' }}
                            placeholder="Enter bucket policy JSON..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">CORS Rules (JSON)</label>
                        <textarea
                            value={corsRules}
                            onChange={(e) => {
                                setCorsRules(e.target.value);
                                setHasUnsavedChanges(true);
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 font-mono text-sm"
                            style={{ height: '150px' }}
                            placeholder="Enter CORS rules JSON..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Static Website Hosting (JSON)</label>
                        <textarea
                            value={websiteConfig}
                            onChange={(e) => {
                                setWebsiteConfig(e.target.value);
                                setHasUnsavedChanges(true);
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 font-mono text-sm"
                            style={{ height: '100px' }}
                            placeholder="Enter website configuration JSON..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Server Access Logging (JSON)</label>
                        <textarea
                            value={loggingConfig}
                            onChange={(e) => {
                                setLoggingConfig(e.target.value);
                                setHasUnsavedChanges(true);
                            }}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 font-mono text-sm"
                            style={{ height: '100px' }}
                            placeholder="Enter logging configuration JSON..."
                        ></textarea>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h5 className="text-sm font-semibold text-slate-800 mb-3">Public Access Block Settings</h5>
                        <div className="space-y-2">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="blockPublicAcls"
                                    checked={blockPublicAcls}
                                    onChange={(e) => {
                                        setBlockPublicAcls(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-slate-700">Block Public ACLs</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="ignorePublicAcls"
                                    checked={ignorePublicAcls}
                                    onChange={(e) => {
                                        setIgnorePublicAcls(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-slate-700">Ignore Public ACLs</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="blockPublicPolicy"
                                    checked={blockPublicPolicy}
                                    onChange={(e) => {
                                        setBlockPublicPolicy(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-slate-700">Block Public Policy</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="restrictPublicBuckets"
                                    checked={restrictPublicBuckets}
                                    onChange={(e) => {
                                        setRestrictPublicBuckets(e.target.checked);
                                        setHasUnsavedChanges(true);
                                    }}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-slate-700">Restrict Public Buckets</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 rounded-b-2xl flex justify-end space-x-3">
                    <button 
                        onClick={handleClose} 
                        className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-white transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        className={`px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 ${
                            !hasUnsavedChanges ? 'opacity-50 cursor-not-allowed transform-none' : ''
                        }`}
                        disabled={!hasUnsavedChanges}
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BucketSettingsModal;