import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'API Root Health Check' })
  getRoot() {
    return {
      status: 'online',
      service: 'Billing SaaS REST API',
      version: '1.0.0',
      message: 'Multi-tenant grocery billing & inventory management API is running smoothly.',
      documentation: '/api/docs',
      apiPrefix: '/api/v1',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health Check' })
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
