import { useState } from 'react';
import './App.css';
import BucketList from './components/BucketList';
import ObjectList from './components/ObjectList';
import { s3Client } from './s3-client';

function App() {
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

    if (!s3Client) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="p-8 bg-white rounded-lg shadow-md text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Missing</h1>
                    <p className="text-gray-700">Please create a <code>.env</code> file with your S3 credentials.</p>
                    <p className="text-gray-500 text-sm mt-4">Refer to the <code>README.md</code> for more information.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <div className="w-1/4 bg-gray-800 text-white p-4 overflow-y-auto">
                <BucketList selectedBucket={selectedBucket} onSelectBucket={setSelectedBucket} />
            </div>
            <div className="w-3/4 p-4 flex flex-col">
                <ObjectList selectedBucket={selectedBucket} />
            </div>
        </div>
    );
}

export default App;
