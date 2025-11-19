import { S3Client } from '@aws-sdk/client-s3';
import { loadCredentialsFromStorage } from './components/SettingsModal';

export const getS3Client = (): S3Client | null => {
    const credentials = loadCredentialsFromStorage();
    
    if (!credentials || !credentials.endpoint || !credentials.accessKeyId || !credentials.secretAccessKey) {
        return null;
    }

    // Create a new client instance with current credentials
    return new S3Client({
        endpoint: credentials.endpoint,
        region: credentials.region || 'us-east-1',
        credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
        },
        forcePathStyle: true, // Required for MinIO
    });
};

// Function to refresh the client instance (call this after updating credentials)
export const refreshS3Client = (): S3Client | null => {
    return getS3Client();
};
