/**
 * Encryption utilities for securing AWS credentials
 * Uses Web Crypto API with PBKDF2 key derivation and AES-GCM encryption
 */

const TEST_PHRASE = 's3-browser-credentials-valid';
const STORAGE_KEY_ENCRYPTED = 's3-browser-credentials-encrypted';
const STORAGE_KEY_TEST_PHRASE = 's3-browser-test-phrase-encrypted';
const PBKDF2_ITERATIONS = 100000; // High iteration count for security

/**
 * Derive an encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Encrypt data using AES-GCM
 */
async function encryptData(data: string, password: string): Promise<string> {
    const salt = generateSalt();
    const key = await deriveKey(password, salt);
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
        },
        key,
        encoder.encode(data)
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 */
async function decryptData(encryptedData: string, password: string): Promise<string> {
    try {
        // Convert from base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

        // Extract salt, IV, and encrypted data
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encrypted = combined.slice(28);

        const key = await deriveKey(password, salt);
        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (error) {
        throw new Error('Decryption failed. Incorrect password or corrupted data.');
    }
}

/**
 * Encrypt and store credentials
 */
export async function encryptAndStoreCredentials(
    credentials: any,
    password: string
): Promise<void> {
    const credentialsJson = JSON.stringify(credentials);
    const encryptedCredentials = await encryptData(credentialsJson, password);
    const encryptedTestPhrase = await encryptData(TEST_PHRASE, password);

    localStorage.setItem(STORAGE_KEY_ENCRYPTED, encryptedCredentials);
    localStorage.setItem(STORAGE_KEY_TEST_PHRASE, encryptedTestPhrase);
}

/**
 * Verify password and decrypt credentials
 */
export async function verifyPasswordAndDecryptCredentials(
    password: string
): Promise<any | null> {
    try {
        const encryptedTestPhrase = localStorage.getItem(STORAGE_KEY_TEST_PHRASE);
        const encryptedCredentials = localStorage.getItem(STORAGE_KEY_ENCRYPTED);

        if (!encryptedTestPhrase || !encryptedCredentials) {
            return null;
        }

        // First verify password by decrypting test phrase
        const decryptedTestPhrase = await decryptData(encryptedTestPhrase, password);
        
        if (decryptedTestPhrase !== TEST_PHRASE) {
            throw new Error('Invalid password');
        }

        // Password is correct, decrypt credentials
        const decryptedCredentials = await decryptData(encryptedCredentials, password);
        return JSON.parse(decryptedCredentials);
    } catch (error) {
        throw error;
    }
}

/**
 * Check if encrypted credentials exist
 */
export function hasEncryptedCredentials(): boolean {
    return !!(
        localStorage.getItem(STORAGE_KEY_ENCRYPTED) &&
        localStorage.getItem(STORAGE_KEY_TEST_PHRASE)
    );
}

/**
 * Clear encrypted credentials
 */
export function clearEncryptedCredentials(): void {
    localStorage.removeItem(STORAGE_KEY_ENCRYPTED);
    localStorage.removeItem(STORAGE_KEY_TEST_PHRASE);
}

