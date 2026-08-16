#!/usr/bin/env bash
set -u

MEDIAMTX_HOST="${MEDIAMTX_HOST:-mediamtx}"
MEDIAMTX_PORT="${MEDIAMTX_PORT:-8554}"
VIDEOS_DIR="${VIDEOS_DIR:-/videos}"
OUTPUT_PATH="${OUTPUT_PATH:-combined}"
VIDEO_FILE="${VIDEO_FILE:-${VIDEOS_DIR}/skripsi_prod.mp4}"

# Give mediamtx time to come up before the first publish attempt.
sleep 5

if [ ! -f "${VIDEO_FILE}" ]; then
  echo "[camsim] source video not found: ${VIDEO_FILE}"
  exit 1
fi

url="rtsp://${MEDIAMTX_HOST}:${MEDIAMTX_PORT}/${OUTPUT_PATH}"

while true; do
  echo "[camsim] publishing ${VIDEO_FILE} -> ${url}"
  ffmpeg -re -stream_loop -1 -i "${VIDEO_FILE}" -an \
    -c:v libx264 -preset ultrafast -tune zerolatency -g 50 \
    -f rtsp -rtsp_transport tcp "${url}"

  echo "[camsim] publisher exited, retrying in 2s..."
  sleep 2
done
