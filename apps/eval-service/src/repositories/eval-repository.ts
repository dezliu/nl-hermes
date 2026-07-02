import { EvalSetModel, EvalCaseModel, EvalRunModel, EvalResultModel } from '@hermes/orm-schemas';
import type { Knex } from 'knex';

export class EvalSetRepository {
  findAll() {
    return EvalSetModel.query().orderBy('updated_at', 'desc');
  }

  findById(id: string) {
    return EvalSetModel.query().findById(id).withGraphFetched('cases');
  }

  insert(data: Partial<EvalSetModel>, trx?: Knex.Transaction) {
    return EvalSetModel.query(trx).insert({
      id: crypto.randomUUID(),
      isPreset: false,
      ...data,
    });
  }

  patch(id: string, data: Partial<EvalSetModel>, trx?: Knex.Transaction) {
    return EvalSetModel.query(trx).patchAndFetchById(id, data);
  }

  delete(id: string, trx?: Knex.Transaction) {
    return EvalSetModel.query(trx).deleteById(id);
  }

  countCases(evalSetId: string) {
    return EvalCaseModel.query().where('eval_set_id', evalSetId).resultSize();
  }
}

export class EvalCaseRepository {
  listBySet(evalSetId: string) {
    return EvalCaseModel.query().where('eval_set_id', evalSetId).orderBy('sort_order');
  }

  findById(id: string) {
    return EvalCaseModel.query().findById(id);
  }

  insert(data: Partial<EvalCaseModel>, trx?: Knex.Transaction) {
    return EvalCaseModel.query(trx).insert({
      id: crypto.randomUUID(),
      sortOrder: 0,
      ...data,
    });
  }

  patch(id: string, data: Partial<EvalCaseModel>, trx?: Knex.Transaction) {
    return EvalCaseModel.query(trx).patchAndFetchById(id, data);
  }

  delete(id: string, trx?: Knex.Transaction) {
    return EvalCaseModel.query(trx).deleteById(id);
  }

  deleteBySet(evalSetId: string, trx?: Knex.Transaction) {
    return EvalCaseModel.query(trx).delete().where('eval_set_id', evalSetId);
  }
}

export class EvalRunRepository {
  findById(id: string) {
    return EvalRunModel.query().findById(id).withGraphFetched('results');
  }

  listBySet(evalSetId: string) {
    return EvalRunModel.query().where('eval_set_id', evalSetId).orderBy('created_at', 'desc');
  }

  insert(data: Partial<EvalRunModel>, trx?: Knex.Transaction) {
    return EvalRunModel.query(trx).insert({
      id: crypto.randomUUID(),
      status: 'pending',
      progress: 0,
      ...data,
    });
  }

  patch(id: string, data: Partial<EvalRunModel>, trx?: Knex.Transaction) {
    return EvalRunModel.query(trx).patchAndFetchById(id, data);
  }
}

export class EvalResultRepository {
  insert(data: Partial<EvalResultModel>, trx?: Knex.Transaction) {
    return EvalResultModel.query(trx).insert({
      id: crypto.randomUUID(),
      ...data,
    });
  }

  listByRun(evalRunId: string) {
    return EvalResultModel.query().where('eval_run_id', evalRunId);
  }
}
