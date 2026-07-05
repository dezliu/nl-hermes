import type { ReportArtifact, ReportSpec } from '@hermes/contracts';
import { ReportArtifactModel } from '@hermes/orm-schemas';

export class ReportArtifactRepository {
  constructor(private readonly enabled: boolean) {}

  private memory = new Map<string, {
    id: string;
    messageId?: string;
    userId: string;
    spec: ReportSpec;
    artifact: ReportArtifact;
  }>();

  async save(input: {
    id: string;
    messageId?: string;
    userId: string;
    spec: ReportSpec;
    artifact: ReportArtifact;
  }): Promise<void> {
    if (!this.enabled) {
      this.memory.set(input.id, input);
      return;
    }
    await ReportArtifactModel.query().insert({
      id: input.id,
      messageId: input.messageId ?? null,
      userId: input.userId,
      specJson: input.spec as unknown as Record<string, unknown>,
      outputFormat: input.spec.outputFormat,
      storageKey: input.artifact.storageKey ?? null,
      shareToken: input.artifact.shareToken ?? null,
      shareExpiresAt: input.artifact.shareExpiresAt?.slice(0, 23).replace('T', ' ') ?? null,
      status: input.artifact.status,
      artifactJson: input.artifact as unknown as Record<string, unknown>,
    });
  }

  async getById(id: string, userId?: string) {
    if (!this.enabled) {
      const row = this.memory.get(id);
      if (!row) return null;
      if (userId && row.userId !== userId) return null;
      return row;
    }
    const row = await ReportArtifactModel.query().findById(id);
    if (!row) return null;
    if (userId && row.userId !== userId) return null;
    return {
      id: row.id,
      messageId: row.messageId ?? undefined,
      userId: row.userId,
      spec: row.specJson as unknown as ReportSpec,
      artifact: row.artifactJson as unknown as ReportArtifact,
    };
  }

  async updateLayout(input: {
    id: string;
    userId: string;
    spec: ReportSpec;
    artifact: ReportArtifact;
  }): Promise<boolean> {
    const existing = await this.getById(input.id, input.userId);
    if (!existing) return false;

    if (!this.enabled) {
      this.memory.set(input.id, {
        id: input.id,
        messageId: existing.messageId,
        userId: input.userId,
        spec: input.spec,
        artifact: input.artifact,
      });
      return true;
    }

    await ReportArtifactModel.query().findById(input.id).patch({
      specJson: input.spec as unknown as Record<string, unknown>,
      artifactJson: input.artifact as unknown as Record<string, unknown>,
    });
    return true;
  }

  async getByShareToken(shareToken: string) {
    if (!this.enabled) {
      for (const row of this.memory.values()) {
        if (row.artifact.shareToken === shareToken) return row;
      }
      return null;
    }
    const row = await ReportArtifactModel.query().findOne({ share_token: shareToken });
    if (!row) return null;
    if (row.shareExpiresAt && new Date(row.shareExpiresAt).getTime() < Date.now()) return null;
    return {
      id: row.id,
      messageId: row.messageId ?? undefined,
      userId: row.userId,
      spec: row.specJson as unknown as ReportSpec,
      artifact: row.artifactJson as unknown as ReportArtifact,
    };
  }
}
