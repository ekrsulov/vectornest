# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy built dist folder from builder
COPY --from=builder /app/dist ./dist

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 5173

# Serve the dist folder with SPA support
CMD ["serve", "-l", "5173", "-s", "dist"]
