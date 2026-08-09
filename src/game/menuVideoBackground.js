import { Scene } from 'phaser';

export const MENU_BACKGROUND_SCENE_KEY = 'MenuBackground';
export const MENU_VIDEO_KEY = 'menuVideo11';
export const MENU_VIDEO_PATH = 'assets/EVSPEED_1_1_1.mp4';
export const MENU_POSTER_KEY = 'menuVideoPoster';
export const MENU_POSTER_PATH = 'assets/EVSPEED-menu.webp';

const MENU_SCENES = new Set(['Menu', 'Shop', 'Settings', 'Achievements', 'MPCarSelect']);
const W = 480;
const H = 720;

export function preloadMenuVideo(scene) {
    let queued = 0;

    if (!scene.cache.video.exists(MENU_VIDEO_KEY)) {
        scene.load.video(MENU_VIDEO_KEY, MENU_VIDEO_PATH, true);
        queued += 1;
    }

    if (!scene.textures.exists(MENU_POSTER_KEY)) {
        scene.load.image(MENU_POSTER_KEY, MENU_POSTER_PATH);
        queued += 1;
    }

    return queued;
}

function fitVideo(video, width, height, sourceWidth, sourceHeight) {
    const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
    const displayWidth = sourceWidth * coverScale;
    const displayHeight = sourceHeight * coverScale;
    const maxSafeDownOffset = Math.max(0, (displayHeight - height) / 2 - 32);

    video
        .setDisplaySize(displayWidth, displayHeight)
        .setPosition(width / 2, height / 2 + maxSafeDownOffset);
}

// This scene stays alive behind every menu-related screen. Keeping one Video
// Game Object prevents the MP4 from being recreated (and briefly exposing a
// fallback image) every time the player presses Back.
export class MenuBackground extends Scene {
    constructor() {
        super(MENU_BACKGROUND_SCENE_KEY);
    }

    preload() {
        preloadMenuVideo(this);
    }

    create() {
        this.videoReady = false;
        this.cameras.main.setBackgroundColor(0x000000);

        if (this.textures.exists(MENU_POSTER_KEY)) {
            this.poster = this.add.image(W / 2, H / 2, MENU_POSTER_KEY)
                .setDisplaySize(W, H)
                .setDepth(0);
        }

        this.menuVideo = this.add.video(W / 2, H / 2, MENU_VIDEO_KEY)
            .setDepth(1)
            .setMute(true)
            .setLoop(true);

        this.menuVideo.once('created', (_video, sourceWidth, sourceHeight) => {
            fitVideo(this.menuVideo, W, H, sourceWidth, sourceHeight);
        });

        // Phaser sets frameReady only after a real decoded video frame has
        // reached the GPU texture. Waiting for that flag prevents the poster
        // or a black frame from leaking between Loading and Menu.
        this.frameReadyTimer = this.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
                if (!this.menuVideo?.frameReady) return;
                this.videoReady = true;
                if (this.poster) this.poster.setVisible(false);
                if (this.frameReadyTimer) this.frameReadyTimer.remove(false);
                this.events.emit('menu-video-ready');
            },
        });

        this.menuVideo.play(true);
    }

    pauseVideo() {
        // Keep the native video decoder running while gameplay is active.
        // The background Scene itself is slept, so it is not rendered or
        // updated, but the MP4 remains buffered for an instant Menu return.
        // Pausing the media element here caused long decoder wake-up stalls
        // on some mobile devices.
        if (this.menuVideo) this.menuVideo.setVisible(false);
    }

    resumeVideo() {
        if (!this.menuVideo) return;
        this.menuVideo.setVisible(true);
        if (!this.menuVideo.frameReady) {
            this.menuVideo.play(true);
        }
    }
}

export function startMenuVideoBackground(scene) {
    if (scene.scene.isSleeping(MENU_BACKGROUND_SCENE_KEY)) {
        scene.scene.wake(MENU_BACKGROUND_SCENE_KEY);
    } else if (!scene.scene.isActive(MENU_BACKGROUND_SCENE_KEY)) {
        scene.scene.launch(MENU_BACKGROUND_SCENE_KEY);
    }

    scene.scene.sendToBack(MENU_BACKGROUND_SCENE_KEY);
    const background = scene.scene.get(MENU_BACKGROUND_SCENE_KEY);
    background?.resumeVideo?.();
    return background;
}

export function addMenuVideoBackground(scene) {
    // Foreground menu scenes must not clear the shared scene rendered below.
    scene.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    return startMenuVideoBackground(scene)?.menuVideo || null;
}

export function stopMenuVideoBackgroundForTarget(scene, target) {
    if (MENU_SCENES.has(target)) return;
    if (scene.scene.isActive(MENU_BACKGROUND_SCENE_KEY)) {
        const background = scene.scene.get(MENU_BACKGROUND_SCENE_KEY);
        background?.pauseVideo?.();
        scene.scene.sleep(MENU_BACKGROUND_SCENE_KEY);
    }
}
