export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    name: process.env.DATABASE_NAME ?? 'simapd',
    user: process.env.DATABASE_USER ?? 'simapd',
    password: process.env.DATABASE_PASSWORD ?? 'simapd',
  },
  redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' },
});
