import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStore, SAVE_KEY, PENDING_KEY } from '../src/game/saveStore.js';

function fixture(entries = {}, initialNative = null) {
    const data = new Map(Object.entries(entries));
    const local = {
        get length() { return data.size; },
        key: i => [...data.keys()][i],
        getItem: key => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
    };
    const disk = { value: initialNative };
    const preferences = {
        get: async () => ({ value: disk.value }),
        set: async ({ value }) => { disk.value = value; }
    };
    const options = { native: true, preferences, local: () => local, warn: () => {} };
    return { data, disk, preferences, options, store: createSaveStore(options) };
}

test('web keeps the existing keys and synchronous semantics', async () => {
    const f = fixture({ evspeed_energy: '55' });
    const store = createSaveStore({ ...f.options, native: false });
    await store.init();
    assert.equal(store.getItem('evspeed_energy'), '55');
    store.setItem('evspeed_energy', 60);
    assert.equal(f.data.get('evspeed_energy'), '60');
    store.removeItem('evspeed_energy');
    assert.equal(store.getItem('evspeed_energy'), null);
    assert.equal(f.disk.value, null);
});

test('imports only game keys; native save wins on subsequent launches', async () => {
    const f = fixture({ evspeed_energy: '55', evspeed_owned: 'true', unrelated: 'keep' });
    await f.store.init();
    assert.deepEqual(JSON.parse(f.disk.value), { evspeed_energy: '55', evspeed_owned: 'true' });
    f.store.setItem('evspeed_energy', 60);
    f.store.removeItem('evspeed_owned');
    await f.store.flush();
    const restarted = createSaveStore(f.options);
    await restarted.init();
    assert.equal(restarted.getItem('evspeed_energy'), '60');
    assert.equal(restarted.getItem('evspeed_owned'), null);
    assert.equal(f.data.get('unrelated'), 'keep');
});

test('serializes rapid writes, including changes during an in-flight save', async () => {
    const f = fixture({}, '{}');
    await f.store.init();
    const releases = [];
    f.preferences.set = ({ key, value }) => new Promise(resolve => {
        assert.equal(key, SAVE_KEY);
        releases.push(() => { f.disk.value = value; resolve(); });
    });
    f.store.setItem('evspeed_energy', 1);
    const writing = f.store.flush();
    f.store.setItem('evspeed_energy', 2);
    f.store.setItem('evspeed_owned', true);
    assert.equal(releases.length, 1);
    releases.shift()();
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(f.data.has(PENDING_KEY));
    assert.equal(releases.length, 1);
    releases.shift()();
    await writing;
    assert.deepEqual(JSON.parse(f.disk.value), { evspeed_energy: '2', evspeed_owned: 'true' });
    assert.equal(f.data.has(PENDING_KEY), false);
});

test('failed write retains journal and recovers on next launch', async () => {
    const f = fixture({}, '{"evspeed_energy":"5"}');
    await f.store.init();
    const workingSet = f.preferences.set;
    f.preferences.set = async () => { throw new Error('storage unavailable'); };
    f.store.setItem('evspeed_energy', 9);
    await f.store.flush();
    assert.ok(f.data.has(PENDING_KEY));
    f.preferences.set = workingSet;
    const restarted = createSaveStore(f.options);
    await restarted.init();
    assert.equal(restarted.getItem('evspeed_energy'), '9');
    assert.equal(JSON.parse(f.disk.value).evspeed_energy, '9');
});

test('failed reads and malformed saves never overwrite existing data', async () => {
    const f = fixture({}, 'broken save');
    await assert.rejects(f.store.init());
    assert.equal(f.disk.value, 'broken save');
    f.preferences.get = async () => { throw new Error('read failure'); };
    await assert.rejects(createSaveStore(f.options).init());
    assert.equal(f.disk.value, 'broken save');
});
