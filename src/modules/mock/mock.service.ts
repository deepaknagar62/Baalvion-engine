import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../events/event-bus.service';
import { runWithTenant } from '../../core/tenant/tenant-context';
import { v4 as uuidv4 } from 'uuid';

interface EventScenario {
  type: string;
  weight: number;
  generatePayload: () => Record<string, any>;
}

@Injectable()
export class MockService {
  private readonly logger = new Logger(MockService.name);
  private activeSimulations: Map<string, NodeJS.Timeout> = new Map();

  private readonly eventScenarios: EventScenario[] = [
    {
      type: 'user.login',
      weight: 35,
      generatePayload: () => ({
        userId: `user-${this.randomInt(1, 1000)}`,
        device: this.randomItem(['mobile', 'desktop', 'tablet']),
        ip: this.randomIp(),
      }),
    },
    {
      type: 'user.signup',
      weight: 10,
      generatePayload: () => ({
        userId: `user-${uuidv4()}`,
        plan: this.randomItem(['free', 'pro']),
        email: `user${this.randomInt(1, 9999)}@example.com`,
      }),
    },
    {
      type: 'user.logout',
      weight: 20,
      generatePayload: () => ({
        userId: `user-${this.randomInt(1, 1000)}`,
        sessionDuration: this.randomInt(60, 7200),
      }),
    },
    {
      type: 'page.view',
      weight: 40,
      generatePayload: () => ({
        page: this.randomItem(['/home', '/products', '/checkout', '/profile']),
        userId: `user-${this.randomInt(1, 1000)}`,
        duration: this.randomInt(5, 300),
      }),
    },
    {
      type: 'order.placed',
      weight: 8,
      generatePayload: () => ({
        orderId: uuidv4(),
        amount: this.randomFloat(10, 500),
        items: this.randomInt(1, 5),
        userId: `user-${this.randomInt(1, 1000)}`,
      }),
    },
    {
      type: 'system.error',
      weight: 3,
      generatePayload: () => ({
        code: this.randomItem(['ERR_001', 'ERR_002', 'ERR_003']),
        message: 'Simulated system error',
        service: this.randomItem(['auth', 'payments', 'notifications']),
      }),
    },
    {
      type: 'system.alert',
      weight: 2,
      generatePayload: () => ({
        level: this.randomItem(['warning', 'critical']),
        message: 'Simulated alert',
        metric: this.randomItem(['cpu', 'memory', 'queue_depth']),
      }),
    },
  ];

  constructor(private readonly eventBusService: EventBusService) {}

  startSimulation(tenantId: string, eventsPerSecond: number, durationSeconds?: number): any {
    if (this.activeSimulations.has(tenantId)) {
      throw new Error(`Simulation already running for tenant ${tenantId}`);
    }

    const intervalMs = 1000 / eventsPerSecond;
    const startedAt = new Date();

    const interval = setInterval(async () => {
      try {
        const scenario = this.weightedRandom(this.eventScenarios);
        const payload = scenario.generatePayload();

        await runWithTenant(tenantId, async () => {
          await this.eventBusService.emit(scenario.type, payload, 'mock-generator');
        });
      } catch (error) {
        this.logger.error(`Mock event generation error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, intervalMs);

    this.activeSimulations.set(tenantId, interval);

    if (durationSeconds) {
      setTimeout(() => {
        this.stopSimulation(tenantId);
      }, durationSeconds * 1000);
    }

    this.logger.log(`Started simulation for tenant ${tenantId}: ${eventsPerSecond} events/sec`);

    return {
      simulationId: tenantId,
      tenantId,
      eventsPerSecond,
      startedAt,
      durationSeconds,
    };
  }

  stopSimulation(tenantId: string): any {
    const interval = this.activeSimulations.get(tenantId);

    if (!interval) {
      throw new Error(`No active simulation for tenant ${tenantId}`);
    }

    clearInterval(interval);
    this.activeSimulations.delete(tenantId);

    this.logger.log(`Stopped simulation for tenant ${tenantId}`);

    return {
      stopped: true,
      tenantId,
    };
  }

  stopAllSimulations(): any {
    const tenantIds = Array.from(this.activeSimulations.keys());

    for (const tenantId of tenantIds) {
      this.stopSimulation(tenantId);
    }

    return {
      stopped: tenantIds.length,
      tenantIds,
    };
  }

  getActiveSimulations(): string[] {
    return Array.from(this.activeSimulations.keys());
  }

  async generateSingleEvent(tenantId: string, eventType?: string): Promise<any> {
    let scenario: EventScenario | undefined;

    if (eventType) {
      scenario = this.eventScenarios.find(s => s.type === eventType);
      if (!scenario) {
        throw new Error(`Unknown event type: ${eventType}`);
      }
    } else {
      scenario = this.weightedRandom(this.eventScenarios);
    }

    const payload = scenario.generatePayload();

    const event = await runWithTenant(tenantId, async () => {
      return this.eventBusService.emit(scenario.type, payload, 'mock-generator');
    });

    return event;
  }

  async runBurst(tenantId: string, count: number, eventType?: string): Promise<any[]> {
    const events: any[] = [];

    for (let i = 0; i < count; i++) {
      const event = await this.generateSingleEvent(tenantId, eventType);
      events.push(event);
    }

    this.logger.log(`Generated burst of ${count} events for tenant ${tenantId}`);

    return events;
  }

  private weightedRandom(scenarios: EventScenario[]): EventScenario {
    const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const scenario of scenarios) {
      random -= scenario.weight;
      if (random <= 0) {
        return scenario;
      }
    }

    return scenarios[0];
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
  }

  private randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private randomIp(): string {
    return `${this.randomInt(1, 255)}.${this.randomInt(0, 255)}.${this.randomInt(0, 255)}.${this.randomInt(1, 255)}`;
  }
}
