const MENU_IMAGES = [
    ['playerCar', 'assets/CarFinal.webp'],
    ['energyLogo', 'assets/En4.webp'],
    ['infoClear', 'assets/CLEAR.webp'],
    ['infoBomb', 'assets/bomb.webp'],
    ['infoShield', 'assets/shieldIcon.webp'],
];

const MENU_AUDIO = [
    ['bgMusic', 'assets/EvSong.mp3'],
];

const GARAGE_IMAGES = [
    ['playerCar', 'assets/CarFinal.webp'],
    ['selectEv3White', 'assets/CarFinal.webp'],
    ['ev3Blue', 'assets/ev3BLUE.webp'],
    ['ev3Red', 'assets/ev3RED.webp'],
    ['evS', 'assets/evS.webp'],
    ['evsOrange', 'assets/evsORANGE.webp'],
    ['evsGreen', 'assets/evsGREEN.webp'],
    ['evX', 'assets/evX.webp'],
    ['evxBlue', 'assets/evxBLUE.webp'],
    ['evxRed', 'assets/evxRED.webp'],
    ['modelY', 'assets/modelY.webp'],
    ['evYWhite', 'assets/evYWHITE.webp'],
    ['evYRed', 'assets/evYRED.webp'],
    ['selectModelY', 'assets/modelY.webp'],
    ['selectEvYWhite', 'assets/evYWHITE.webp'],
    ['selectEvYRed', 'assets/evYRED.webp'],
    ['shopModelY', 'assets/modelY.webp'],
    ['shopEvYWhite', 'assets/evYWHITE.webp'],
    ['shopEvYRed', 'assets/evYRED.webp'],
    ['cbt', 'assets/CBT.webp'],
    ['cbtWhite', 'assets/CBTWHITE.webp'],
    ['cbtPurple', 'assets/cbtPURPLE.webp'],
    ['scooter', 'assets/SCOOTER.webp'],
    ['shopBomb', 'assets/bomb.webp'],
    ['shopClear', 'assets/CLEAR.webp'],
    ['shieldIcon', 'assets/shieldIcon.webp'],
];

const GAMEPLAY_IMAGES = [
    ['energyLogo', 'assets/En4.webp'],
    ['shieldIcon', 'assets/shieldIcon.webp'],
    ['obstacle', 'assets/obstacle.webp'],
    ['energyCoin', 'assets/Energy.webp'],
    ['energyBar', 'assets/energy-bar.webp'],
    ['bombItem', 'assets/bomb.webp'],
    ['clearItem', 'assets/CLEAR.webp'],
    ['tree', 'assets/tree.webp'],
    ['mountainLayer', 'assets/mountain-layer.webp'],
    ['forestCityLayer', 'assets/forest-city-layer.webp'],
];

const PSEUDO3D_FRAME_CONFIG = { frameWidth: 400, frameHeight: 540 };

export const PLAYER_PSEUDO3D_CONFIGS = {
    playerCar:  { textureKey: 'ev3Pseudo3dWhite', path: 'assets/ev3-pseudo3d-white.webp', scale: 0.288, maxFrame: 4, inset: 14, hitboxGain: 3 },
    ev3Blue:    { textureKey: 'ev3Pseudo3dBlue',  path: 'assets/ev3-pseudo3d-blue-rendered.webp',  scale: 0.288, maxFrame: 4, inset: 14, hitboxGain: 3, crossFade: false },
    ev3Red:     { textureKey: 'ev3Pseudo3dRed',   path: 'assets/ev3-pseudo3d-red-rendered.webp',   scale: 0.288, maxFrame: 4, inset: 14, hitboxGain: 3, crossFade: false },
    modelY:     { textureKey: 'evyPseudo3dGrey',  path: 'assets/evy-pseudo3d-grey.webp',  scale: 0.260, maxFrame: 4, inset: 14 },
    evYWhite:   { textureKey: 'evyPseudo3dWhite', path: 'assets/evy-pseudo3d-white-rendered.webp', scale: 0.260, maxFrame: 4, inset: 14, crossFade: false },
    evYRed:     { textureKey: 'evyPseudo3dRed',   path: 'assets/evy-pseudo3d-red-rendered.webp',   scale: 0.260, maxFrame: 4, inset: 14, crossFade: false },
    evS:        { textureKey: 'evsPseudo3dBlue',  path: 'assets/evs-pseudo3d-blue.webp',  scale: 0.238, maxFrame: 3, inset: 11, rotation: 0.075 },
    evsOrange:  { textureKey: 'evsPseudo3dOrange',path: 'assets/evs-pseudo3d-orange-rendered.webp',scale: 0.238, maxFrame: 3, inset: 11, rotation: 0.075, crossFade: false },
    evsGreen:   { textureKey: 'evsPseudo3dGreen', path: 'assets/evs-pseudo3d-green-rendered.webp', scale: 0.238, maxFrame: 3, inset: 11, rotation: 0.075, crossFade: false },
    evX:        { textureKey: 'evxPseudo3dBlack', path: 'assets/evx-pseudo3d-black.webp', scale: 0.227, maxFrame: 3, inset: 11 },
    evxBlue:    { textureKey: 'evxPseudo3dBlue',  path: 'assets/evx-pseudo3d-blue-rendered.webp',  scale: 0.227, maxFrame: 3, inset: 11, crossFade: false },
    evxRed:     { textureKey: 'evxPseudo3dRed',   path: 'assets/evx-pseudo3d-red-rendered.webp',   scale: 0.227, maxFrame: 3, inset: 11, crossFade: false },
    cbtWhite:   { textureKey: 'cbtPseudo3dWhite', path: 'assets/cbt-pseudo3d-white-rendered.webp', scale: 0.270, maxFrame: 3, inset: 11, crossFade: false },
    cbt:        { textureKey: 'cbtPseudo3dGrey',  path: 'assets/cbt-pseudo3d-grey.webp',  scale: 0.270, maxFrame: 3, inset: 11 },
    cbtPurple:  { textureKey: 'cbtPseudo3dPurple',path: 'assets/cbt-pseudo3d-purple-rendered.webp',scale: 0.270, maxFrame: 3, inset: 11, crossFade: false },
    scooter:    { textureKey: 'scooterPseudo3d',  path: 'assets/scooter-pseudo3d.webp',   scale: 0.222, maxFrame: 3, laneAngle: 1, inset: 10, reverseFlip: true, crossFade: false },
};

