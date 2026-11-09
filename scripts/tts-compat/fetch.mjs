/** Network side of the harness: Steam Workshop download and image host probing (run time only). */
const DETAILS = 'https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/';

export async function fetchWorkshopSave(id, decodeModBuffer) {
  const res = await fetch(DETAILS, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ itemcount: '1', 'publishedfileids[0]': id }),
  });
  if (!res.ok) throw new Error(`details HTTP ${res.status}`);
  const item = (await res.json())?.response?.publishedfiledetails?.[0];
  if (!item?.file_url) throw new Error('no file_url (private, removed or not a TTS mod)');
  const file = await fetch(item.file_url);
  if (!file.ok) throw new Error(`download HTTP ${file.status}`);
  return decodeModBuffer(await file.arrayBuffer());
}

/** Probes up to `perHost` URLs per host (HEAD, GET fallback) and stores statuses on result.images.hosts. */
export async function checkImageHosts(save, result, sanitizeUrl, perHost = 3) {
  const byHost = new Map();
  const visit = (objs) => {
    for (const o of objs ?? []) {
      const urls = [
        ...Object.values(o.CustomDeck ?? {}).flatMap((d) => [d.FaceURL, d.BackURL]),
        o.CustomImage?.ImageURL,
        o.CustomMesh?.DiffuseURL,
      ].filter(Boolean);
      for (const raw of urls) {
        const u = sanitizeUrl(raw);
        let host;
        try {
          host = new URL(u).hostname;
        } catch {
          continue;
        }
        const list = byHost.get(host) ?? [];
        if (list.length < perHost && !list.includes(u)) list.push(u);
        byHost.set(host, list);
      }
      visit(o.ContainedObjects);
      visit(o.States ? Object.values(o.States) : undefined);
    }
  };
  visit(save.ObjectStates);
  for (const [host, urls] of byHost) {
    const statuses = [];
    for (const u of urls) {
      try {
        let r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
        if (r.status === 405) r = await fetch(u, { signal: AbortSignal.timeout(10000) });
        statuses.push(r.status);
      } catch {
        statuses.push(0);
      }
    }
    if (result.images.hosts[host]) result.images.hosts[host].statuses = statuses;
  }
  const dead = Object.values(result.images.hosts).some((h) =>
    h.statuses?.some((s) => s === 0 || s >= 400),
  );
  result.checks.imagesReachable = !dead;
  if (dead && result.tier === 'A') result.tier = 'none';
}
