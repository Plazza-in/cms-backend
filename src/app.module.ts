import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from './auth.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ContentModule } from './content.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { HealthModule } from './health.module';
import { HealthController } from './health.controller';
import { CatalogueModule } from './catalogue/catalogue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validationSchema }),
    ...(process.env.DB_ENABLE === 'false'
      ? []
      : [
          TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
              const url = config.get<string>('database.url');
              const sslCertPath = config.get<string>('database.sslCertPath');
              if (url) {
                return {
                  type: 'postgres',
                  url,
                  ssl: sslCertPath
                    ? { rejectUnauthorized: true, ca: require('fs').readFileSync(sslCertPath).toString() }
                    : undefined,
                  autoLoadEntities: true,
                  synchronize: false,
                } as const;
              }
              return {
                type: 'postgres',
                host: config.get<string>('database.host'),
                port: config.get<number>('database.port'),
                username: config.get<string>('database.username'),
                password: config.get<string>('database.password'),
                database: config.get<string>('database.name'),
                autoLoadEntities: true,
                synchronize: false,
              } as const;
            },
          }),
        ]),
    UsersModule,
    AuthModule,
    ContentModule,
    HealthModule,
    CatalogueModule,
  ],
  controllers: [AppController, UsersController, AuthController, ContentController, HealthController],
  providers: [AppService, UsersService, AuthService, ContentService],
})
export class AppModule {}
