const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const distConfig = path.resolve(__dirname, '../dist/config.js');
const {
  readEnvOverrides,
  applyEnvOverrides,
  stripLeakedEnvValues,
  parseEnvList,
} = require('../dist/core/configSources.js');

const ENV_KEYS = [
  'SECURITY_TOKEN',
  'TOKEN',
  'PORT',
  'MUSIC_DIR',
  'DIRECTORIES',
  'TABLETOP_DIR',
  'CONFIG_PATH',
];

function withEnv(vars, fn) {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

function freshManager() {
  delete require.cache[distConfig];
  const { ConfigManager } = require(distConfig);
  return new ConfigManager();
}

function tempConfigPath(initial) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgg-config-'));
  const file = path.join(dir, 'config.json');
  if (initial) fs.writeFileSync(file, JSON.stringify(initial));
  return file;
}

const readFile = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'));

test('configSources pure helpers', async (t) => {
  await t.test('parseEnvList trims and drops empty entries', () => {
    assert.deepStrictEqual(parseEnvList(' /a, ,/b ,'), ['/a', '/b']);
    assert.deepStrictEqual(parseEnvList(undefined), []);
  });

  await t.test('readEnvOverrides parses port, strips quotes from token, collects dirs', () => {
    const overrides = readEnvOverrides(
      {
        PORT: '4567',
        SECURITY_TOKEN: ' "abc" ',
        MUSIC_DIR: '/m1,/m2',
        DIRECTORIES: '/m3',
        TABLETOP_DIR: '/t1',
      },
      ['/app/music'],
    );
    assert.deepStrictEqual(overrides, {
      port: 4567,
      token: 'abc',
      directories: ['/m1', '/m2', '/m3', '/app/music'],
      tabletopDirectories: ['/t1'],
      notesDir: null,
    });
  });

  await t.test('readEnvOverrides ignores invalid port and empty token', () => {
    const overrides = readEnvOverrides({ PORT: 'abc', TOKEN: '   ' });
    assert.strictEqual(overrides.port, null);
    assert.strictEqual(overrides.token, null);
  });

  await t.test(
    'applyEnvOverrides merges without duplicating and does not mutate the file config',
    () => {
      const file = {
        directories: ['/m1'],
        tabletopDirectories: [],
        port: 3000,
        token: 'file-token',
        downloadDir: null,
        apiKeys: [],
      };
      const effective = applyEnvOverrides(file, {
        port: 4000,
        token: 'env-token',
        directories: ['/m1/', '/m2'],
        tabletopDirectories: ['/t'],
      });
      assert.deepStrictEqual(effective.directories, ['/m1', '/m2']);
      assert.strictEqual(effective.port, 4000);
      assert.strictEqual(effective.token, 'env-token');
      assert.strictEqual(effective.downloadDir, '/m1');
      assert.deepStrictEqual(file.directories, ['/m1']);
      assert.strictEqual(file.token, 'file-token');
    },
  );

  await t.test('stripLeakedEnvValues drops only values identical to env overrides', () => {
    const { config, dropped } = stripLeakedEnvValues(
      {
        directories: ['/env-dir', '/own-dir'],
        tabletopDirectories: ['/env-tt', '/own-tt'],
        port: 4567,
        token: 'leaked',
        downloadDir: '/env-dir',
        apiKeys: [],
      },
      { port: 4567, token: 'leaked', directories: ['/env-dir'], tabletopDirectories: ['/env-tt'] },
      3000,
    );
    assert.deepStrictEqual(dropped, [
      'token',
      'port',
      'directories',
      'downloadDir',
      'tabletopDirectories',
    ]);
    assert.strictEqual(config.token, null);
    assert.strictEqual(config.port, 3000);
    assert.deepStrictEqual(config.directories, ['/own-dir']);
    assert.deepStrictEqual(config.tabletopDirectories, ['/own-tt']);
    assert.strictEqual(config.downloadDir, null);
  });

  await t.test('stripLeakedEnvValues keeps values that differ from the env', () => {
    const { dropped } = stripLeakedEnvValues(
      {
        directories: ['/own'],
        tabletopDirectories: [],
        port: 3100,
        token: 'own',
        downloadDir: null,
        apiKeys: [],
      },
      { port: 4567, token: 'env', directories: ['/env'], tabletopDirectories: [] },
      3000,
    );
    assert.deepStrictEqual(dropped, []);
  });
});

