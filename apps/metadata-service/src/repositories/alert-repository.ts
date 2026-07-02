import { AlertModel } from '@hermes/orm-schemas';
import type { AlertLevel, AlertStatus } from '@hermes/contracts';

export type AlertFilters = {
  status?: AlertStatus;
  level?: AlertLevel;
  type?: string;
  from?: string;
  to?: string;
};

export class AlertRepository {
  async findAll(filters: AlertFilters = {}): Promise<AlertModel[]> {
    let q = AlertModel.query().orderBy('created_at', 'desc');
    if (filters.status) q = q.where('status', filters.status);
    if (filters.level) q = q.where('level', filters.level);
    if (filters.type) q = q.where('type', filters.type);
    if (filters.from) q = q.where('created_at', '>=', filters.from);
    if (filters.to) q = q.where('created_at', '<=', filters.to);
    return q;
  }

  async findById(id: string): Promise<AlertModel | undefined> {
    return AlertModel.query().findById(id);
  }

  async countOpen(levels?: AlertLevel[]): Promise<number> {
    let q = AlertModel.query().where('status', 'open');
    if (levels?.length) q = q.whereIn('level', levels);
    return q.resultSize();
  }

  async insert(data: Partial<AlertModel>): Promise<AlertModel> {
    return AlertModel.query().insert({
      id: crypto.randomUUID(),
      status: 'open',
      ...data,
    });
  }

  async patch(id: string, data: Partial<AlertModel>): Promise<AlertModel> {
    return AlertModel.query().patchAndFetchById(id, data);
  }

  async patchMany(ids: string[], data: Partial<AlertModel>): Promise<number> {
    return AlertModel.query().whereIn('id', ids).patch(data);
  }

  async findActiveByType(type: string): Promise<AlertModel | undefined> {
    return AlertModel.query()
      .where('type', type)
      .whereIn('status', ['open', 'acknowledged'])
      .orderBy('created_at', 'desc')
      .first();
  }
}
