import * as Joi from 'joi';

/**
 * Server ishga tushishidan oldin barcha muhim (ayniqsa xavfsizlik) muhit o'zgaruvchilari
 * mavjudligini va minimal talablarga javob berishini tekshiradi. Talab bajarilmasa -
 * server umuman ishga tushmaydi (fail-fast) - bu productionda zaif/yo'q maxfiy kalit bilan
 * ishga tushib qolishning oldini oladi.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().optional(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  QR_TOKEN_SECRET: Joi.string().min(32).required(),
  QR_TOKEN_EXPIRES_IN: Joi.string().default('730d'),

  DEVICE_TOKEN_SECRET: Joi.string().min(32).required(),
  DEVICE_TOKEN_EXPIRES_IN: Joi.string().default('12h'),

  OFFLINE_PACKAGE_SECRET: Joi.string().min(32).optional(),
  PINFL_ENCRYPTION_SECRET: Joi.string().min(32).required(),

  ARGON2_MEMORY_COST: Joi.number().default(19456),
  ARGON2_TIME_COST: Joi.number().default(2),
  ARGON2_PARALLELISM: Joi.number().default(1),

  LOGIN_MAX_ATTEMPTS: Joi.number().default(5),
  LOGIN_LOCKOUT_MINUTES: Joi.number().default(15),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(120),

  UPLOAD_DIR: Joi.string().default('./uploads'),
  BADGE_OUTPUT_DIR: Joi.string().default('./storage/badges'),
})
  // Turli maqsadlar uchun kalitlar bir-biridan farqli bo'lishini qo'shimcha tekshiramiz
  .custom((value, helpers) => {
    const secrets = [
      value.JWT_ACCESS_SECRET,
      value.JWT_REFRESH_SECRET,
      value.QR_TOKEN_SECRET,
      value.DEVICE_TOKEN_SECRET,
      value.PINFL_ENCRYPTION_SECRET,
    ];
    const unique = new Set(secrets);
    if (unique.size !== secrets.length) {
      return helpers.error('any.custom', {
        message:
          'JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, QR_TOKEN_SECRET, DEVICE_TOKEN_SECRET va PINFL_ENCRYPTION_SECRET bir-biridan FARQLI bo\'lishi SHART',
      });
    }
    return value;
  });
