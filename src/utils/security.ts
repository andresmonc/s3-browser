/**
 * Additional security utilities for client-side protection
 */

const SESSION_TIMEOUT_KEY = 's3-browser-session-timeout';
const FAILED_ATTEMPTS_KEY = 's3-browser-failed-attempts';
const LAST_ACTIVITY_KEY = 's3-browser-last-activity';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SESSION_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes of inactivity

/**
 * Check if account is locked due to too many failed attempts
 */
export function isAccountLocked(): boolean {
    const lockoutData = sessionStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!lockoutData) return false;

    try {
        const { attempts, timestamp } = JSON.parse(lockoutData);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            const timeSinceLockout = Date.now() - timestamp;
            if (timeSinceLockout < LOCKOUT_DURATION) {
                return true;
            } else {
                // Lockout expired, reset
                sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
                return false;
            }
        }
    } catch {
        return false;
    }
    return false;
}

/**
 * Get remaining lockout time in seconds
 */
export function getRemainingLockoutTime(): number {
    const lockoutData = sessionStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!lockoutData) return 0;

    try {
        const { timestamp } = JSON.parse(lockoutData);
        const timeSinceLockout = Date.now() - timestamp;
        const remaining = LOCKOUT_DURATION - timeSinceLockout;
        return Math.max(0, Math.ceil(remaining / 1000));
    } catch {
        return 0;
    }
}

/**
 * Record a failed password attempt
 */
export function recordFailedAttempt(): void {
    const lockoutData = sessionStorage.getItem(FAILED_ATTEMPTS_KEY);
    let attempts = 1;
    let timestamp = Date.now();

    if (lockoutData) {
        try {
            const data = JSON.parse(lockoutData);
            const timeSinceLastAttempt = Date.now() - data.timestamp;
            
            // Reset if lockout expired
            if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
                attempts = 1;
                timestamp = Date.now();
            } else {
                attempts = data.attempts + 1;
                timestamp = data.timestamp;
            }
        } catch {
            // Invalid data, reset
        }
    }

    sessionStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify({ attempts, timestamp }));
}

/**
 * Clear failed attempts (on successful login)
 */
export function clearFailedAttempts(): void {
    sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
    sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

/**
 * Check if session has timed out due to inactivity
 */
export function isSessionTimedOut(): boolean {
    const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;

    const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
    return timeSinceActivity > SESSION_TIMEOUT_DURATION;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (password.length > 128) {
        return { valid: false, message: 'Password must be less than 128 characters' };
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one letter' };
    }

    // Optional: Check for special character (commented out for flexibility)
    // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    //     return { valid: false, message: 'Password must contain at least one special character' };
    // }

    return { valid: true };
}

/**
 * Clear sensitive data from memory
 */
export function clearSensitiveData(): void {
    // Force garbage collection hints (browser may ignore)
    if (window.gc) {
        window.gc();
    }
}

/**
 * Detect if localStorage has been tampered with
 */
export function detectTampering(): boolean {
    try {
        const testKey = 's3-browser-tamper-check';
        const testValue = Date.now().toString();
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        return retrieved !== testValue;
    } catch {
        // If we can't write to localStorage, something is wrong
        return true;
    }
}

/**
 * Setup activity tracking for session timeout
 */
export function setupActivityTracking(onTimeout: () => void): () => void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    let timeoutId: number | null = null;

    const resetTimeout = () => {
        updateLastActivity();
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = window.setTimeout(() => {
            if (isSessionTimedOut()) {
                onTimeout();
            }
        }, SESSION_TIMEOUT_DURATION);
    };

    // Initial setup
    resetTimeout();

    // Add event listeners
    events.forEach(event => {
        document.addEventListener(event, resetTimeout, { passive: true });
    });

    // Return cleanup function
    return () => {
        events.forEach(event => {
            document.removeEventListener(event, resetTimeout);
        });
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    };
}

