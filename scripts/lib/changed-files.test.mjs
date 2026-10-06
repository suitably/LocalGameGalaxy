import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBaseRef, hasGitRef, getMergeBase, getChangedFiles } from './changed-files.mjs';

test('hasGitRef identifies existing refs', () => {
  assert.equal(hasGitRef('HEAD'), true);
  assert.equal(hasGitRef('non-existent-ref-xyz-12345'), false);
});

test('resolveBaseRef prioritizes explicit base', () => {
  const base = resolveBaseRef('origin/custom-branch');
  assert.equal(base, 'origin/custom-branch');
});

test('resolveBaseRef reads GITHUB_BASE_REF if set', () => {
  const orig = process.env.GITHUB_BASE_REF;
  try {
    process.env.GITHUB_BASE_REF = 'main';
    const base = resolveBaseRef();
    assert.match(base, /main/);
  } finally {
    if (orig !== undefined) {
      process.env.GITHUB_BASE_REF = orig;
    } else {
      delete process.env.GITHUB_BASE_REF;
    }
  }
});

test('resolveBaseRef falls back to origin/main or HEAD when no env is set', () => {
  const origGh = process.env.GITHUB_BASE_REF;
  const origGl = process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
  try {
    delete process.env.GITHUB_BASE_REF;
    delete process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
    const base = resolveBaseRef();
    assert.ok(base === 'origin/main' || base === 'main' || base === 'HEAD~1' || base === 'HEAD');
  } finally {
    if (origGh !== undefined) process.env.GITHUB_BASE_REF = origGh;
    if (origGl !== undefined) process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME = origGl;
  }
});

test('getMergeBase returns a commit SHA or null', () => {
  const mergeBase = getMergeBase('HEAD', 'HEAD');
  assert.ok(typeof mergeBase === 'string' && mergeBase.length >= 7);
  assert.equal(getMergeBase('non-existent-ref-xyz-12345'), null);
});

test('getChangedFiles returns files list with baseRef and mergeBase metadata', () => {
  const result = getChangedFiles();
  assert.ok(Array.isArray(result.files));
  assert.ok(typeof result.baseRef === 'string');
  assert.ok(result.files.every((f) => typeof f === 'string'));
});
