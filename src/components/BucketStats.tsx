import { useEffect, useState } from 'react';
import { getS3Client } from '../s3-client';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import prettyBytes from 'pretty-bytes';
import { useToast } from '../hooks/useToast';

interface BucketStatsProps {
    bucketName: string;
}

interface Stats {
    totalObjects: number;
    totalSize: number;
    images: number;
    documents: number;
    videos: number;
    other: number;
}

const BucketStats = ({ bucketName }: BucketStatsProps) => {
    const [stats, setStats] = useState<Stats>({
        totalObjects: 0,
        totalSize: 0,
        images: 0,
        documents: 0,
        videos: 0,
        other: 0
    });
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();

    useEffect(() => {
        const loadStats = async () => {
            const client = getS3Client();
            if (!client || !bucketName) {
                setLoading(false);
                return;
            }

            try {
                let allObjects: any[] = [];
                let continuationToken: string | undefined = undefined;
                let isTruncated = true;

                while (isTruncated) {
                    const response = await client.send(new ListObjectsV2Command({
                        Bucket: bucketName,
                        ContinuationToken: continuationToken
                    }));
                    
                    if (response.Contents) {
                        allObjects = [...allObjects, ...response.Contents];
                    }
                    
                    isTruncated = response.IsTruncated || false;
                    continuationToken = response.NextContinuationToken;
                }

                const totalSize = allObjects.reduce((sum, obj) => sum + (obj.Size || 0), 0);
                const images = allObjects.filter(obj => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(obj.Key || '')).length;
                const documents = allObjects.filter(obj => /\.(pdf|doc|docx|txt|md|json|xml|csv)$/i.test(obj.Key || '')).length;
                const videos = allObjects.filter(obj => /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(obj.Key || '')).length;
                const other = allObjects.length - images - documents - videos;

                setStats({
                    totalObjects: allObjects.length,
                    totalSize,
                    images,
                    documents,
                    videos,
                    other
                });
            } catch (error: any) {
                showError(`Failed to load bucket statistics: ${error.message || 'Unknown error'}`);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [bucketName]);

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-md px-3 py-1.5 border border-blue-200">
                <div className="animate-pulse flex items-center gap-4">
                    <div className="h-4 bg-slate-200 rounded w-16"></div>
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                    <div className="h-4 bg-slate-200 rounded w-12"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-md px-3 py-1.5 border border-blue-200 flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Objects:</span>
                <span className="text-blue-700 font-bold">{stats.totalObjects.toLocaleString()}</span>
            </div>
            <div className="w-px h-4 bg-blue-300"></div>
            <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Size:</span>
                <span className="text-purple-700 font-bold">{prettyBytes(stats.totalSize)}</span>
            </div>
            <div className="w-px h-4 bg-blue-300"></div>
            <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Images:</span>
                <span className="text-pink-700 font-bold">{stats.images}</span>
            </div>
            <div className="w-px h-4 bg-blue-300"></div>
            <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Docs:</span>
                <span className="text-indigo-700 font-bold">{stats.documents}</span>
            </div>
            <div className="w-px h-4 bg-blue-300"></div>
            <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Videos:</span>
                <span className="text-purple-700 font-bold">{stats.videos}</span>
            </div>
            <div className="w-px h-4 bg-blue-300"></div>
            <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-semibold">Other:</span>
                <span className="text-slate-700 font-bold">{stats.other}</span>
            </div>
        </div>
    );
};

export default BucketStats;

