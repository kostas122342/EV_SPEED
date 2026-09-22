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
- iOS, release signing, native plugins, and CI are not set up yet.

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

Before a public release, implement safe areas, app pause/resume, media recovery,
and native save persistence, then verify both browser and physical-device play.

References:
- https://capacitorjs.com/docs/getting-started
- https://capacitorjs.com/docs/getting-started/environment-setup
