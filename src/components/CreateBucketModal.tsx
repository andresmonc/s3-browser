import { useState } from 'react';

interface CreateBucketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (bucketName: string) => void;
}

const CreateBucketModal = ({ isOpen, onClose, onCreate }: CreateBucketModalProps) => {
    const [bucketName, setBucketName] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (bucketName) {
            onCreate(bucketName);
            setBucketName('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-md w-1/3 text-black">
                <h2 className="text-xl font-bold mb-4">Create New Bucket</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={bucketName}
                        onChange={(e) => setBucketName(e.target.value)}
                        className="w-full p-2 border rounded mb-4"
                        placeholder="Bucket Name"
                    />
                    <div className="flex justify-end">
                        <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2">
                            Cancel
                        </button>
                        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateBucketModal;
