import { Model } from 'objection';

export class BaseModel extends Model {
  createdAt?: string;
  updatedAt?: string;

  static get modelPaths() {
    return [__dirname];
  }

  $beforeInsert() {
    const now = new Date().toISOString();
    this.createdAt = now;
    this.updatedAt = now;
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }
}
