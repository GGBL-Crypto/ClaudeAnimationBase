// p5 otherwise auto-starts at window.load while asynchronous asset admission is still pending.
// Reserve global mode until animationEngine.init explicitly creates the real instance.
p5.instance={deferredByAnimationEngine:true};
