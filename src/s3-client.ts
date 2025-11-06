import { S3Client } from '@aws-sdk/client-s3';

const getS3Client = () => {
    const endpoint = import.meta.env.VITE_S3_ENDPOINT;
    const region = import.meta.env.VITE_S3_REGION;
    const accessKeyId = import.meta.env.VITE_S3_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.VITE_S3_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return new S3Client({
        endpoint,
        region,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true, // Required for MinIO
    });
};

export const s3Client = getS3Client();
