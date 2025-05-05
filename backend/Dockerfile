# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables to prevent Python from writing .pyc files and to buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Accept build arguments for S3 bucket name
ARG S3_BUCKET_NAME
ENV S3_BUCKET_NAME=${S3_BUCKET_NAME}

# Create and set the working directory in the container
WORKDIR /app

# Copy requirements files first (for caching dependencies)
COPY backend/requirements-resolved.txt /app/requirements-resolved.txt

# Install dependencies
RUN pip install --upgrade pip && \
    pip install -r /app/requirements-resolved.txt

# Copy the backend source code into the container
COPY backend/ /app/

# Expose the port your app runs on
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
