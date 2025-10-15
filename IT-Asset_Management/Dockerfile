# Use the official lightweight Python image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file first (for caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app code
COPY . .

# Tell Cloud Run what default port to listen on (can be overridden by platform)
ENV PORT=8000

# Expose the default port (informational)
EXPOSE 8000

# Copy entrypoint script and make executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Use entrypoint to print debug info then start the app (binds to $PORT)
ENTRYPOINT ["/entrypoint.sh"]
