import { randomBytes, randomUUID } from 'node:crypto';
import type { Logger } from '@hermes/shared';
import type {
  ReportArtifact,
  ReportRenderRequest,
  ReportShareRequest,
  ReportShareResponse,
  ReportSpec,
} from '@hermes/contracts';
import { composeAllEchartsOptions } from './chart-composer.js';
import type { ReportStorageClient } from './storage-client.js';
import { buildReportWebHtml } from '../templates/report-web.js';

const RENDER_WORKER_URL = process.env.RENDER_WORKER_URL ?? 'http://localhost:4060';

export class ArtifactRenderer {
  private readonly specs = new Map<string, ReportSpec>();
  private readonly artifacts = new Map<string, ReportArtifact>();
  private readonly shareTokens = new Map<string, { reportId: string; expiresAt: string }>();

  constructor(
    private readonly storage: ReportStorageClient,
    private readonly logger: Logger,
    private readonly gatewayBaseUrl = process.env.GATEWAY_PUBLIC_URL ?? 'http://localhost:4000',
  ) {}

  saveSpec(spec: ReportSpec): void {
    this.specs.set(spec.id, spec);
  }

  getSpec(reportId: string): ReportSpec | undefined {
    return this.specs.get(reportId);
  }

  getArtifact(reportId: string): ReportArtifact | undefined {
    return this.artifacts.get(reportId);
  }

  async render(req: ReportRenderRequest): Promise<ReportArtifact> {
    const spec = req.spec;
    const gatewayBase = req.gatewayBaseUrl ?? this.gatewayBaseUrl;
    this.specs.set(spec.id, spec);

    const echartsOptions = composeAllEchartsOptions(spec.charts, spec.data.rows);

    if (spec.outputFormat === 'inline') {
      const artifact: ReportArtifact = {
        reportId: spec.id,
        format: 'inline',
        status: 'ready',
        inlinePayload: {
          charts: spec.charts,
          rows: spec.data.rows,
          echartsOptions,
        },
        previewUrl: `${gatewayBase}/api/reports/${spec.id}/preview`,
      };
      this.artifacts.set(spec.id, artifact);
      return artifact;
    }

    try {
      if (spec.outputFormat === 'web') {
        const html = buildReportWebHtml(spec, echartsOptions);
        const storageKey = `reports/${spec.userId ?? 'anonymous'}/${spec.id}/web/index.html`;
        await this.storage.put(storageKey, html, 'text/html');
        const artifact: ReportArtifact = {
          reportId: spec.id,
          format: 'web',
          status: 'ready',
          storageKey,
          previewUrl: `${gatewayBase}/api/reports/${spec.id}/preview`,
          downloadUrl: `${gatewayBase}/api/reports/${spec.id}/download`,
        };
        this.artifacts.set(spec.id, artifact);
        return artifact;
      }

      const wordBytes = await this.renderWord(spec, echartsOptions);
      const storageKey = `reports/${spec.userId ?? 'anonymous'}/${spec.id}/word/report.docx`;
      await this.storage.put(storageKey, wordBytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const artifact: ReportArtifact = {
        reportId: spec.id,
        format: 'word',
        status: 'ready',
        storageKey,
        previewUrl: `${gatewayBase}/api/reports/${spec.id}/preview`,
        downloadUrl: `${gatewayBase}/api/reports/${spec.id}/download`,
      };
      this.artifacts.set(spec.id, artifact);
      return artifact;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'render failed';
      this.logger.error('report.render.failed', { reportId: spec.id, err: message });
      const artifact: ReportArtifact = {
        reportId: spec.id,
        format: spec.outputFormat,
        status: 'failed',
        errorMessage: message,
      };
      this.artifacts.set(spec.id, artifact);
      return artifact;
    }
  }

  private async renderWord(spec: ReportSpec, echartsOptions: unknown[]): Promise<Buffer> {
    try {
      const res = await fetch(`${RENDER_WORKER_URL}/render/word`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, echartsOptions }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch (err) {
      this.logger.warn('report.render.word.worker_unavailable', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
    return this.renderWordFallback(spec);
  }

  private renderWordFallback(spec: ReportSpec): Buffer {
    const lines = [
      spec.title,
      '',
      spec.narrative.summary,
      '',
      ...(spec.narrative.insights ?? []).map((item) => `- ${item}`),
      '',
      `数据行数: ${spec.data.rowCount}`,
      `生成时间: ${spec.createdAt}`,
    ];
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  async getPreviewContent(reportId: string): Promise<{ contentType: string; body: Buffer } | null> {
    const spec = this.specs.get(reportId);
    const artifact = this.artifacts.get(reportId);
    if (!spec || !artifact) return null;

    if (artifact.format === 'inline') {
      const echartsOptions = composeAllEchartsOptions(spec.charts, spec.data.rows);
      const html = buildReportWebHtml(spec, echartsOptions);
      return { contentType: 'text/html; charset=utf-8', body: Buffer.from(html, 'utf-8') };
    }

    if (artifact.storageKey) {
      const body = await this.storage.get(artifact.storageKey);
      const contentType =
        artifact.format === 'web'
          ? 'text/html; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      return { contentType, body };
    }
    return null;
  }

  async getDownloadContent(reportId: string): Promise<{ filename: string; contentType: string; body: Buffer } | null> {
    const preview = await this.getPreviewContent(reportId);
    const artifact = this.artifacts.get(reportId);
    const spec = this.specs.get(reportId);
    if (!preview || !artifact || !spec) return null;

    const filename =
      artifact.format === 'word'
        ? `${spec.title.slice(0, 32).replace(/[^\w\u4e00-\u9fa5-]+/g, '_') || 'report'}.docx`
        : artifact.format === 'web'
          ? `${spec.title.slice(0, 32).replace(/[^\w\u4e00-\u9fa5-]+/g, '_') || 'report'}.html`
          : 'report.json';

    return { filename, contentType: preview.contentType, body: preview.body };
  }

  createShare(req: ReportShareRequest): ReportShareResponse {
    const spec = this.specs.get(req.reportId);
    const artifact = this.artifacts.get(req.reportId);
    if (!spec || !artifact || artifact.status !== 'ready') {
      throw Object.assign(new Error('报表不存在或未就绪'), { code: 'REPORT_NOT_FOUND' });
    }
    if (spec.userId && spec.userId !== req.userId) {
      throw Object.assign(new Error('无权分享该报表'), { code: 'FORBIDDEN' });
    }

    const days = req.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const shareToken = randomBytes(24).toString('base64url');
    this.shareTokens.set(shareToken, { reportId: req.reportId, expiresAt });

    const shareUrl = `${this.gatewayBaseUrl}/api/public/r/${shareToken}`;
    const updated: ReportArtifact = { ...artifact, shareToken, shareExpiresAt: expiresAt };
    this.artifacts.set(req.reportId, updated);

    return { shareToken, shareUrl, expiresAt };
  }

  resolveShareToken(shareToken: string): { reportId: string } | null {
    const entry = this.shareTokens.get(shareToken);
    if (!entry) return null;
    if (new Date(entry.expiresAt).getTime() < Date.now()) {
      this.shareTokens.delete(shareToken);
      return null;
    }
    return { reportId: entry.reportId };
  }

  createReportId(): string {
    return randomUUID();
  }
}
