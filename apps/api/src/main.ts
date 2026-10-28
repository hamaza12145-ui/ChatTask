import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Client } from 'pg';
import * as express from 'express';
import * as path from 'path';

async function ensureDatabaseExists() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'root';
  const dbName = process.env.DB_NAME || 'taskcom';

  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      Logger.log(`Database '${dbName}' not found. Creating...`, 'Bootstrap');
      await client.query(`CREATE DATABASE "${dbName}"`);
      Logger.log(`Database '${dbName}' created.`, 'Bootstrap');
    }
  } catch (err: any) {
    Logger.error(`Error verifying/creating database: ${err.message}`, 'Bootstrap');
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  await ensureDatabaseExists();

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
    .setTitle('TaskCom Team Chat & Task Management API')
    .setDescription('Application API featuring team chat, department channels, real-time messaging, and comprehensive task management')
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
