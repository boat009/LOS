export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://los_user:los_password@localhost:5432/los_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USER || 'los_user',
    password: process.env.DB_PASS || 'los_password',
    database: process.env.DB_NAME || 'los_db',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://:los_redis_password@localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || 'los_redis_password',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://los_rabbit:los_rabbit_password@localhost:5672',
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    accessKey: process.env.MINIO_ACCESS_KEY || 'los_minio_user',
    secretKey: process.env.MINIO_SECRET_KEY || 'los_minio_password',
    bucket: process.env.MINIO_BUCKET || 'los-documents',
    useSSL: process.env.MINIO_USE_SSL === 'true',
  },

  jwt: {
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '8h',
    privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem',
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem',
    privateKey: process.env.JWT_PRIVATE_KEY || '',
    publicKey: process.env.JWT_PUBLIC_KEY || '',
  },

  mfa: {
    issuer: process.env.MFA_ISSUER || 'LOS-System',
    otpTtl: parseInt(process.env.OTP_TTL, 10) || 300, // 5 minutes
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION, 10) || 30, // minutes
    sessionIdleTimeout: parseInt(process.env.SESSION_IDLE_TIMEOUT, 10) || 30, // minutes
    draftExpiry: parseInt(process.env.DRAFT_EXPIRY_HOURS, 10) || 72, // hours
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
  },

  saleSystem: {
    callbackUrl: process.env.SALE_CALLBACK_URL || 'http://localhost:4000/api/callbacks',
    hmacSecret: process.env.SALE_HMAC_SECRET || 'sale-hmac-secret-change-in-production',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@los.local',
  },

  sms: {
    apiUrl: process.env.SMS_API_URL || '',
    apiKey: process.env.SMS_API_KEY || '',
  },

  rateLimit: {
    loginTtl: 60000, // 1 minute
    loginMax: 5,
    apiTtl: 60000,
    apiMax: 100,
  },
});
