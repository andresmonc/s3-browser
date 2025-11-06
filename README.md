# S3/MinIO Object Browser

This is a lightweight, internal-only web-based browser for S3-compatible object storage like MinIO. It provides full CRUD (Create, Read, Update, Delete) operations for buckets and objects.

## Features

- List, create, and delete buckets.
- List, upload, download, and delete objects.
- Drag-and-drop file uploads with progress bars.
- Search for objects within a bucket.
- Minimal, responsive UI.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **S3 Communication:** AWS SDK for JavaScript v3
- **Deployment:** Docker, Nginx, Kubernetes

## Prerequisites

- Node.js and npm
- Docker
- `kubectl` and a running Kubernetes cluster
- An S3-compatible object storage service (e.g., MinIO)

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

3.  **Configure credentials:**
    Create a `.env` file in the project root by copying the example:
    ```sh
    cp .env.example .env
    ```
    Edit the `.env` file with your S3 endpoint, region, access key, and secret key:
    ```
    VITE_S3_ENDPOINT=https://s3.your-domain.com
    VITE_S3_REGION=us-east-1
    VITE_S3_ACCESS_KEY_ID=YOUR_ACCESS_KEY
    VITE_S3_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
    ```

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## CORS Configuration

For the browser to communicate directly with your S3 service, you must configure Cross-Origin Resource Sharing (CORS) on the S3 server (e.g., MinIO). 

Set the CORS policy for your buckets to allow `GET`, `PUT`, `DELETE` requests from the origin where the S3 browser is hosted.

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

## Build and Deploy with Docker & Kubernetes

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

