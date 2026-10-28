import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Client } from 'pg';
import * as express from 'express';
import * as path from 'path';

async function ensureControlDatabaseExists() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '';
  const controlDbName = process.env.DB_CONTROL_NAME || 'taskcom';

  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [controlDbName]);
    if (res.rowCount === 0) {
      Logger.log(`Control database '${controlDbName}' not found. Creating...`, 'Bootstrap');
      await client.query(`CREATE DATABASE "${controlDbName}"`);
      Logger.log(`Control database '${controlDbName}' created.`, 'Bootstrap');
    }
  } catch (err: any) {
    Logger.error(`Error verifying/creating control database: ${err.message}`, 'Bootstrap');
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  await ensureControlDatabaseExists();

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Serve local uploads statically for development driver
  const uploadsPath = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_PATH || './uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Swagger / OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Team Chat + Task Management SaaS API')
    .setDescription('Multi-tenant SaaS API featuring WhatsApp-style chat with complete task management')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  Logger.log(`API running on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`Swagger documentation available at http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap();
