import { Router } from 'express';
import os from 'os';

const router = Router();

interface HealthCheck {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  system: {
    platform: string;
    memory: {
      free: number;
      total: number;
      used: number;
      percentage: number;
    };
  };
}

router.get('/', (req, res) => {
  const freeMemory = os.freemem();
  const totalMemory = os.totalmem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

  const healthCheck: HealthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '0.1.0',
    system: {
      platform: os.platform(),
      memory: {
        free: Math.round(freeMemory / 1024 / 1024),
        total: Math.round(totalMemory / 1024 / 1024),
        used: Math.round(usedMemory / 1024 / 1024),
        percentage: memoryPercentage
      }
    }
  };

  res.json(healthCheck);
});

router.get('/ping', (req, res) => {
  res.json({ pong: true });
});

export default router;