const GAMEPLAY_SPRITESHEETS = [
    ['enemyP1Pseudo3d', 'assets/enemy-p1-pseudo3d.webp', { frameWidth: 400, frameHeight: 540 }],
    ['enemyCityPseudo3d', 'assets/enemy-city-pseudo3d.webp', { frameWidth: 400, frameHeight: 540 }],
    ['truckPseudo3d', 'assets/truck-pseudo3d.webp', { frameWidth: 400, frameHeight: 540 }],
];

const VARIANT_DEFAULTS = {
    playerCar: 'playerCar',
    modelY: 'evYWhite',
    evS: 'evS',
    evX: 'evX',
    cbt: 'cbtWhite',
};

export function resolveGameplayPlayerVariant(data = {}) {
    const multiplayer = !!data.mp;
    const player = data.player || 1;
    const selectedCar = multiplayer
        ? (player === 1 ? data.p1Car : data.p2Car) || 'playerCar'
        : data.carKey || localStorage.getItem('evspeed_selected_car') || 'playerCar';
    if (!VARIANT_DEFAULTS[selectedCar]) return selectedCar;
    const multiplayerColor = multiplayer
        ? (player === 1 ? data.p1Color : data.p2Color)
        : null;
    return multiplayerColor
        || localStorage.getItem(`evspeed_activeColor_${selectedCar}`)
        || VARIANT_DEFAULTS[selectedCar];
}

export function getPlayerPseudo3DConfig(variantKey) {
    return PLAYER_PSEUDO3D_CONFIGS[variantKey] || PLAYER_PSEUDO3D_CONFIGS.playerCar;
}

export function pruneUnusedPlayerPseudo3DTextures(scene, keepTextureKey) {
    const textureKeys = new Set(
        Object.values(PLAYER_PSEUDO3D_CONFIGS).map(config => config.textureKey)
    );
    textureKeys.delete(keepTextureKey);
    textureKeys.forEach(textureKey => {
        if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
    });
}

function selectedPlayerSpritesheet(data = {}) {
    const config = getPlayerPseudo3DConfig(resolveGameplayPlayerVariant(data));
    return [config.textureKey, config.path, PSEUDO3D_FRAME_CONFIG];
}

const GAMEPLAY_AUDIO = [
    ['energyBeat', 'assets/energyBeat.mp3'],
    ['bombBeat', 'assets/bombBeat.mp3'],
    ['lazerBeat', 'assets/lazerBeat.mp3'],
    ['countdown', 'assets/countdown.mp3'],
];

const CAPSULE_IMAGES = [
    ['car2', 'assets/carRed.webp'],
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

function queueSpritesheets(scene, assets) {
    let queued = 0;
    assets.forEach(([key, path, frameConfig]) => {
        if (scene.textures.exists(key)) return;
        scene.load.spritesheet(key, path, frameConfig);
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

export function preloadGameplayAssets(scene, data = {}) {
    return queueImages(scene, GAMEPLAY_IMAGES)
        + queueSpritesheets(scene, GAMEPLAY_SPRITESHEETS)
        + queueSpritesheets(scene, [selectedPlayerSpritesheet(data)])
        + queueAudio(scene, GAMEPLAY_AUDIO);
}

export function getGameplayTextureKeys(data = {}) {
    return [
        ...GAMEPLAY_IMAGES.map(([key]) => key),
        ...GAMEPLAY_SPRITESHEETS.map(([key]) => key),
        selectedPlayerSpritesheet(data)[0],
    ];
}

export function preloadCapsuleAssets(scene) {
    return preloadGarageAssets(scene) + queueImages(scene, CAPSULE_IMAGES);
}

export function preloadTransitionAssets(scene, kind, targetData = {}) {
    if (kind === 'garage') return preloadGarageAssets(scene);
    if (kind === 'race') return preloadGameplayAssets(scene, targetData);
    if (kind === 'capsule') return preloadCapsuleAssets(scene);
    return 0;
}

export function hasMissingTransitionAssets(scene, kind, targetData = {}) {
    if (kind === 'garage') {
        return countMissingImages(scene, GARAGE_IMAGES) > 0;
    }
    if (kind === 'race') {
        return countMissingImages(scene, GAMEPLAY_IMAGES)
            + countMissingImages(scene, GAMEPLAY_SPRITESHEETS)
            + countMissingImages(scene, [selectedPlayerSpritesheet(targetData)])
            + countMissingAudio(scene, GAMEPLAY_AUDIO) > 0;
    }
    if (kind === 'capsule') {
        return countMissingImages(scene, GARAGE_IMAGES)
            + countMissingImages(scene, CAPSULE_IMAGES) > 0;
    }
    return false;
}
