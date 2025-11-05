# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for efficient caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

RUN npx prisma generate
# Build the project
RUN npm run build

# Stage 2: Run
FROM node:20-alpine AS runner
WORKDIR /app

# Copy only built files and necessary assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies
RUN npm ci 

# Expose Nest default port
EXPOSE 3008

# Run the app
CMD ["node", "dist/main.js"]
