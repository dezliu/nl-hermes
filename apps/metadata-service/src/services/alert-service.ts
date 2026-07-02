import type { Logger } from '@hermes/shared';
import type { AlertLevel, AlertRecord, AlertStatus } from '@hermes/contracts';
import { AlertRepository, type AlertFilters } from '../repositories/alert-repository.js';

export type CreateAlertInput = {
  type: string;
  level: AlertLevel;
  title: string;
  message: string;
  refType?: string;
  refId?: string;
};

export class AlertService {
  constructor(
    private readonly repo: AlertRepository,
    private readonly logger: Logger,
  ) {}

  async list(filters: AlertFilters): Promise<AlertRecord[]> {
    const items = await this.repo.findAll(filters);
    return items.map((a) => this.toRecord(a));
  }

  async get(id: string): Promise<AlertRecord | null> {
    const item = await this.repo.findById(id);
    return item ? this.toRecord(item) : null;
  }

  async countUnread(): Promise<number> {
    return this.repo.countOpen(['warning', 'error', 'critical']);
  }

  async create(input: CreateAlertInput): Promise<AlertRecord> {
    const item = await this.repo.insert(input);
    this.logger.info('alert.created', { type: input.type, level: input.level, id: item.id });
    return this.toRecord(item);
  }

  async createIfAbsent(input: CreateAlertInput): Promise<AlertRecord | null> {
    const existing = await this.repo.findActiveByType(input.type);
    if (existing) return this.toRecord(existing);
    return this.create(input);
  }

  async updateStatus(
    id: string,
    status: AlertStatus,
    actorId?: string,
    resolutionNote?: string,
  ): Promise<AlertRecord | null> {
    const current = await this.repo.findById(id);
    if (!current) return null;

    const patch: Record<string, unknown> = { status };
    if (status === 'resolved') {
      patch.resolvedAt = new Date().toISOString().slice(0, 23).replace('T', ' ');
      patch.resolvedBy = actorId ?? null;
      if (resolutionNote) {
        patch.message = `${current.message}\n[处理备注] ${resolutionNote}`;
      }
    }
    const item = await this.repo.patch(id, patch);
    this.logger.info('alert.updated', { id, status });
    return item ? this.toRecord(item) : null;
  }

  async batchAcknowledge(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    return this.repo.patchMany(ids, { status: 'acknowledged' });
  }

  private toRecord(a: {
    id: string;
    type: string;
    level: AlertLevel;
    title: string;
    message: string;
    refType?: string | null;
    refId?: string | null;
    status: AlertStatus;
    createdAt?: string;
    resolvedAt?: string | null;
    resolvedBy?: string | null;
  }): AlertRecord {
    return {
      id: a.id,
      type: a.type,
      level: a.level,
      title: a.title,
      message: a.message,
      refType: a.refType,
      refId: a.refId,
      status: a.status,
      createdAt: a.createdAt,
      resolvedAt: a.resolvedAt,
      resolvedBy: a.resolvedBy,
    };
  }
}
