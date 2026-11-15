/**
 * Create form state for a new draw pot [ID: DRAWPOT-CREATE-FORM]
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CLOUD_BACKEND,
  drawPotApi,
  DrawPotApiError,
  potPath,
  serverOf,
  type DrawPotBackend,
  type DrawPotMode,
  type DrawPotSettings,
} from '../logic/api';
import {
  getHelperToken,
  getHelperUrl,
  isHelperActive,
} from '../../../lib/companion/companionSettings';
import { duplicateLabels, MAX_ENTRIES, parseEntries } from '../logic/entries';
import { saveHosted } from '../logic/localStore';

export type CreateFormProblem =
  'title' | 'entries' | 'tooMany' | 'santaMin' | 'santaDuplicates' | null;

/** Where the pot is stored: Nexumia cloud (Cloudflare) or the user's own Nexumia server. */
export type PotTarget = 'cloud' | 'companion';

export function useCreatePotForm() {
  const navigate = useNavigate();
  // offered only when a server is connected (it has a token): creating a pot there needs it
  const companionUrl = isHelperActive() && getHelperToken() ? getHelperUrl() : '';
  const [target, setTarget] = useState<PotTarget>('cloud');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [entriesText, setEntriesText] = useState('');
  const [mode, setMode] = useState<DrawPotMode>('pot');
  const [removeDrawn, setRemoveDrawn] = useState(true);
  const [multiDraw, setMultiDraw] = useState(false);
  const [maxDraws, setMaxDraws] = useState<number | null>(3);
  const [hostSeesResults, setHostSeesResults] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<DrawPotApiError['code'] | null>(null);
  const [touched, setTouched] = useState(false);

  const entries = useMemo(() => parseEntries(entriesText), [entriesText]);
  const duplicates = useMemo(() => duplicateLabels(entries), [entries]);

  const problem: CreateFormProblem = !title.trim()
    ? 'title'
    : entries.length === 0
      ? 'entries'
      : entries.length > MAX_ENTRIES
        ? 'tooMany'
        : mode === 'secret-santa' && entries.length < 2
          ? 'santaMin'
          : mode === 'secret-santa' && duplicates.length > 0
            ? 'santaDuplicates'
            : null;

  const settings: DrawPotSettings = {
    mode,
    removeDrawn,
    maxDrawsPerParticipant: multiDraw ? maxDraws : 1,
    hostSeesResults,
    showEntries,
  };

  const appendEntries = (text: string) =>
    setEntriesText((prev) => (prev.trim() ? `${prev.replace(/\s+$/, '')}\n${text}` : text));

  async function submit() {
    setTouched(true);
    if (problem || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const backend: DrawPotBackend =
        target === 'companion' && companionUrl
          ? { kind: 'companion', url: companionUrl.replace(/\/+$/, '') }
          : CLOUD_BACKEND;
      const res = await drawPotApi.create(backend, {
        title: title.trim(),
        description,
        entries,
        settings,
      });
      saveHosted({
        id: res.id,
        server: serverOf(backend),
        adminKey: res.adminKey,
        title: title.trim(),
        mode,
        createdAt: Date.now(),
        expiresAt: res.expiresAt,
      });
      navigate(potPath('admin', res.id, serverOf(backend)), { replace: true });
    } catch (e) {
      setSubmitError(e instanceof DrawPotApiError ? e.code : 'network');
      setSubmitting(false);
    }
  }

  return {
    companionUrl,
    target,
    setTarget,
    title,
    setTitle,
    description,
    setDescription,
    entriesText,
    setEntriesText,
    appendEntries,
    mode,
    setMode,
    removeDrawn,
    setRemoveDrawn,
    multiDraw,
    setMultiDraw,
    maxDraws,
    setMaxDraws,
    hostSeesResults,
    setHostSeesResults,
    showEntries,
    setShowEntries,
    entries,
    duplicates,
    problem,
    touched,
    submitting,
    submitError,
    submit,
  };
}

export type CreatePotForm = ReturnType<typeof useCreatePotForm>;