test('ConfigManager never persists env overrides (#409)', async (t) => {
  await t.test('setters write only file values while env values stay effective', () => {
    const file = tempConfigPath({ token: 'file-token', directories: ['/own'] });
    withEnv(
      { CONFIG_PATH: file, SECURITY_TOKEN: 'x-env-token', PORT: '4567', MUSIC_DIR: '/tmp/m-env' },
      () => {
        const config = freshManager();
        assert.strictEqual(config.token, 'x-env-token');
        assert.strictEqual(config.port, 4567);
        assert.ok(config.directories.includes('/tmp/m-env'));

        config.addDirectory('/added');
        config.createApiKey('k');

        const written = readFile(file);
        assert.strictEqual(written.token, 'file-token');
        assert.strictEqual(written.port, 3000);
        assert.deepStrictEqual(written.directories, ['/own', '/added']);
        assert.ok(!JSON.stringify(written).includes('x-env-token'));
        assert.ok(!JSON.stringify(written).includes('/tmp/m-env'));
        assert.strictEqual(written.apiKeys.length, 1);
      },
    );
  });

  await t.test('removing the env var restores the file values', () => {
    const file = tempConfigPath({ token: 'file-token' });
    withEnv({ CONFIG_PATH: file, SECURITY_TOKEN: 'env-token', PORT: '4567' }, () => {
      freshManager().addDirectory('/x');
    });
    withEnv({ CONFIG_PATH: file }, () => {
      const config = freshManager();
      assert.strictEqual(config.token, 'file-token');
      assert.strictEqual(config.port, 3000);
    });
  });

  await t.test('leaked values identical to the env are removed from the file on start', () => {
    const file = tempConfigPath({
      token: 'leaked',
      port: 4567,
      directories: ['/tmp/m-env', '/own'],
    });
    withEnv(
      { CONFIG_PATH: file, SECURITY_TOKEN: 'leaked', PORT: '4567', MUSIC_DIR: '/tmp/m-env' },
      () => {
        const config = freshManager();
        assert.strictEqual(config.token, 'leaked');
        const written = readFile(file);
        assert.strictEqual(written.token, null);
        assert.strictEqual(written.port, 3000);
        assert.deepStrictEqual(written.directories, ['/own']);
      },
    );
  });

  await t.test('a generated token is persisted, an env token is not', () => {
    // Existing but empty config: ConfigManager falls back to other search paths if CONFIG_PATH is missing.
    const file = tempConfigPath({});
    withEnv({ CONFIG_PATH: file }, () => {
      const config = freshManager();
      assert.ok(config.token && config.token.length >= 16);
      assert.strictEqual(readFile(file).token, config.token);
    });
    const envFile = tempConfigPath({});
    withEnv({ CONFIG_PATH: envFile, SECURITY_TOKEN: 'env-only' }, () => {
      freshManager().addDirectory('/y');
      assert.strictEqual(readFile(envFile).token, null);
    });
  });

  await t.test('deleteApiKey reports success', () => {
    const file = tempConfigPath({ token: 't' });
    withEnv({ CONFIG_PATH: file }, () => {
      const config = freshManager();
      const key = config.createApiKey('k');
      assert.strictEqual(config.deleteApiKey(key.id), true);
      assert.strictEqual(config.apiKeys.length, 0);
      assert.strictEqual(readFile(file).apiKeys.length, 0);
    });
  });
});
