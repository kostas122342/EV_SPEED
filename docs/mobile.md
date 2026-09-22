# Mobile setup

EV SPEED uses the same Phaser/Vite source and assets for the website and the
Capacitor application. Capacitor core and CLI are pinned to 8.5.2. Use Node 22
or newer (setup was verified with Node 24).

## Current setup

- `capacitor.config.json` points to Vite's `dist` output.
- The app name is `EV SPEED`.
- The Android project uses `com.kostas122342.evspeed`. Confirm the identifier
  before registering store listings or generating the future iOS project.
- There is no remote `server.url`: mobile builds will bundle the web assets.
- The Android project is included and has been run on a POCO device.
- iOS, release signing, and CI are not set up yet.
- Native progress uses Capacitor Preferences; the web version retains localStorage.

## Web workflow

```sh
npm ci
npm run dev-nolog
npm run build-nolog
```

Deploy `dist` as before. No Capacitor command is needed for the website.

## Next step: native projects

On a machine with the appropriate native toolchain, install the matching
platform package and create its project. For iOS, use macOS with a compatible
Xcode installation (locally or in the later CI setup):

```sh
npm install --save-exact @capacitor/ios@8.5.2
npm run build-nolog
npx cap add ios
```

The Android project already exists. On a fresh checkout, install dependencies,
sync the web build and open it in Android Studio (with the required SDK/JDK):

```sh
npm ci
npm run mobile:sync
npx cap open android
```

Commit the generated native projects, following their generated ignore rules.
After a web-code or asset change, run:

```sh
npm run mobile:sync
```

This rebuilds the web game and copies it into all added native platforms. It
does not compile, sign, or upload an app. Before platforms are added there is
no native target to sync. Open an added project with `npx cap open ios` or
`npx cap open android` on the corresponding development machine.

Before a public release, verify safe areas, app pause/resume, media recovery,
and save persistence in both browser and physical-device play.

## Local progress (no account or cloud)

Boot awaits `saveStorage.init()` before creating Phaser scenes. On native devices,
existing `evspeed_*` WebView keys are imported once into a Preferences snapshot.
Later launches use that snapshot, not the old keys. The synchronous game-facing
cache serializes native writes and journals pending changes in WebView storage
for retry after a failed write. Read/parse failures block startup with a retry
button instead of resetting progress. Browser saves retain their original keys.

Run `node --test tests/saveStore.test.js` for storage regression tests. After sync,
use Android Studio Run to update the existing installation (do not uninstall).
Check energy, owned vehicles/colors, power-ups, achievements and sound settings
after force-closing and reopening the app; then check them again after another
build/install update. Web and native saves are separate and do not synchronize.
Uninstalling or clearing app data can lose progress; this is not a cloud backup.

When adding iOS, include the Preferences-required PrivacyInfo.xcprivacy entry:
`NSPrivacyAccessedAPICategoryUserDefaults`, reason `CA92.1`, per the plugin docs:
https://capacitorjs.com/docs/apis/preferences

References:
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/getting-started/environment-setup
