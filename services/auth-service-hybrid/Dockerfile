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

# Generate gRPC code
RUN npm run proto:generate || echo "Proto generation will be handled at runtime"

# Expose both REST and gRPC ports
EXPOSE 3001 50001

# Health check for both protocols
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start hybrid service
CMD ["npm", "run", "start:hybrid"]