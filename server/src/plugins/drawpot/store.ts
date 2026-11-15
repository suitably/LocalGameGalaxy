/**
 * Draw pots on the companion server: one JSON file per pot [ID: SERVER-DRAWPOT-STORE]
 *
 * Operations on one pot run one after another (promise chain per pot id), so a draw is atomic
 * like in the Cloudflare Durable Object. Files are written to a temp name and renamed. Expired
 * pots are deleted by `sweep()`.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isPotId, runOp, type PotExecutor } from './core/http';
import type { DrawPotState } from './core/types';

export class FilePotStore {
  readonly dir: string;
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(dir: string) {
    this.dir = dir;
  }

  private file(potId: string): string {
    if (!isPotId(potId)) throw new Error('invalid pot id');
    return path.join(this.dir, `${potId}.json`);
  }

  private async read(potId: string): Promise<DrawPotState | null> {
    try {
      return JSON.parse(await fs.readFile(this.file(potId), 'utf8')) as DrawPotState;
    } catch {
      return null;
    }
  }

  private async write(state: DrawPotState): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const target = this.file(state.id);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(state));
    await fs.rename(tmp, target);
  }

  /** Runs `task` after every earlier task for the same pot has settled. */
  private locked<T>(potId: string, task: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(potId) ?? Promise.resolve();
    const run = prev.then(task, task);
    const tail = run.catch(() => undefined);
    this.queues.set(potId, tail);
    void tail.then(() => {
      if (this.queues.get(potId) === tail) this.queues.delete(potId);
    });
    return run;
  }

  readonly executor: PotExecutor = (potId, op) =>
    this.locked(potId, async () => {
      const result = runOp(await this.read(potId), op);
      if (result.next === null) await fs.rm(this.file(potId), { force: true });
      else if (result.next) await this.write(result.next);
      return result;
    });

  /** Deletes expired pots; returns how many. */
  async sweep(now = Date.now()): Promise<number> {
    let names: string[];
    try {
      names = await fs.readdir(this.dir);
    } catch {
      return 0;
    }
    let removed = 0;
    for (const name of names) {
      const potId = name.replace(/\.json$/, '');
      if (name === potId || !isPotId(potId)) continue;
      await this.locked(potId, async () => {
        const state = await this.read(potId);
        if (state && state.expiresAt > now) return;
        await fs.rm(this.file(potId), { force: true });
        removed++;
      });
    }
    return removed;
  }
}
