import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import ErrorAlert from './ui/ErrorAlert';
import { ICON_GRADIENTS } from '../utils/constants';
import { useToast } from '../hooks/useToast';
import { verifyPasswordAndDecryptCredentials } from '../utils/encryption';
import { 
    isAccountLocked, 
    getRemainingLockoutTime, 
    recordFailedAttempt, 
    clearFailedAttempts,
    validatePasswordStrength 
} from '../utils/security';

interface PasswordModalProps {
    isOpen: boolean;
    isFirstTime: boolean;
    onPasswordVerified: (password: string) => void;
    onPasswordSet: (password: string) => void;
    onCancel?: () => void;
    onReset?: () => void;
}

const PasswordModal = ({ 
    isOpen, 
    isFirstTime, 
    onPasswordVerified, 
    onPasswordSet,
    onCancel,
    onReset
}: PasswordModalProps) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [lockoutTime, setLockoutTime] = useState(0);
    const { showError } = useToast();

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setConfirmPassword('');
            setError(null);
            setVerifying(false);
            
            // Check for account lockout
            if (isAccountLocked()) {
                const remaining = getRemainingLockoutTime();
                setLockoutTime(remaining);
                const interval = setInterval(() => {
                    const time = getRemainingLockoutTime();
                    setLockoutTime(time);
                    if (time === 0) {
                        clearInterval(interval);
                    }
                }, 1000);
                return () => clearInterval(interval);
            }
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Check for account lockout
        if (isAccountLocked()) {
            const remaining = getRemainingLockoutTime();
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            setError(`Too many failed attempts. Please wait ${minutes}:${seconds.toString().padStart(2, '0')} before trying again.`);
            return;
        }

        if (isFirstTime) {
            // First time setup - need to set password
            if (!password) {
                setError('Please enter a password');
                return;
            }
            
            // Validate password strength
            const strengthCheck = validatePasswordStrength(password);
            if (!strengthCheck.valid) {
                setError(strengthCheck.message || 'Password does not meet requirements');
                return;
            }
            
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            onPasswordSet(password);
        } else {
            // Verify existing password
            if (!password) {
                setError('Please enter your password');
                return;
            }
            setVerifying(true);
            try {
                // First verify the password by attempting to decrypt
                await verifyPasswordAndDecryptCredentials(password);
                // Password is correct, clear failed attempts and call callback
                clearFailedAttempts();
                onPasswordVerified(password);
            } catch (err: any) {
                recordFailedAttempt();
                if (isAccountLocked()) {
                    const remaining = getRemainingLockoutTime();
                    const minutes = Math.floor(remaining / 60);
                    const seconds = remaining % 60;
                    setError(`Too many failed attempts. Account locked for ${minutes}:${seconds.toString().padStart(2, '0')}.`);
                } else {
                    setError(err.message || 'Invalid password');
                }
                showError(err.message || 'Failed to verify password');
                setVerifying(false);
            }
        }
    };

    const icon = (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    );

    const footer = (
        <div className="flex flex-col space-y-2">
            {!isFirstTime && onReset && (
                <div className="flex justify-center">
                    <button
                        onClick={onReset}
                        disabled={verifying}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        Forgot password? Reset credentials
                    </button>
                </div>
            )}
            <div className="flex justify-end space-x-2">
                {onCancel && (
                    <Button variant="secondary" onClick={onCancel} disabled={verifying} size="sm">
                        Cancel
                    </Button>
                )}
                <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    isLoading={verifying}
                    disabled={lockoutTime > 0 || !password || (isFirstTime && password !== confirmPassword)}
                    size="sm"
                >
                    {isFirstTime ? 'Set Password' : 'Unlock'}
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {}}
            title={isFirstTime ? 'Set Encryption Password' : 'Enter Password'}
            icon={icon}
            iconGradient={ICON_GRADIENTS.primary}
            footer={footer}
            maxWidth="md"
            headerGradient={true}
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    {error && <ErrorAlert message={error} />}
                    
                    {isFirstTime ? (
                        <>
                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                                <p className="text-xs text-blue-900 leading-relaxed">
                                    <strong className="font-semibold text-blue-900">Security Notice:</strong> Your AWS credentials will be encrypted with this password before storage. 
                                    You'll need to enter this password each time you open the application.
                                </p>
                            </div>
                            
                            <Input
                                id="password"
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(null);
                                }}
                                placeholder="Enter a password (min 4 characters)"
                                required
                                autoFocus
                                helperText="This password will encrypt your AWS credentials"
                            />

                            <Input
                                id="confirmPassword"
                                label="Confirm Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError(null);
                                }}
                                placeholder="Confirm your password"
                                required
                                helperText="Re-enter your password to confirm"
                            />
                        </>
                    ) : (
                        <>
                            {lockoutTime > 0 ? (
                                <div className="bg-red-50/50 border border-red-200 rounded-lg p-3">
                                    <p className="text-xs text-red-900 leading-relaxed font-semibold">
                                        Account locked due to too many failed attempts.
                                    </p>
                                    <p className="text-xs text-red-700 mt-1">
                                        Please wait {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, '0')} before trying again.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                                    <p className="text-xs text-amber-900 leading-relaxed mb-1.5">
                                        Please enter your password to decrypt and access your stored AWS credentials.
                                    </p>
                                    {onReset && (
                                        <p className="text-xs text-amber-700 mt-1.5">
                                            Forgot your password? You can reset and reconfigure your credentials.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            <Input
                                id="password"
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(null);
                                }}
                                placeholder="Enter your password"
                                required
                                autoFocus={lockoutTime === 0}
                                disabled={lockoutTime > 0}
                                helperText={lockoutTime > 0 ? "Account is temporarily locked" : "Enter the password you set when configuring credentials"}
                            />
                        </>
                    )}
                </div>
            </form>
        </Modal>
    );
};

export default PasswordModal;

