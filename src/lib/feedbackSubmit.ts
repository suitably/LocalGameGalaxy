/** Feedback submission: Melodiq host relay, this device's PAT, or the Nexumia Server proxy. */
import { storage } from './storage';
import { getFeedbackRelay, type FeedbackResult } from './feedbackRelay';
import { createGitHubIssue, hasGitHubPAT, resolveGitHubConfig } from './github';

/**
 * Submits feedback as a GitHub issue using only this device's own PAT.
 * Returns `code: 'no_token'` when no PAT is stored (used by hosts answering phones).
 */
export async function submitFeedbackWithLocalPat(
  title: string,
  body: string,
): Promise<FeedbackResult> {
  const { config, source } = resolveGitHubConfig();
  if (source !== 'local' || !config) {
    return {
      success: false,
      code: 'no_token',
      error: 'No GitHub token configured on this device.',
    };
  }
  const result = await createGitHubIssue(config, {
    title: `[Feedback] ${title}`,
    body,
    labels: ['user-feedback'],
  });
  return result.success
    ? { success: true, issueUrl: result.issueUrl }
    : { success: false, error: result.error || 'Failed to create issue' };
}

/**
 * Submits feedback. Order: 1) a registered relay (phone connected to a Melodiq host: the host
 * submits with its own PAT) 2) this device's PAT 3) Nexumia Server proxy.
 * If the host has no PAT or the relay fails, this device's own PAT is used when present.
 */
export async function submitFeedback(title: string, body: string): Promise<FeedbackResult> {
  const relay = getFeedbackRelay();
  if (relay) {
    let relayed: FeedbackResult;
    try {
      relayed = await relay(title, body);
    } catch (e: unknown) {
      relayed = { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
    if (relayed.success) return relayed;
    if (!hasGitHubPAT()) {
      return relayed.code === 'no_token'
        ? {
            success: false,
            error: 'Neither the host nor this device has a GitHub token configured.',
          }
        : relayed;
    }
    // Fall through to this device's own PAT.
  }
  const { config: ghConfig, source } = resolveGitHubConfig();

  if (source === 'local' && ghConfig) {
    // Direct GitHub API call with local PAT
    const result = await createGitHubIssue(ghConfig, {
      title: `[Feedback] ${title}`,
      body: body,
      labels: ['user-feedback'],
    });

    if (result.success) {
      return { success: true, issueUrl: result.issueUrl };
    } else {
      return { success: false, error: result.error || 'Failed to create issue' };
    }
  } else if (source === 'server') {
    // Proxy through Nexumia Server
    const baseUrl = storage.getHelperUrl();
    const token = storage.getHelperToken();
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');

    try {
      const res = await fetch(`${cleanBaseUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title,
          body: body,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to submit feedback' };
      }

      return { success: true, issueUrl: data.issueUrl };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return { success: false, error: message };
    }
  } else {
    return {
      success: false,
      error:
        'No GitHub connection configured. Please set up a GitHub Token in General Settings or connect a Nexumia Server.',
    };
  }
}
