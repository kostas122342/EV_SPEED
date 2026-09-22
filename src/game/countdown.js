// Shared by the two-player race start and the pause overlay.
export function showRaceCountdown(scene, { label, color = '#00cfff', fontStyle = 'normal', onComplete }) {
    const ov = scene.add.graphics().setDepth(24);
    ov.fillStyle(0x000000, 0.70);
    ov.fillRect(0, 0, 480, 720);
    const lbl = scene.add.text(240, 270, label, {
        fontFamily: 'Arial Black', fontSize: 34, color, fontStyle,
        stroke: '#000000', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(25);
    const numTxt = scene.add.text(240, 370, '3', {
        fontFamily: 'Arial Black', fontSize: 100, color: '#ffffff', fontStyle,
        stroke: '#000000', strokeThickness: 10,
    }).setOrigin(0.5).setDepth(25);
    const sound = localStorage.getItem('evspeed_sfx') !== 'false'
        ? scene.sound.add('countdown', { volume: 0.8 }) : null;
    sound?.play();
    const stopSound = () => sound?.destroy();
    scene.events.once('shutdown', stopSound);
    const steps = ['3', '2', '1', 'GO!'];
    let i = 0;
    const tick = () => {
        numTxt.setText(steps[i++]).setScale(1.5);
        scene.tweens.add({ targets: numTxt, scaleX: 1, scaleY: 1,
            duration: 700, ease: 'Back.easeOut' });
        if (i < steps.length) scene.time.delayedCall(900, tick);
        else scene.time.delayedCall(650, () => {
            scene.events.off('shutdown', stopSound);
            stopSound();
            scene.tweens.add({ targets: [ov, lbl, numTxt], alpha: 0, duration: 300,
                onComplete: () => { ov.destroy(); lbl.destroy(); numTxt.destroy(); } });
            onComplete();
        });
    };
    tick();
}
