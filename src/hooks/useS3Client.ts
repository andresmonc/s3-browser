import { useMemo } from 'react';
import { getS3Client } from '../s3-client';
import { useCredentials } from '../contexts/CredentialContext';
import type { S3Client } from '@aws-sdk/client-s3';

/**
 * Hook that provides an S3 client instance using credentials from context
 */
export const useS3Client = (): S3Client | null => {
    const { credentials } = useCredentials();
    
    return useMemo(() => {
        return getS3Client(credentials);
    }, [credentials]);
};

