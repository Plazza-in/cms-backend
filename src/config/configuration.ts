export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    enable: (process.env.DB_ENABLE ?? 'true') !== 'false',
    url: process.env.DATABASE_URL,
    sslCertPath: process.env.SSL_CERT_PATH,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'cms',
  },
  erpDatabase: {
    enable: (process.env.ERP_DB_ENABLE ?? 'true') !== 'false',
    url: process.env.ERP_DATABASE_URL,
    sslCertPath: process.env.ERP_SSL_CERT_PATH,
    host: process.env.ERP_DB_HOST || 'localhost',
    port: parseInt(process.env.ERP_DB_PORT ?? '5432', 10),
    username: process.env.ERP_DB_USERNAME || 'postgres',
    password: process.env.ERP_DB_PASSWORD || 'postgres',
    name: process.env.ERP_DB_NAME || 'plazza_erp',
  },
  authService: {
    url: process.env.AUTH_SERVICE_URL,
  },
  adminGuard: {
    enabled: (process.env.ADMIN_GUARD_ENABLED ?? 'true') !== 'false',
  },
});


