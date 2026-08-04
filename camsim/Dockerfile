FROM alpine:3.19

RUN apk add --no-cache ffmpeg bash

COPY publish.sh /publish.sh
RUN chmod +x /publish.sh

ENTRYPOINT ["/publish.sh"]
