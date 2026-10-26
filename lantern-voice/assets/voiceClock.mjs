export function createVoiceClock(audio, onFailure, nextFrame = () => new Promise(requestAnimationFrame)) {
  let failed = false;
  let generation = 0;

  function reportFailure() {
    failed = true;
    audio.pause();
    onFailure();
  }
  audio.addEventListener('error', reportFailure);

  return {
    pause() { generation++; audio.pause(); },
    play() {
      if (failed) return;
      const request = ++generation;
      // Called directly from a transport gesture, preserving browser audio permission.
      audio.play().catch(() => { if (request === generation) reportFailure(); });
    },
    seek(time) {
      generation++;
      audio.pause();
      audio.currentTime = time;
    },
    async waitUntil(time, cancelled) {
      while (!cancelled()) {
        if (failed) throw new Error('Narration audio could not play.');
        if (audio.currentTime + 0.001 >= time || audio.ended) return;
        await nextFrame();
      }
    },
  };
}
