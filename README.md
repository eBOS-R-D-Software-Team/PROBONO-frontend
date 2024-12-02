
# Probono HMI Deployment Guide

This guide provides instructions to deploy the React application as a static website on a Linux VM (Ubuntu 24.04) using NGINX.

---

## 🚀 Project Overview

This is a React-based single-page application (SPA) that uses React Router for client-side routing. The application will be served as a static website using the `build/` directory.

---

## 📋 Prerequisites

Ensure the following requirements are met before deployment:

- **Operating System**: Ubuntu 24.04 (Linux VM)
- **Web Server**: NGINX running inside Docker containers
- **SSL/TLS**: Managed via Let's Encrypt with a preconfigured domain name
- **Node.js**: Not required (build files are precompiled and ready to deploy)

---

## ⚙️ Deployment Steps

### Step 1: Clone the Repository

1. Clone the repository to your local machine:
   ```bash
   git clone https://gitlab-probono.akkodis.com/WP5/probono-hmi/probono-hmi.git
   ```
2. Navigate to the project directory:
   ```bash
   cd probono-hmi
   ```

---

### Step 2: Use the Prebuilt `build/` Directory

This project already includes a `build/` directory containing the production-ready static files. **No additional build process is required**.

---

### Step 3: Transfer the `build/` Directory to the Server

1. Copy the contents of the `build/` directory to your server's deployment folder. For example:
   ```bash
   scp -r build/ user@server-ip:/home/username/project-folder/
   ```
2. Ensure the destination folder matches the path specified in the NGINX configuration.

---

### Step 4: Configure NGINX

Update or create an NGINX configuration file to serve the React app.

#### Example NGINX Configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /home/username/project-folder/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

- **Key Points**:
  - `root`: Path to the `build/` directory on the server.
  - `try_files`: Redirects all unmatched routes to `index.html` for React Router to handle.

#### Reload NGINX to Apply Changes:
```bash
sudo systemctl reload nginx
```

---

### Step 5: Verify HTTPS

Since HTTPS is already configured using Let's Encrypt, ensure that:
- The domain name correctly points to the server.
- Certificates are valid and up to date.

---

## ✅ Testing the Deployment

1. Open the application in your browser:
   ```text
   https://yourdomain.com
   ```

2. Verify:
   - The homepage loads successfully.
   - Routes (e.g., `/about`, `/dashboard`) work without 404 errors.
   - HTTPS is active with a valid certificate.

---

## 🔧 Troubleshooting

### 404 Errors for React Routes
- Ensure the `try_files $uri /index.html;` directive is present in the NGINX configuration.

### File Not Found Errors
- Verify the correct path to the `build/` directory is specified in the NGINX configuration.

### Caching Issues
- If updates do not appear immediately, try the following:
  - Clear the browser cache.
  - Add cache-busting headers in the NGINX configuration:
    ```nginx
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        expires 6M;
        access_log off;
        add_header Cache-Control "public";
    }
    ```

---

## 📂 Directory Structure Notes

- **Placement**: The `build/` directory can be placed anywhere on the server. Ensure the `root` path in the NGINX configuration matches its location.
- **Dockerized NGINX**: If NGINX is running inside Docker containers, ensure the host path to the `build/` directory is correctly mapped into the container.

---

## ✉️ Contact Information

If you encounter any issues or have questions about the deployment process, please contact:

- **Neji Said**
- [nejis@ebos.com.cy]

---

This guide ensures a smooth deployment process for your React application. Happy deploying! 🚀
