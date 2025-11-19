import { useEffect, useState } from 'react';
import { useS3Client } from '../hooks/useS3Client';
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
    const s3Client = useS3Client();

    useEffect(() => {
        const loadStats = async () => {
            if (!s3Client || !bucketName) {
                setLoading(false);
                return;
            }

            try {
                let allObjects: any[] = [];
                let continuationToken: string | undefined = undefined;
                let isTruncated = true;

                while (isTruncated) {
                    const response = await s3Client.send(new ListObjectsV2Command({
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
    }, [bucketName, s3Client, showError]);

    if (loading) {
        return (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-200">
                <div className="animate-pulse flex items-center gap-6">
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                    <div className="h-4 bg-slate-200 rounded w-16"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-200 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Objects:</span>
                <span className="text-blue-600 font-bold">{stats.totalObjects.toLocaleString()}</span>
            </div>
            <div className="w-px h-5 bg-slate-300"></div>
            <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Size:</span>
                <span className="text-slate-800 font-bold">{prettyBytes(stats.totalSize)}</span>
            </div>
            <div className="w-px h-5 bg-slate-300"></div>
            <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Images:</span>
                <span className="text-pink-600 font-bold">{stats.images}</span>
            </div>
            <div className="w-px h-5 bg-slate-300"></div>
            <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Docs:</span>
                <span className="text-indigo-600 font-bold">{stats.documents}</span>
            </div>
            <div className="w-px h-5 bg-slate-300"></div>
            <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Videos:</span>
                <span className="text-purple-600 font-bold">{stats.videos}</span>
            </div>
            <div className="w-px h-5 bg-slate-300"></div>
            <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Other:</span>
                <span className="text-slate-700 font-bold">{stats.other}</span>
            </div>
        </div>
    );
};

export default BucketStats;

