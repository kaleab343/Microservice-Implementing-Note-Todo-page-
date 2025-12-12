FROM node:18-alpine

WORKDIR /app

# Install protobuf compiler and tools
RUN apk add --no-cache \
    protobuf \
    protobuf-dev \
    curl \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy proto files
COPY ../../proto ./proto/

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Generate gRPC client code
RUN npm run proto:generate || echo "Proto generation will be handled at runtime"

# Expose both REST and gRPC ports
EXPOSE 8080 9090

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the hybrid gateway
CMD ["npm", "start"]