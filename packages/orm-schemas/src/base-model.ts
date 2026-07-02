import { Model, snakeCaseMappers } from 'objection';

export class BaseModel extends Model {
  createdAt?: string;
  updatedAt?: string;

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get modelPaths() {
    return [__dirname];
  }

  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
    if (!this.updatedAt) this.updatedAt = now;
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString().slice(0, 23).replace('T', ' ');
  }
}
