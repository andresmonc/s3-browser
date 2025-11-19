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
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200">
                <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                    <div className="h-6 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg p-3 border border-blue-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-1.5">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Statistics</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-md p-2 border border-blue-200">
                    <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">Objects</div>
                    <div className="text-sm font-bold text-blue-900">{stats.totalObjects.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-md p-2 border border-purple-200">
                    <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Size</div>
                    <div className="text-sm font-bold text-purple-900">{prettyBytes(stats.totalSize)}</div>
                </div>
                <div className="bg-white rounded-md p-2 border border-pink-200">
                    <div className="text-[10px] font-semibold text-pink-600 uppercase tracking-wider mb-0.5">Images</div>
                    <div className="text-sm font-bold text-pink-900">{stats.images}</div>
                </div>
                <div className="bg-white rounded-md p-2 border border-indigo-200">
                    <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider mb-0.5">Docs</div>
                    <div className="text-sm font-bold text-indigo-900">{stats.documents}</div>
                </div>
                <div className="bg-white rounded-md p-2 border border-purple-200">
                    <div className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Videos</div>
                    <div className="text-sm font-bold text-purple-900">{stats.videos}</div>
                </div>
                <div className="bg-white rounded-md p-2 border border-slate-200">
                    <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-0.5">Other</div>
                    <div className="text-sm font-bold text-slate-900">{stats.other}</div>
                </div>
            </div>
        </div>
    );
};

export default BucketStats;

