const MENU_VIDEO_KEY = 'menuVideo11';
const MENU_VIDEO_PATH = 'assets/EVSPEED_1_1_1.mp4';

export function preloadMenuVideo(scene) {
    scene.load.video(MENU_VIDEO_KEY, MENU_VIDEO_PATH, true);
}

export function addMenuVideoBackground(scene, width, height) {
    scene.cameras.main.setBackgroundColor(0x000000);

    const video = scene.add.video(width / 2, height / 2, MENU_VIDEO_KEY)
        .setDepth(0)
        .setMute(true)
        .setLoop(true);

    video.once('created', (_video, sourceWidth, sourceHeight) => {
        const coverScale = Math.max(width / sourceWidth, height / sourceHeight);
        const displayWidth = sourceWidth * coverScale;
        const displayHeight = sourceHeight * coverScale;
        const maxSafeDownOffset = Math.max(0, (displayHeight - height) / 2 - 32);

        video
            .setDisplaySize(displayWidth, displayHeight)
            .setPosition(width / 2, height / 2 + maxSafeDownOffset);
    });

    video.play(true);

    return video;
}
