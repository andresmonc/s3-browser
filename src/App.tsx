import { useState } from 'react';
import BucketList from './components/BucketList';
import ObjectList from './components/ObjectList';
import { s3Client } from './s3-client';

function App() {
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

    if (!s3Client) {
        return (
            <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
                <div className="p-4 bg-white rounded shadow text-center">
                    <h1 className="h2 text-danger mb-3">Configuration Missing</h1>
                    <p className="text-secondary">Please create a <code>.env</code> file with your S3 credentials.</p>
                    <p className="text-muted small mt-3">Refer to the <code>README.md</code> for more information.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex vh-100 bg-light font-sans">
            <div className="w-25 bg-dark text-white p-3 overflow-auto">
                <BucketList selectedBucket={selectedBucket} onSelectBucket={setSelectedBucket} />
            </div>
            <div className="w-75 p-3 d-flex flex-column">
                <ObjectList selectedBucket={selectedBucket} />
            </div>
        </div>
    );
}

export default App;
