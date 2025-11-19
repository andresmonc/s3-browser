import { S3Client } from '@aws-sdk/client-s3';
import type { S3Credentials } from './components/SettingsModal';

export const getS3Client = (credentials: S3Credentials | null): S3Client | null => {
    if (!credentials || !credentials.endpoint) {
        return null;
    }

    // Create a new client instance with current credentials
    const clientConfig: any = {
        endpoint: credentials.endpoint,
        region: credentials.region || 'us-east-1',
        forcePathStyle: true, // Required for MinIO
    };

    // Only include credentials if both accessKeyId and secretAccessKey are provided
    if (credentials.accessKeyId && credentials.secretAccessKey) {
        clientConfig.credentials = {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
        };
    }

    return new S3Client(clientConfig);
};

// Function to refresh the client instance (call this after updating credentials)
export const refreshS3Client = (credentials: S3Credentials | null): S3Client | null => {
    return getS3Client(credentials);
};
