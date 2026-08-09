import { hasMissingTransitionAssets } from './assetManifest.js';
import { stopMenuVideoBackgroundForTarget } from './menuVideoBackground.js';

export function transitionToScene(scene, target, targetData = {}, kind = 'quick') {
    if (scene.evspeedTransitioning) return;

    if (!hasMissingTransitionAssets(scene, kind, targetData)) {
        stopMenuVideoBackgroundForTarget(scene, target);
        scene.scene.start(target, targetData);
        return;
    }

    scene.evspeedTransitioning = true;
    const sourceSceneKey = scene.sys.settings.key;

    // Run the loader as a transparent overlay while the current screen stays
    // rendered underneath it. Transition decides after a short grace period
    // whether there is enough real loading time to show its UI at all.
    scene.scene.launch('Transition', {
        sourceSceneKey,
        target,
        targetData,
        kind,
    });
    // A real loader is always an overlay above both the current UI and the
    // persistent animated menu background. It is never used as a backdrop.
    scene.scene.bringToTop('Transition');

    // Paused scenes keep rendering but stop accepting/update-driven actions.
    // Reset the persistent guard now because Phaser reuses scene instances.
    scene.evspeedTransitioning = false;
    scene.scene.pause();
}
