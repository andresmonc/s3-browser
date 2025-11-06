import { useEffect, useState } from 'react';
import { s3Client } from '../s3-client';
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, _Object } from '@aws-sdk/client-s3';
import prettyBytes from 'pretty-bytes';
import FileUploader from './FileUploader';

interface ObjectListProps {
    selectedBucket: string | null;
}

const ObjectList = ({ selectedBucket }: ObjectListProps) => {
    const [objects, setObjects] = useState<_Object[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [refresh, setRefresh] = useState(false);

    const forceRefresh = () => setRefresh(!refresh);

    useEffect(() => {
        if (!selectedBucket || !s3Client) {
            setObjects([]);
            return;
        }

        const fetchObjects = async () => {
            try {
                const response = await s3Client.send(new ListObjectsV2Command({ Bucket: selectedBucket }));
                setObjects(response.Contents || []);
            } catch (error) {
                console.error('Error fetching objects:', error);
            }
        };

        fetchObjects();
    }, [selectedBucket, refresh]);

    const handleDeleteObject = async (key: string) => {
        if (!selectedBucket || !s3Client) return;

        if (window.confirm(`Are you sure you want to delete "${key}"?`)) {
            try {
                await s3Client.send(new DeleteObjectCommand({ Bucket: selectedBucket, Key: key }));
                forceRefresh();
            } catch (error) {
                console.error('Error deleting object:', error);
            }
        }
    };

    const handleDownloadObject = async (key: string) => {
        if (!selectedBucket || !s3Client) return;

        try {
            const command = new GetObjectCommand({ Bucket: selectedBucket, Key: key });
            const response = await s3Client.send(command);
            const body = response.Body;

            if (body) {
                const blob = await body.transformToByteArray();
                const url = window.URL.createObjectURL(new Blob([blob]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', key);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
            }
        } catch (error) {
            console.error('Error downloading object:', error);
        }
    };

    const filteredObjects = objects.filter(obj => obj.Key?.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!selectedBucket) {
        return <div className="text-center text-gray-500">Select a bucket to see its objects.</div>;
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Objects in {selectedBucket}</h2>
            <FileUploader selectedBucket={selectedBucket} onUploadSuccess={forceRefresh} />
            <input
                type="text"
                placeholder="Search objects..."
                className="w-full p-2 border rounded my-4"
                onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="flex-grow overflow-y-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2">Name</th>
                            <th className="p-2">Size</th>
                            <th className="p-2">Last Modified</th>
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredObjects.map(obj => (
                            <tr key={obj.Key} className="hover:bg-gray-50">
                                <td className="p-2">{obj.Key}</td>
                                <td className="p-2">{prettyBytes(obj.Size || 0)}</td>
                                <td className="p-2">{obj.LastModified?.toLocaleString()}</td>
                                <td className="p-2">
                                    <button onClick={() => handleDownloadObject(obj.Key!)} className="text-blue-500 hover:underline mr-2">Download</button>
                                    <button onClick={() => handleDeleteObject(obj.Key!)} className="text-red-500 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ObjectList;
