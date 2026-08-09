const MENU_IMAGES = [
    ['playerCar', 'assets/CarFinal.png'],
    ['energyLogo', 'assets/En4.png'],
    ['infoClear', 'assets/CLEAR.png'],
    ['infoBomb', 'assets/bomb.png'],
    ['infoShield', 'assets/shieldIcon.png'],
];

const MENU_AUDIO = [
    ['bgMusic', 'assets/EvSong.mp3'],
];

const GARAGE_IMAGES = [
    ['playerCar', 'assets/CarFinal.png'],
    ['selectEv3White', 'assets/CarFinal.png'],
    ['ev3Blue', 'assets/ev3BLUE.png'],
    ['ev3Red', 'assets/ev3RED.png'],
    ['evS', 'assets/evS.png'],
    ['evsOrange', 'assets/evsORANGE.png'],
    ['evsGreen', 'assets/evsGREEN.png'],
    ['evX', 'assets/evX.png'],
    ['evxBlue', 'assets/evxBLUE.png'],
    ['evxRed', 'assets/evxRED.png'],
    ['modelY', 'assets/modelY.png'],
    ['evYWhite', 'assets/evYWHITE.png'],
    ['evYRed', 'assets/evYRED.png'],
    ['selectModelY', 'assets/modelY.png'],
    ['selectEvYWhite', 'assets/evYWHITE.png'],
    ['selectEvYRed', 'assets/evYRED.png'],
    ['shopModelY', 'assets/modelY.png'],
    ['shopEvYWhite', 'assets/evYWHITE.png'],
    ['shopEvYRed', 'assets/evYRED.png'],
    ['cbt', 'assets/CBT.png'],
    ['cbtWhite', 'assets/CBTWHITE.png'],
    ['cbtPurple', 'assets/cbtPURPLE.png'],
    ['scooter', 'assets/SCOOTER.png'],
    ['shopBomb', 'assets/bomb.png'],
    ['shopClear', 'assets/CLEAR.png'],
    ['shieldIcon', 'assets/shieldIcon.png'],
];

const GAMEPLAY_IMAGES = [
    ['P1', 'assets/P1.png'],
    ['enemyCityEv', 'assets/enemyCityEv.png'],
    ['gameModelY', 'assets/modelY.png'],
    ['gameEvYWhite', 'assets/evYWHITE.png'],
    ['gameEvYRed', 'assets/evYRED.png'],
    ['obstacle', 'assets/obstacle.png'],
    ['truck', 'assets/Truck.png'],
    ['energyCoin', 'assets/Energy.png'],
    ['bombItem', 'assets/bomb.png'],
    ['clearItem', 'assets/CLEAR.png'],
    ['tree', 'assets/tree.png'],
    ['mountainLayer', 'assets/mountain-layer.png'],
    ['forestCityLayer', 'assets/forest-city-layer.png'],
];

const GAMEPLAY_AUDIO = [
    ['energyBeat', 'assets/energyBeat.mp3'],
    ['bombBeat', 'assets/bombBeat.mp3'],
    ['lazerBeat', 'assets/lazerBeat.mp3'],
    ['countdown', 'assets/countdown.mp3'],
];

const CAPSULE_IMAGES = [
    ['car2', 'assets/carRed.png'],
];

function queueImages(scene, assets) {
    let queued = 0;
    assets.forEach(([key, path]) => {
        if (scene.textures.exists(key)) return;
        scene.load.image(key, path);
        queued += 1;
    });
    return queued;
}

function queueAudio(scene, assets) {
    let queued = 0;
    assets.forEach(([key, path]) => {
        if (scene.cache.audio.exists(key)) return;
        scene.load.audio(key, path);
        queued += 1;
    });
    return queued;
}

function countMissingImages(scene, assets) {
    return assets.reduce(
        (missing, [key]) => missing + (scene.textures.exists(key) ? 0 : 1),
        0
    );
}

function countMissingAudio(scene, assets) {
    return assets.reduce(
        (missing, [key]) => missing + (scene.cache.audio.exists(key) ? 0 : 1),
        0
    );
}

export function preloadMenuAssets(scene) {
    return queueImages(scene, MENU_IMAGES) + queueAudio(scene, MENU_AUDIO);
}

export function preloadGarageAssets(scene) {
    return queueImages(scene, GARAGE_IMAGES);
}

export function preloadGameplayAssets(scene) {
    return preloadGarageAssets(scene)
        + queueImages(scene, GAMEPLAY_IMAGES)
        + queueAudio(scene, GAMEPLAY_AUDIO);
}

export function preloadCapsuleAssets(scene) {
    return preloadGarageAssets(scene) + queueImages(scene, CAPSULE_IMAGES);
}

export function preloadTransitionAssets(scene, kind) {
    if (kind === 'garage') return preloadGarageAssets(scene);
    if (kind === 'race') return preloadGameplayAssets(scene);
    if (kind === 'capsule') return preloadCapsuleAssets(scene);
    return 0;
}

export function hasMissingTransitionAssets(scene, kind) {
    if (kind === 'garage') {
        return countMissingImages(scene, GARAGE_IMAGES) > 0;
    }
    if (kind === 'race') {
        return countMissingImages(scene, GARAGE_IMAGES)
            + countMissingImages(scene, GAMEPLAY_IMAGES)
            + countMissingAudio(scene, GAMEPLAY_AUDIO) > 0;
    }
    if (kind === 'capsule') {
        return countMissingImages(scene, GARAGE_IMAGES)
            + countMissingImages(scene, CAPSULE_IMAGES) > 0;
    }
    return false;
}
