/**
 * Multi-Channel Synchronization [ID: MODULES-SYNC-MULTICHANNEL]
 *
 * Unifies local cross-tab communication (via BroadcastChannel) and remote
 * peer synchronization (via MqttMailboxService) into a single, lifecycle-safe abstraction.
 *
 * Following SOLID Single Responsibility and Dependency Inversion:
 * - MultiChannelSyncCoordinator manages channel lifecycles, error boundaries, and unmount cleanups.
 * - useMultiChannelSync provides a clean React hook interface.
 * - Supports optional MQTT mailbox (for games requiring only local BroadcastChannel sync).
 */

import { useEffect, useCallback, useState } from 'react';
import type { MqttMailboxService } from './MqttMailboxService';

export interface UseMultiChannelSyncOptions<T> {
  channelId: string | null | undefined;
  broadcastPrefix: string;
  mailbox?: MqttMailboxService<T>;
  onMessage: (payload: T, source: 'broadcast' | 'mqtt') => Promise<void> | void;
  enabled?: boolean;
}

export interface UseMultiChannelSyncReturn<T> {
  publish: (payload: T, targetChannelId?: string) => void;
}

export class MultiChannelSyncCoordinator<T> {
  private options: UseMultiChannelSyncOptions<T>;
  private bc: BroadcastChannel | null = null;
  private unsubscribeMqtt: (() => void) | null = null;

  constructor(options: UseMultiChannelSyncOptions<T>) {
    this.options = options;
  }

  public updateOptions(newOptions: UseMultiChannelSyncOptions<T>): void {
    const channelChanged = this.options.channelId !== newOptions.channelId;
    const prefixChanged = this.options.broadcastPrefix !== newOptions.broadcastPrefix;
    const mailboxChanged = this.options.mailbox !== newOptions.mailbox;
    const enabledChanged = this.options.enabled !== newOptions.enabled;

    this.options = newOptions;

    if (channelChanged || prefixChanged || mailboxChanged || enabledChanged) {
      this.stop();
      if (newOptions.enabled !== false && newOptions.channelId) {
        this.start();
      }
    }
  }

  public start(): void {
    this.stop();
    const { channelId, broadcastPrefix, mailbox, enabled = true } = this.options;
    if (!channelId || !enabled) return;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.bc = new BroadcastChannel(`${broadcastPrefix}_${channelId}`);
        this.bc.onmessage = (event: MessageEvent<T>) => {
          if (event.data) {
            void this.options.onMessage(event.data, 'broadcast');
          }
        };
      }
    } catch (err) {
      console.warn(`[MultiChannelSyncCoordinator] BroadcastChannel init failed:`, err);
    }

    if (mailbox) {
      this.unsubscribeMqtt = mailbox.subscribe(channelId, (payload) => {
        void this.options.onMessage(payload, 'mqtt');
      });
    }
  }

  public stop(): void {
    if (this.bc) {
      try {
        this.bc.close();
      } catch {
        // ignore
      }
      this.bc = null;
    }
    if (this.unsubscribeMqtt) {
      try {
        this.unsubscribeMqtt();
      } catch {
        // ignore
      }
      this.unsubscribeMqtt = null;
    }
  }

  public publish(payload: T, targetChannelId?: string): void {
    const effectiveChannelId = targetChannelId || this.options.channelId;
    if (!effectiveChannelId) return;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`${this.options.broadcastPrefix}_${effectiveChannelId}`);
        bc.postMessage(payload);
        bc.close();
      }
    } catch (err) {
      console.warn(`[MultiChannelSyncCoordinator] BroadcastChannel postMessage failed:`, err);
    }

    if (this.options.mailbox) {
      try {
        this.options.mailbox.publish(effectiveChannelId, payload).catch((err) => {
          console.warn(`[MultiChannelSyncCoordinator] MQTT publish error:`, err);
        });
      } catch (err) {
        console.warn(`[MultiChannelSyncCoordinator] MQTT publish failed:`, err);
      }
    }
  }
}

export function useMultiChannelSync<T>(
  options: UseMultiChannelSyncOptions<T>
): UseMultiChannelSyncReturn<T> {
  const [coordinator] = useState(() => new MultiChannelSyncCoordinator(options));

  useEffect(() => {
    coordinator.updateOptions(options);
  });

  useEffect(() => {
    coordinator.start();
    return () => {
      coordinator.stop();
    };
  }, [coordinator, options.channelId, options.broadcastPrefix, options.mailbox, options.enabled]);

  const publish = useCallback(
    (payload: T, targetChannelId?: string) => {
      coordinator.publish(payload, targetChannelId);
    },
    [coordinator]
  );

  return { publish };
}
