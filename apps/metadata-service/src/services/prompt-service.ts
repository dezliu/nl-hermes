import type { Logger } from '@hermes/shared';
import type { Repositories } from '../repositories/index.js';

export class PromptService {
  constructor(
    private readonly repos: Repositories,
    private readonly logger: Logger,
  ) {}

  listRoles() {
    return this.repos.prompt.listRoles();
  }

  listVersions(roleId?: string | null) {
    return this.repos.prompt.listVersions(roleId);
  }

  async getActive(roleId?: string | null) {
    const specific = await this.repos.prompt.findActive(roleId ?? null);
    if (specific) return specific;
    if (roleId) return this.repos.prompt.findActive(null);
    return null;
  }

  async saveVersion(
    input: { roleId?: string | null; persona: string; constraints: string; createdBy?: string },
    traceId?: string,
  ) {
    const row = await this.repos.prompt.createVersion(input);
    await this.repos.audit.create({
      actorId: input.createdBy,
      action: 'prompt.create_version',
      resourceType: 'prompt_version',
      resourceId: row.id,
      afterSnapshot: { roleId: input.roleId, version: row.version },
      traceId,
    });
    this.logger.info('prompt.version.created', { traceId, version: row.version, roleId: input.roleId });
    return row;
  }

  async rollback(versionId: string, actorId?: string, traceId?: string) {
    const row = await this.repos.prompt.activateVersion(versionId);
    if (row) {
      await this.repos.audit.create({
        actorId,
        action: 'prompt.rollback',
        resourceType: 'prompt_version',
        resourceId: versionId,
        traceId,
      });
    }
    return row;
  }
}
