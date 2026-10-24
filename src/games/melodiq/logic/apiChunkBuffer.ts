export type ChunkResult =
  { status: 'pending' } | { status: 'complete'; payload: unknown } | { status: 'error' };

/** Reassembles `api_response_chunk` messages (one buffer per request id). */
export class ApiChunkBuffer {
  private readonly buffers = new Map<string, { chunks: string[]; total: number }>();

  add(reqId: string, index: number, total: number, chunk: string): ChunkResult {
    let buf = this.buffers.get(reqId);
    if (!buf) {
      buf = { chunks: new Array<string>(total), total };
      this.buffers.set(reqId, buf);
    }
    buf.chunks[index] = chunk;

    const received = buf.chunks.filter((c) => c !== undefined).length;
    if (received !== total) return { status: 'pending' };

    this.buffers.delete(reqId);
    try {
      return { status: 'complete', payload: JSON.parse(buf.chunks.join('')) };
    } catch {
      return { status: 'error' };
    }
  }
}
