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

## Deploying on Linux Virtual Machine

The included `Dockerfile` builds the Vite application and serves it via Nginx on your Linux VM.

Build and start the container on your VM:

```bash
docker build -t school-appraisal-frontend .
docker run -d --name school-appraisal-frontend --net=host school-appraisal-frontend
```

## Attachment URL Resolution on VM

The frontend handles attachment files via relative local path equivalents (`/uploads/...`), serving files directly from the VM's backend `/uploads` endpoint.

---

## Production & VM Network Configuration

To deploy the frontend to support both local VM access (`10.100.0.23`) and public domain/IP access (`150.129.156.37`) without CORS or Mixed Content blocking:

### A. Environment Variable (`VITE_API_BASE_URL`)
Configure the API base URL to use the relative path `"/AAA"` (no trailing `/api`). This ensures the browser resolves requests dynamically using the current host origin (HTTP/HTTPS and correct port/IP):
```env
VITE_API_BASE_URL="/AAA"
```

### B. Why `/AAA` instead of `/AAA/api`?
* Axios request paths are prefixed with `/api` by default (e.g. `client.post("/api/auth/login")`).
* Specifying `"/AAA"` resolves the URL to `/AAA/api/auth/login`, which Nginx forwards correctly.
* Specifying `"/AAA/api"` would result in a duplicate `/AAA/api/api/auth/login` path, causing security authentication failures (401).

