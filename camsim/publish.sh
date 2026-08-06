#!/usr/bin/env bash
set -u

MEDIAMTX_HOST="${MEDIAMTX_HOST:-mediamtx}"
MEDIAMTX_PORT="${MEDIAMTX_PORT:-8554}"
VIDEOS_DIR="${VIDEOS_DIR:-/videos}"
OUTPUT_PATH="${OUTPUT_PATH:-combined}"

# Give mediamtx time to come up before the first publish attempt.
sleep 5

# Composite every prod_cam_*.mp4 into a single 1920x1080 grid and publish
# it as ONE rtsp stream, so ai-service only has to run inference once
# instead of once per camera.
mapfile -t FILES < <(
  { find "${VIDEOS_DIR}" -maxdepth 1 -iname 'prod_cam_*.mp4' | sort
    find "${VIDEOS_DIR}" -maxdepth 1 -iname 'Static_overhead_security_camer*.mp4' | sort; }
)
N=${#FILES[@]}

if [ "$N" -eq 0 ]; then
  echo "[camsim] no source videos found in ${VIDEOS_DIR}"
  exit 1
fi

# Square-ish grid so each cell's aspect ratio stays close to the 16:9
# source footage (cell_aspect = 16:9 * rows/cols, minimized when rows==cols).
COLS=$(awk -v n="$N" 'BEGIN{c=1; while(c*c<n) c++; print c}')
ROWS=$(( (N + COLS - 1) / COLS ))
CELL_W=$(( 1920 / COLS ))
CELL_H=$(( 1080 / ROWS ))
SLOTS=$(( COLS * ROWS ))

url="rtsp://${MEDIAMTX_HOST}:${MEDIAMTX_PORT}/${OUTPUT_PATH}"

while true; do
  INPUTS=()
  FILTERS=""
  LAYOUT=""

  for ((i=0; i<SLOTS; i++)); do
    if [ "$i" -lt "$N" ]; then
      INPUTS+=(-stream_loop -1 -i "${FILES[$i]}")
    else
      # Fewer videos than grid slots -> fill the rest with a static black tile.
      INPUTS+=(-f lavfi -i "color=c=black:s=${CELL_W}x${CELL_H}:r=25")
    fi
    FILTERS+="[${i}:v]fps=25,scale=${CELL_W}:${CELL_H}:force_original_aspect_ratio=decrease,pad=${CELL_W}:${CELL_H}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];"

    x=$(( (i % COLS) * CELL_W ))
    y=$(( (i / COLS) * CELL_H ))
    LAYOUT+="${x}_${y}"
    [ "$i" -lt "$((SLOTS-1))" ] && LAYOUT+="|"
  done

  LABELS=""
  for ((i=0; i<SLOTS; i++)); do LABELS+="[v${i}]"; done
  FILTERS+="${LABELS}xstack=inputs=${SLOTS}:layout=${LAYOUT}[out]"

  echo "[camsim] publishing ${N} camera(s) as one ${COLS}x${ROWS} grid -> ${url}"
  ffmpeg -re "${INPUTS[@]}" \
    -filter_complex "${FILTERS}" -map "[out]" -an \
    -c:v libx264 -preset ultrafast -tune zerolatency -g 50 \
    -f rtsp -rtsp_transport tcp "${url}"

  echo "[camsim] combined publisher exited, retrying in 2s..."
  sleep 2
done
