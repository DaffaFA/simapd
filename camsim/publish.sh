#!/usr/bin/env bash
set -u

MEDIAMTX_HOST="${MEDIAMTX_HOST:-mediamtx}"
MEDIAMTX_PORT="${MEDIAMTX_PORT:-8554}"
VIDEOS_DIR="${VIDEOS_DIR:-/videos}"

# Give mediamtx time to come up before the first publish attempt.
sleep 5

publish_loop() {
  local file="$1"
  local path="$2"
  local url="rtsp://${MEDIAMTX_HOST}:${MEDIAMTX_PORT}/${path}"

  while true; do
    echo "[camsim] publishing ${file} -> ${url}"
    ffmpeg -re -stream_loop -1 -i "${file}" -c copy -f rtsp "${url}"
    echo "[camsim] ${path} publisher exited, retrying in 2s..."
    sleep 2
  done
}

publish_loop "${VIDEOS_DIR}/prod_cam_01.mp4" cam1 &
publish_loop "${VIDEOS_DIR}/prod_cam_02.mp4" cam2 &
publish_loop "${VIDEOS_DIR}/prod_cam_03.mp4" cam3 &

wait
