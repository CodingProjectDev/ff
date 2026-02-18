// audio.js
const soundManager = {
  baseURL: "./assets/", 

  ctx: new (window.AudioContext || window.webkitAudioContext)(),

  sources: {
    lift: {
      volume: 1,
      playbackRateMin: 0.85,
      playbackRateMax: 0.95,
      fileNames: ["lift1.mp3", "lift2.mp3", "lift3.mp3"],
    },
    burst: {
      volume: 1,
      playbackRateMin: 0.8,
      playbackRateMax: 0.9,
      fileNames: ["burst1.mp3", "burst2.mp3"],
    },
    burstSmall: {
      volume: 0.25,
      playbackRateMin: 0.8,
      playbackRateMax: 1,
      fileNames: ["burst-sm-1.mp3", "burst-sm-2.mp3"],
    },
    crackle: {
      volume: 0.2,
      playbackRateMin: 1,
      playbackRateMax: 1,
      fileNames: ["crackle1.mp3"],
    },
    crackleSmall: {
      volume: 0.3,
      playbackRateMin: 1,
      playbackRateMax: 1,
      fileNames: ["crackle-sm-1.mp3"],
    },
  },

  preload() {
    const allFilePromises = [];

    function checkStatus(response) {
      if (response.status >= 200 && response.status < 300) {
        return response;
      }
      const customError = new Error(response.statusText);
      customError.response = response;
      throw customError;
    }

    const types = Object.keys(this.sources);

    types.forEach((type) => {
      const source = this.sources[type];
      const { fileNames } = source;
      const filePromises = [];

      fileNames.forEach((fileName) => {
        const fileURL = this.baseURL + fileName;

        const promise = fetch(fileURL)
          .then(checkStatus)
          .then((response) => response.arrayBuffer())
          .then(
            (data) =>
              new Promise((resolve, reject) => {
                this.ctx.decodeAudioData(
                  data,
                  (buffer) => resolve(buffer),
                  (err) => reject(new Error(`Decode failed for ${fileName}: ${err.message}`))
                );
              })
          )
          .catch((err) => {
            console.error(`Failed to load sound: ${fileURL}`, err);
            return null; // continue even if one file fails
          });

        filePromises.push(promise);
        allFilePromises.push(promise);
      });

      Promise.all(filePromises).then((buffers) => {
        // Remove failed (null) buffers
        source.buffers = buffers.filter(Boolean);
        if (source.buffers.length === 0) {
          console.warn(`No valid buffers loaded for sound type: ${type}`);
        }
      });
    });

    return Promise.all(allFilePromises).then(() => {
      console.log("Sound preloading finished");
    });
  },

  pauseAll() {
    this.ctx.suspend();
  },

  resumeAll() {
    // Play silent sound to unlock on iOS
    this.playSound("lift", 0);

    // Give browser time to register user interaction
    // MOVED TO SYNC EXECUTION
    if (typeof this.ctx.resume === 'function') {
      this.ctx.resume().then(() => {
        console.log('AudioContext resumed');
      }).catch(err => {
        console.warn("Failed to resume AudioContext:", err);
      });
    }
  },

  // Throttle small bursts
  _lastSmallBurstTime: 0,

  /**
   * Play a sound of `type`. Picks random file, applies volume & playback rate variation.
   */
  playSound(type, scale = 1) {
    scale = MyMath.clamp(scale, 0, 1);

    // Skip if sound disabled, slow motion, or paused
    if (!canPlaySoundSelector() || simSpeed < 0.95) {
      return;
    }

    // Throttle burstSmall (floral shells have many)
    if (type === "burstSmall") {
      const now = Date.now();
      if (now - this._lastSmallBurstTime < 20) return;
      this._lastSmallBurstTime = now;
    }

    const source = this.sources[type];
    if (!source) {
      console.error(`Sound type "${type}" not found`);
      return;
    }

    if (!source.buffers || source.buffers.length === 0) {
      console.warn(`No buffers available for ${type}`);
      return;
    }

    const initialVolume = source.volume;
    const initialPlaybackRate = MyMath.random(
      source.playbackRateMin,
      source.playbackRateMax
    );

    const scaledVolume = initialVolume * scale;
    const scaledPlaybackRate = initialPlaybackRate * (2 - scale);

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = scaledVolume;

    const buffer = MyMath.randomChoice(source.buffers);

    const bufferSource = this.ctx.createBufferSource();
    bufferSource.playbackRate.value = scaledPlaybackRate;
    bufferSource.buffer = buffer;
    bufferSource.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    bufferSource.start(0);
  },
};