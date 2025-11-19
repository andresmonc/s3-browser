# S3 Browser

A secure, privacy-focused web-based browser for S3-compatible object storage (AWS S3, MinIO, etc.). This tool lives entirely in your browser—nothing leaves your device except your direct S3 API calls.

## 🔒 Security & Privacy First

**This tool lives entirely in your browser; nothing leaves your device except your direct S3 calls. Still, never paste keys you're not comfortable storing locally.**

### Security Features

- **🔐 Password-Protected Encryption**: AWS credentials are encrypted with AES-256-GCM using a user-set password before storage
- **🔑 Zero Trust Storage**: Your password is never stored—only used to encrypt/decrypt credentials
- **⏱️ Session Timeout**: Automatic logout after 30 minutes of inactivity
- **🛡️ Brute Force Protection**: Account locks after 5 failed password attempts (15-minute lockout)
- **🔍 Tamper Detection**: Alerts if encrypted storage has been modified
- **📦 Client-Side Only**: All encryption/decryption happens in your browser using Web Crypto API
- **🌐 Content Security Policy**: Strict CSP prevents XSS and injection attacks
- **✅ Subresource Integrity**: External resources verified with SRI hashes
- **🚫 No Backend**: No server means no data collection, no logging, no tracking

### Privacy Guarantees

- ✅ **No telemetry** - Zero tracking or analytics
- ✅ **No external calls** - Only direct S3 API requests
- ✅ **No data collection** - Nothing is sent to third parties
- ✅ **Fully offline capable** - Download bundle works completely offline
- ✅ **Local storage only** - All data stays in your browser

## Features

- **Bucket Management**: List, create, rename, and delete buckets
- **Object Operations**: Upload, download, preview, copy, rename, and delete objects
- **Advanced Features**:
  - Drag-and-drop file uploads with progress tracking
  - Search and filter objects (by type: images, documents, videos)
  - Folder navigation with breadcrumbs
  - Bulk operations (select multiple objects)
  - Download entire bucket as ZIP
  - Tabbed interface: Objects, Metadata, Properties, Permissions, Metrics, Management, Access Points
- **Security**: Password-protected credential encryption, session timeout, brute force protection
- **Offline Bundle**: Download complete application for offline use

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **S3 Communication:** AWS SDK for JavaScript v3
- **Security:** Web Crypto API (PBKDF2 + AES-GCM), Content Security Policy, Subresource Integrity
- **Deployment:** Docker, Nginx, Kubernetes

## How It Works

### Credential Storage & Encryption

1. **First Time Setup**: When you configure S3 credentials, you'll be prompted to set an encryption password
2. **Encryption**: Your AWS access key and secret key are encrypted using:
   - **PBKDF2** with 100,000 iterations for key derivation
   - **AES-256-GCM** for encryption
   - Random salt and IV for each encryption
3. **Storage**: Only encrypted data is stored in browser localStorage—never plain text
4. **Password**: Your password is never stored—it's only used to encrypt/decrypt
5. **Session**: Decrypted credentials exist only in browser memory and are cleared on:
   - Page refresh
   - 30 minutes of inactivity
   - Manual logout

### Security Measures

- **Password Strength**: Minimum 8 characters, requires numbers and letters
- **Rate Limiting**: 5 failed attempts → 15-minute lockout
- **Session Management**: Auto-logout after inactivity
- **Tamper Detection**: Alerts if encrypted storage is modified
- **Memory Clearing**: Sensitive data cleared from memory on timeout

## Prerequisites

- Node.js 18+ and npm
- Modern browser with Web Crypto API support (Chrome, Firefox, Safari, Edge)
- An S3-compatible object storage service (AWS S3, MinIO, etc.)

## Local Development

1.  **Clone the repository:**
    ```sh
    git clone <repository-url>
    cd s3-browser
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

4.  **Configure credentials:**
    - Click "Configure S3 Settings" on first launch
    - Enter your S3 endpoint, region, and credentials
    - Set an encryption password (minimum 8 characters)
    - Your credentials will be encrypted and stored locally

## Offline Usage

The application can be downloaded as a complete offline bundle:

1. **Download Bundle**: Click "Download Bundle" in the settings or sidebar
2. **Extract**: Unzip the downloaded file
3. **Serve Locally**: Run a local HTTP server:
   ```bash
   python3 -m http.server 8000
   # or
   npx http-server . -p 8000
   ```
4. **Access**: Open `http://localhost:8000` in your browser

