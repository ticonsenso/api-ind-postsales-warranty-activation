import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

const HEAP_LIMIT_BYTES = 512 * 1024 * 1024;

/**
 * Sondas de salud para el orquestador de contenedores (liveness y readiness).
 *
 * @author Cristian Brito
 * @since 2026-09-18
 */
@ApiTags('health')
@SkipThrottle({ default: true, strict: true })
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator
  ) {}

  /**
   * Indica que el proceso está vivo; si falla, el orquestador lo reinicia.
   *
   * @returns Estado de la sonda de liveness
   */
  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  /**
   * Indica que la instancia puede recibir tráfico; si falla, se la retira del balanceo.
   *
   * @returns Estado de la sonda de readiness
   */
  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.memory.checkHeap('memory_heap', HEAP_LIMIT_BYTES)]);
  }
}
