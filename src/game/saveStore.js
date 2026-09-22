// Synchronous game-facing cache; native persistence is serialized in the background.
export const SAVE_KEY = 'evspeed_native_save_v1';
export const PENDING_KEY = 'evspeed_pending_save_v1';

function decode(value) {
    const data = JSON.parse(value);
    if (!data || Array.isArray(data) || typeof data !== 'object'
        || Object.entries(data).some(([key, item]) => !key.startsWith('evspeed_') || typeof item !== 'string')) {
        throw new Error('Invalid EV SPEED save. Existing data was not overwritten.');
    }
    return new Map(Object.entries(data));
}

export function createSaveStore({ native, preferences, local, warn = console.warn }) {
    let values = new Map();
    let ready = false;
    let initialization;
    let dirty = false;
    let writing = null;
    const snapshot = () => JSON.stringify(Object.fromEntries(values));
    const journal = value => {
        try { local().setItem(PENDING_KEY, value); }
        catch (error) { warn('Could not journal the native save.', error); }
    };

    async function persist() {
        while (dirty) {
            dirty = false;
            const value = snapshot();
            try {
                await preferences.set({ key: SAVE_KEY, value });
                // Never remove a newer pending save while an older write completes.
                try {
                    if (local().getItem(PENDING_KEY) === value) local().removeItem(PENDING_KEY);
                } catch (error) { warn('Could not clear the save journal.', error); }
            } catch (error) {
                dirty = true;
                warn('Native save failed; pending save retained for retry.', error);
                break;
            }
        }
    }

    function flush() {
        if (!native || !ready) return Promise.resolve();
        if (!writing && dirty) writing = persist().finally(() => { writing = null; });
        return writing || Promise.resolve();
    }

    function changed() {
        journal(snapshot());
        dirty = true;
        // Coalesce synchronous changes such as buying an item + deducting its price.
        queueMicrotask(flush);
    }

    return {
        init() {
            if (initialization) return initialization;
            initialization = (async () => {
                if (native) {
                    // A failed read must block startup, never replace a save with defaults.
                    const { value } = await preferences.get({ key: SAVE_KEY });
                    let pending = null;
                    try { pending = local().getItem(PENDING_KEY); }
                    catch (error) { warn('WebView storage unavailable.', error); }
                    if (pending !== null || value !== null) {
                        values = decode(pending ?? value);
                    } else {
                        // First native launch after upgrading: import existing WebView progress.
                        const legacy = local();
                        for (let i = 0; i < legacy.length; i++) {
                            const key = legacy.key(i);
                            if (key?.startsWith('evspeed_') && key !== SAVE_KEY && key !== PENDING_KEY) {
                                values.set(key, legacy.getItem(key));
                            }
                        }
                    }
                    ready = true;
                    if (pending !== null || value === null) {
                        changed();
                        await flush();
                    }
                } else ready = true;
            })();
            return initialization;
        },
        getItem(key) {
            if (!native) return local().getItem(key);
            if (!ready) throw new Error('Save storage has not initialized.');
            return values.get(key) ?? null;
        },
        setItem(key, value) {
            if (!native) return local().setItem(key, value);
            if (!ready) throw new Error('Save storage has not initialized.');
            if (!key.startsWith('evspeed_')) throw new Error('Unsupported save key.');
            const text = String(value);
            if (values.get(key) === text) return;
            values.set(key, text);
            changed();
        },
        removeItem(key) {
            if (!native) return local().removeItem(key);
            if (!ready) throw new Error('Save storage has not initialized.');
            if (values.delete(key)) changed();
        },
        flush
    };
}
