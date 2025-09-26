import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  DB_ENABLE: Joi.string().valid('true', 'false').default('true'),
  DATABASE_URL: Joi.string().uri().optional(),
  SSL_CERT_PATH: Joi.string().optional(),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().allow('').default('postgres'),
  DB_NAME: Joi.string().default('cms'),
  ERP_DB_ENABLE: Joi.string().valid('true', 'false').default('true'),
  ERP_DATABASE_URL: Joi.string().uri().optional(),
  ERP_SSL_CERT_PATH: Joi.string().optional(),
  ERP_DB_HOST: Joi.string().default('localhost'),
  ERP_DB_PORT: Joi.number().default(5432),
  ERP_DB_USERNAME: Joi.string().default('postgres'),
  ERP_DB_PASSWORD: Joi.string().allow('').default('postgres'),
  ERP_DB_NAME: Joi.string().default('plazza_erp'),
});


