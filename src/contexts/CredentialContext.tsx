import { createContext, useContext, useState, ReactNode } from 'react';

interface S3Credentials {
    endpoint: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
}

interface CredentialContextType {
    credentials: S3Credentials | null;
    setCredentials: (creds: S3Credentials | null) => void;
    clearCredentials: () => void;
}

const CredentialContext = createContext<CredentialContextType | undefined>(undefined);

export const CredentialProvider = ({ children }: { children: ReactNode }) => {
    const [credentials, setCredentials] = useState<S3Credentials | null>(null);

    const clearCredentials = () => {
        setCredentials(null);
    };

    return (
        <CredentialContext.Provider value={{ credentials, setCredentials, clearCredentials }}>
            {children}
        </CredentialContext.Provider>
    );
};

export const useCredentials = () => {
    const context = useContext(CredentialContext);
    if (!context) {
        throw new Error('useCredentials must be used within CredentialProvider');
    }
    return context;
};

