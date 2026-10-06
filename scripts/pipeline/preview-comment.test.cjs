const test = require('node:test');
const assert = require('node:assert/strict');
const handlePreviewComment = require('./preview-comment.cjs');
const { sanitizeBranch, PREVIEW_MARKER, COMMENT_HEADER } = handlePreviewComment;

test('sanitizeBranch handles umlauts and special characters correctly', () => {
  assert.equal(sanitizeBranch('feature/äpfel-öl-übermut-straße'), 'feature-aepfel-oel-uebermut-strasse');
  assert.equal(sanitizeBranch('FEAT_123_CAPS'), 'feat-123-caps');
  assert.equal(sanitizeBranch('---trim--dashes---'), 'trim-dashes');
  assert.equal(sanitizeBranch('invalid@symbol$here!'), 'invalid-symbol-here');
  assert.equal(sanitizeBranch(''), '');
  assert.equal(sanitizeBranch(null), '');
});

test('handlePreviewComment creates comment when no existing comment matches', async () => {
  let createdComment = null;
  let updatedComment = null;

  const fakeGithub = {
    paginate: async () => [
      { id: 101, body: 'Just a normal user comment' },
      { id: 102, body: 'Another issue comment' },
    ],
    rest: {
      issues: {
        listComments: () => {},
        createComment: async (args) => {
          createdComment = args;
          return { data: { id: 201 } };
        },
        updateComment: async (args) => {
          updatedComment = args;
        },
      },
    },
  };

  const fakeContext = {
    repo: { owner: 'suitably', repo: 'LocalGameGalaxy' },
    payload: {
      pull_request: {
        number: 42,
        head: { ref: 'feat/cool-game' },
      },
    },
  };

  await handlePreviewComment({ github: fakeGithub, context: fakeContext }, { status: 'deployed' });

  assert.equal(updatedComment, null);
  assert.ok(createdComment);
  assert.equal(createdComment.owner, 'suitably');
  assert.equal(createdComment.issue_number, 42);
  assert.ok(createdComment.body.includes(PREVIEW_MARKER));
  assert.ok(createdComment.body.includes('https://feat-cool-game.nexumia.de/'));
});

test('handlePreviewComment updates sticky comment found by marker or header', async () => {
  let updatedComment = null;

  const fakeGithub = {
    paginate: async () => [
      { id: 301, body: `${COMMENT_HEADER}\n\nOld content without marker` },
    ],
    rest: {
      issues: {
        listComments: () => {},
        createComment: async () => {},
        updateComment: async (args) => {
          updatedComment = args;
        },
      },
    },
  };

  const fakeContext = {
    repo: { owner: 'suitably', repo: 'LocalGameGalaxy' },
    payload: {
      pull_request: {
        number: 42,
        merged: true,
        head: { ref: 'feat/cool-game' },
      },
    },
  };

  await handlePreviewComment({ github: fakeGithub, context: fakeContext }, { status: 'cleaned-up' });

  assert.ok(updatedComment);
  assert.equal(updatedComment.comment_id, 301);
  assert.ok(updatedComment.body.includes(PREVIEW_MARKER));
  assert.ok(updatedComment.body.includes('Merged & Cleaned Up'));
});
