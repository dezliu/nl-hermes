/** Shared with rag-service — local deterministic embedding */
const DIM = 64;

export function embedText(text: string, dimensions = DIM): number[] {
  const vec = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    vec[i % dimensions] += code / 255;
    vec[(i * 7 + 3) % dimensions] += (code % 17) / 17;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
