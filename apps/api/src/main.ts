import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vibe Store API')
    .setDescription(
      'API para análisis de pre-factibilidad comercial de locales físicos.',
    )
    .setVersion('0.1.0')
    .addTag('Health', 'Operación de estado del servicio')
    .addTag('Analysis', 'Operaciones de análisis comercial')
    .addTag('Report', 'Reporte HTML imprimible por requestId')
    .addTag('Chat', 'Captura conversacional de dirección, rubro y ticket promedio')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}/api`);
  console.log(`Swagger docs on http://localhost:${port}/docs`);
}

void bootstrap();
