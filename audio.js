const DoomAudio = (() => {
  let ctx = null;

  function getContext() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) ctx = new Ctor();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playClick() {
    const audioCtx = getContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.032);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.038);
  }

  function playHorn() {
    const audioCtx = getContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.001, now);
    master.gain.linearRampToValueAtTime(0.42, now + 0.12);
    master.gain.exponentialRampToValueAtTime(0.001, now + 3.4);
    master.connect(audioCtx.destination);

    const partials = [73.42, 110.0, 146.83, 220.0, 293.66];
    partials.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = idx < 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.975, now + 3.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(680 - idx * 80, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 3.1);

      gain.gain.setValueAtTime(0.38 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 3.45);
    });
  }

  return { playClick, playHorn };
})();
