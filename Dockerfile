# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /Task MANAGEMENT

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["node", "Server/Node.js"]
