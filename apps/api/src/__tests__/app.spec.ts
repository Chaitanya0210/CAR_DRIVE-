import { describe, it, expect } from 'vitest';
import { AppService } from '../app.service';
import { AppController } from '../app.controller';

describe('AppController', () => {
  it('returns healthy status from AppService', () => {
    const service = new AppService();
    const controller = new AppController(service);

    const health = controller.getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('groupdrive-api');
    expect(health.timestamp).toBeDefined();
  });
});
