# Melodiq Server

Local server for the Melodiq song library. 

## Deployment with Docker Compose

This is the recommended way to deploy the server for efficient and isolated usage.

### 1. Prerequistes
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### 2. Configuration
The server expects a `config.json` in its directory. If it doesn't exist, it will be generated automatically on the first start inside the container.

### 3. Usage

1. **Mount your Music Library**:
   Edit `docker-compose.yml` and add your local music directories to the `volumes` section.
   
   ```yaml
   volumes:
     - ./config.json:/app/config.json
     - /path/to/your/music:/music:ro
   ```

2. **Start the server**:
   ```bash
   docker-compose up -d
   ```

3. **Access the UI**:
   - HTTP: `http://localhost:3000`
   - HTTPS: `https://localhost:3001` (Accept the self-signed certificate warning)

4. **Add Library Folders**:
   Once in the UI, use the "Add" button to add the mounted container paths (e.g., `/music`).

### Manual Setup (Node.js)

1. `cd server`
2. `npm install`
3. `npm start`
