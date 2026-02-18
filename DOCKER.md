## Docker

You can run VectorNest in Docker for easy deployment and isolated environments.

### Quick Start

```bash
# Build and run with Docker Compose
docker compose up

# The application will be available at http://localhost:5173
```

### Configuration

All Docker settings are fully parameterized with sensible defaults. You can customize them via environment variables:

```bash
# Copy the example env file
cp .env.example .env

# Edit .env to customize
nano .env
```

**Common configurations:**

```bash
# Change the port
export DOCKER_PORT=3000
docker compose up

# Use a different image name/tag
export DOCKER_IMAGE_NAME=my-vectornest
export DOCKER_IMAGE_TAG=v1.0.0
docker compose up

# Set custom container name
export DOCKER_CONTAINER_NAME=my-app-instance
docker compose up
```

**Available environment variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOCKER_PORT` | `5173` | External port mapping |
| `DOCKER_INTERNAL_PORT` | `5173` | Internal container port |
| `DOCKER_IMAGE_NAME` | `vectornest` | Docker image name |
| `DOCKER_IMAGE_TAG` | `latest` | Docker image tag |
| `DOCKER_CONTAINER_NAME` | `vectornest` | Container instance name |
| `NODE_ENV` | `production` | Node environment |
| `DOCKER_RESTART_POLICY` | `unless-stopped` | Container restart policy |
| `DOCKER_HEALTH_INTERVAL` | `30s` | Health check interval |
| `DOCKER_HEALTH_TIMEOUT` | `10s` | Health check timeout |
| `DOCKER_HEALTH_RETRIES` | `3` | Health check retries |
| `DOCKER_HEALTH_START_PERIOD` | `40s` | Health check start period |

### Docker Commands

```bash
# Build the Docker image
docker build -t vectornest .

# Run the container
docker run -p 5173:5173 vectornest

# Run with Docker Compose
docker compose up -d          # Start in background
docker compose down           # Stop and remove containers
docker compose logs -f        # View logs
```

### Notes

- The container uses Bun as the runtime and package manager
- Port `5173` is exposed for the preview server
- The production build is served via `bun run preview`
- All node_modules and build artifacts are optimized via multi-stage build
