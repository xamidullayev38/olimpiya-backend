import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
  });

  const config = app.get(ConfigService);
  const isProd = config.get('NODE_ENV') === 'production';

  // ---------------------------------------------------------------
  // 1) HTTP xavfsizlik headerlari
  // ---------------------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  );

  // ---------------------------------------------------------------
  // 2) CORS - whitelist qilingan originlar
  // ---------------------------------------------------------------
  const allowedOrigins = (config.get<string>('CORS_ORIGINS') || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS: ruxsat etilmagan origin'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });

  app.use(compression());
  app.use(cookieParser());

  app.setGlobalPrefix(config.get<string>('API_PREFIX') || 'api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ---------------------------------------------------------------
  // 3) Global validatsiya
  // ---------------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ---------------------------------------------------------------
  // 4) Global xato filter
  // ---------------------------------------------------------------
  app.useGlobalFilters(new AllExceptionsFilter());

  // ---------------------------------------------------------------
  // 5) OpenAPI / Swagger Hujjatlashtirish (Phase 8)
  // ---------------------------------------------------------------
  if (!isProd || config.get('ENABLE_SWAGGER') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Olimpiya Backend Admin API')
      .setDescription(
        'Musobaqa/tadbir ishtirokchilarini akkreditatsiya qilish, QR-badge zona kirishi va ovqatlanish nazorati APIsi',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-Auth')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'Authorization' }, 'Device-Auth')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.enableShutdownHooks();

  const port = config.get<number>('PORT') || 4000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Olimpiya Backend Admin API ${await app.getUrl()} portida ishga tushdi (env: ${config.get('NODE_ENV')})`);
}

bootstrap();
