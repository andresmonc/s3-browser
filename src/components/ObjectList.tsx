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
        return <div className="text-center text-secondary">Select a bucket to see its objects.</div>;
    }

    return (
        <div className="card shadow-sm h-100 d-flex flex-column">
            <div className="card-body d-flex flex-column">
                <h2 className="card-title h5">Objects in {selectedBucket}</h2>
                <FileUploader selectedBucket={selectedBucket} onUploadSuccess={forceRefresh} />
                <input
                    type="text"
                    placeholder="Search objects..."
                    className="form-control my-3"
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="flex-grow-1 overflow-auto">
                    <table className="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th scope="col">Name</th>
                                <th scope="col">Size</th>
                                <th scope="col">Last Modified</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredObjects.map(obj => (
                                <tr key={obj.Key}>
                                    <td>{obj.Key}</td>
                                    <td>{prettyBytes(obj.Size || 0)}</td>
                                    <td>{obj.LastModified?.toLocaleString()}</td>
                                    <td>
                                        <button onClick={() => handleDownloadObject(obj.Key!)} className="btn btn-link p-0 me-2">Download</button>
                                        <button onClick={() => handleDeleteObject(obj.Key!)} className="btn btn-link p-0 text-danger">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ObjectList;
