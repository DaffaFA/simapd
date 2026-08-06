FROM python:3.11-slim
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
# CPU-only torch/torchvision first: ultralytics otherwise pulls the default
# CUDA build (~2GB of nvidia-* wheels) that this laptop can't use anyway.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.3.1 torchvision==0.18.1 \
 && pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p models captures
CMD ["python", "main.py"]
