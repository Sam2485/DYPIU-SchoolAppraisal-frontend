# School Appraisal Frontend

## Local Development

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Install dependencies and start Vite:

```powershell
npm install
npm run dev
```

## Deploy To Google Cloud Run

The included `Dockerfile` builds the Vite application and serves it with Nginx. It supports React route refreshes, provides `/health`, and listens on the port supplied by Cloud Run.

The backend URL is injected when the container starts, so it can be changed through a Cloud Run environment variable without rebuilding the frontend.

Authenticate and select your Google Cloud project:

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

Enable the required services:

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Deploy directly from the project root:

```powershell
gcloud run deploy school-appraisal-frontend `
  --source . `
  --region asia-south1 `
  --allow-unauthenticated `
  --set-env-vars VITE_API_BASE_URL=https://schoolappraisal-backend-919405994318.asia-south1.run.app
```

Cloud Run prints the public frontend URL when deployment completes.

The Spring Boot backend must allow CORS requests from the final frontend URL. Add the exact Cloud Run frontend origin, including `https://` and without a trailing slash, to the backend's allowed origins.

To change the backend URL later:

```powershell
gcloud run services update school-appraisal-frontend `
  --region asia-south1 `
  --set-env-vars VITE_API_BASE_URL=https://YOUR-BACKEND-URL
```