**Note**: The bundle must be served via HTTP (not opened directly from file system) due to browser security restrictions for ES modules.

## Security Best Practices

### For Users

- ✅ Use a strong, unique password for credential encryption
- ✅ Don't share your encryption password
- ✅ Log out when done (or rely on auto-timeout)
- ✅ Only use on trusted devices
- ✅ Be cautious of browser extensions that might access localStorage

### For Developers

- ✅ Review the CSP policy before deployment
- ✅ Ensure HTTPS in production (required for Web Crypto API)
- ✅ Keep dependencies updated
- ✅ Use the provided SRI hashes for external resources
- ✅ Test the offline bundle before distributing

## Architecture & Security Design

### Client-Side Architecture

```
┌─────────────────────────────────────────┐
│         User's Browser                   │
│  ┌───────────────────────────────────┐  │
│  │  React Application (Client-Side)  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Encrypted Credentials       │  │  │
│  │  │ (localStorage)              │  │  │
│  │  └─────────────────────────────┘  │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ Decrypted Credentials       │  │  │
│  │  │ (Memory Only)               │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│           ↓ Direct API Calls             │
└─────────────────────────────────────────┘
              ↓ HTTPS
┌─────────────────────────────────────────┐
│      S3-Compatible Storage              │
│   (AWS S3, MinIO, etc.)                 │
└─────────────────────────────────────────┘
```

**Key Points:**
- No backend server = no data collection
- All encryption happens client-side
- Credentials only decrypted in memory during active session
- Direct API calls to S3 (no proxy or intermediary)

### Security Headers

The application implements comprehensive security headers:

- **Content Security Policy (CSP)**: Restricts resource loading to prevent XSS
- **Subresource Integrity (SRI)**: Verifies external resource integrity
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Disables unnecessary browser features
- **Strict-Transport-Security**: Enforces HTTPS

## CORS Configuration

For the browser to communicate directly with your S3 service, you must configure Cross-Origin Resource Sharing (CORS) on the S3 server (e.g., MinIO). 

Set the CORS policy for your buckets to allow `GET`, `PUT`, `DELETE`, `POST`, `HEAD` requests from the origin where the S3 browser is hosted.

Example MinIO CORS configuration (`mc admin bucket cors set`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::your-bucket/*"],
      "Condition": {
        "StringEquals": {
          "aws:Referer": ["http://localhost:5173/*", "http://s3-browser.your-domain.com/*"]
        }
      }
    }
  ]
}
```

## Deployment

### Docker

1.  **Build the Docker image:**
    ```sh
    docker build -t s3-browser .
    ```

2.  **Run the container:**
    ```sh
    docker run -p 8080:80 s3-browser
    ```

The Docker image includes:
- Nginx with security headers configured
- Built application optimized for production
- All static assets bundled

### Kubernetes

1.  **Build the Docker image:**
    ```sh
    docker build -t s3-browser:latest .
    ```

2.  **Push the image to a registry (if necessary):**
    If your Kubernetes cluster is on a different machine, you'll need to push the image to a container registry that your cluster can access.
    ```sh
    docker tag s3-browser:latest your-registry/s3-browser:latest
    docker push your-registry/s3-browser:latest
    ```
    Remember to update the `image` field in `kubernetes/deployment.yaml`.

3.  **Configure Kubernetes manifests:**

    -   **`kubernetes/configmap.yaml`**: Update the `VITE_S3_ENDPOINT` and other values as needed. For production, it is strongly recommended to use Kubernetes Secrets for credentials instead of a ConfigMap. See the comments in `kubernetes/deployment.yaml` for an example.

    -   **`kubernetes/ingress.yaml`**: Configure the Ingress host and any necessary annotations for your Ingress controller.

4.  **Deploy to Kubernetes:**
    Apply the Kubernetes manifests:
    ```sh
    kubectl apply -f kubernetes/configmap.yaml
    kubectl apply -f kubernetes/deployment.yaml
    kubectl apply -f kubernetes/service.yaml
    kubectl apply -f kubernetes/ingress.yaml
    ```

5.  **Access the application:**
    Once deployed, the application will be accessible via the host specified in your Ingress resource.

### Cloudflare Pages

The application is configured for Cloudflare Pages deployment (see `wrangler.toml`). Security headers are automatically configured via Cloudflare's dashboard or Workers.

