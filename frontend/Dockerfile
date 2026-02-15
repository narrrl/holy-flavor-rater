# Use an official Node runtime as a parent image
FROM node:lts-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the port the app runs on
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host"]
