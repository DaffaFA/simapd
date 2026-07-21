#!/bin/bash

set +e

echo "Starting infrastructure services (Postgres, Redis)..."
docker compose up -d postgres redis rustfs

echo "Waiting for services to be ready..."
sleep 5

# Track PIDs in an array for cleaner cleanup
PIDS=()

echo "Starting Backend (NestJS)..."
cd backend-nest
npm install
exec npm run start:dev &
PIDS+=($!)
cd ..

echo "Starting Frontend (Next.js)..."
cd frontend
npm install
exec npm run dev &
PIDS+=($!)
cd ..

echo "Starting AI Service (Demo Mode for Dev)..."
cd ai-service

# 1. Initialize Conda for this script execution
# Adjust this path if your conda installation is in a custom location (e.g., miniconda3)
CONDA_PATH=$(conda info --base)/etc/profile.d/conda.sh
if [ -f "$CONDA_PATH" ]; then
    source "$CONDA_PATH"
else
    echo "Error: Could not find conda.sh. Ensure conda is installed and in your PATH."
    exit 1
fi

# 2. Check if the environment exists, create it if it doesn't
ENV_NAME="ai-service-env"
if ! conda env list | grep -q "$ENV_NAME"; then
    echo "Creating conda environment '$ENV_NAME' with Python 3.10..."
    conda create -y -n "$ENV_NAME" python=3.10
fi

# 3. Activate and install dependencies
conda activate "$ENV_NAME"
pip install -r requirements.txt

export DEMO_MODE=true
export VIDEO_DIR="../videos"
export DEMO_LOOP=true
export REDIS_URL="redis://localhost:6379"
python main.py &
PIDS+=($!)
cd ..

echo "========================================="
echo "Development environment is starting up!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo "Press Ctrl+C to stop all services."
echo "========================================="

cleanup() {
    echo ""
    echo "Stopping all services..."
    
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    
    docker compose stop postgres redis
    echo "Cleanup complete. Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait