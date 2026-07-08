import redis, json, time

class RedisPublisher:
  def __init__(self, redis_url: str):
    self._url = redis_url
    self._client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=5)

  def publish(self, channel: str, data: dict):
    for attempt in range(3):
      try: self._client.publish(channel, json.dumps(data)); return
      except Exception:
        if attempt < 2: time.sleep(0.5*(attempt+1)); self._client = redis.from_url(self._url, decode_responses=True)
