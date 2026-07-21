#!/bin/bash
set -e

echo "Building and starting all services for deployment..."
docker-compose up --build -d

echo "========================================="
echo "Deployment environment is starting up!"
echo "Access the application via NGINX at http://localhost"
echo "To view logs, run: docker-compose logs -f"
echo "To stop, run: docker-compose down"
echo "========================================="
