"use strict";
console.clear();

const IS_MOBILE = (() => { const ua = (navigator.userAgent || "").toLowerCase(); return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) || window.innerWidth <= 640; })();
const IS_DESKTOP = window.innerWidth > 800;
const IS_HEADER = IS_DESKTOP && window.innerHeight < 300;
const IS_HIGH_END_DEVICE = (() => {
  const hwConcurrency = navigator.hardwareConcurrency;
  if (!hwConcurrency) {
    return false;
  }
  const minCount = window.innerWidth <= 1024 ? 4 : 8;
  return hwConcurrency >= minCount;
})();
const MAX_WIDTH = 7680;
const MAX_HEIGHT = 4320;
const GRAVITY = 0.9;
let simSpeed = 1;

function getDefaultScaleFactor() {
  if (IS_MOBILE) return 0.9;
  if (IS_HEADER) return 0.75;
  return 1;
}

let stageW, stageH;

let quality = 1;
let isLowQuality = false;
let isNormalQuality = true;
let isHighQuality = false;

const QUALITY_LOW = 1;
const QUALITY_NORMAL = 2;
const QUALITY_HIGH = 3;

const SKY_LIGHT_NONE = 0;
const SKY_LIGHT_DIM = 1;
const SKY_LIGHT_NORMAL = 2;

const COLOR = {
  Red: "#ff0043",
  Green: "#14fc56",
  Blue: "#1e7fff",
  Purple: "#e60aff",
  Gold: "#ffbf36",
  White: "#ffffff",
};

const INVISIBLE = "_INVISIBLE_";

const PI_2 = Math.PI * 2;
const PI_HALF = Math.PI * 0.5;

const trailsStage = new Stage("trails-canvas");
const mainStage = new Stage("main-canvas");
const stages = [trailsStage, mainStage];

function fullscreenEnabled() {
  return fscreen.fullscreenEnabled;
}

function isFullscreen() {
  return !!fscreen.fullscreenElement;
}

function toggleFullscreen() {
  if (fullscreenEnabled()) {
    if (isFullscreen()) {
      fscreen.exitFullscreen();
    } else {
      fscreen.requestFullscreen(document.documentElement);
    }
  }
}

fscreen.addEventListener("fullscreenchange", () => {
  store.setState({ fullscreen: isFullscreen() });
});

const store = {
  _listeners: new Set(),
  _dispatch(prevState) {
    this._listeners.forEach((listener) => listener(this.state, prevState));
  },

  state: {
    paused: true,
    soundEnabled: false,
    menuOpen: false,
    openHelpTopic: null,
    fullscreen: isFullscreen(),
    config: {
      quality: String(IS_HIGH_END_DEVICE ? QUALITY_HIGH : QUALITY_NORMAL),
      shell: "Random",
      size: IS_DESKTOP ? "3" : IS_HEADER ? "1.2" : "2",
      autoLaunch: true,
      finale: false,
      skyLighting: SKY_LIGHT_NORMAL + "",
      hideControls: IS_HEADER,
      longExposure: false,
      scaleFactor: getDefaultScaleFactor(),
      textBurst: "WOW 2026",
      droneShow: false,
    },
  },

  setState(nextState) {
    const prevState = this.state;
    this.state = Object.assign({}, this.state, nextState);
    this._dispatch(prevState);
    this.persist();
  },

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.remove(listener);
  },

  load() {
    const serializedData = localStorage.getItem("cm_fireworks_data");
    if (serializedData) {
      const { schemaVersion, data } = JSON.parse(serializedData);

      const config = this.state.config;
      switch (schemaVersion) {
        case "1.1":
          config.quality = data.quality;
          config.size = data.size;
          config.skyLighting = data.skyLighting;
          config.textBurst = "WOW 2026";
          config.droneShow = false;
          break;
        case "1.2":
          config.quality = data.quality;
          config.size = data.size;
          config.skyLighting = data.skyLighting;
          config.scaleFactor = data.scaleFactor;
          config.textBurst = "WOW 2026";
          config.droneShow = false;
          break;
        case "1.3":
          config.quality = data.quality;
          config.size = data.size;
          config.skyLighting = data.skyLighting;
          config.scaleFactor = data.scaleFactor;
          config.textBurst = data.textBurst || "WOW 2026";
          config.droneShow = false;
          break;
        case "1.4":
          config.quality = data.quality;
          config.size = data.size;
          config.skyLighting = data.skyLighting;
          config.scaleFactor = data.scaleFactor;
          config.textBurst = data.textBurst || "WOW 2026";
          config.droneShow = !!data.droneShow;
          break;
        default:
          throw new Error("version switch should be exhaustive");
      }
      console.log(`Loaded config (schema version ${schemaVersion})`);
    } else if (localStorage.getItem("schemaVersion") === "1") {
      let size;
      try {
        const sizeRaw = localStorage.getItem("configSize");
        size = typeof sizeRaw === "string" && JSON.parse(sizeRaw);
      } catch (e) {
        console.log("Recovered from error parsing saved config:");
        console.error(e);
        return;
      }
      const sizeInt = parseInt(size, 10);
      if (sizeInt >= 0 && sizeInt <= 4) {
        this.state.config.size = String(sizeInt);
      }
    }
  },

  persist() {
    const config = this.state.config;
    localStorage.setItem(
      "cm_fireworks_data",
      JSON.stringify({
        schemaVersion: "1.4",
        data: {
          quality: config.quality,
          size: config.size,
          skyLighting: config.skyLighting,
          scaleFactor: config.scaleFactor,
          textBurst: config.textBurst,
          droneShow: config.droneShow,
        },
      })
    );
  },
};

if (!IS_HEADER) {
  store.load();
}

const isRunning = (state = store.state) => !state.paused && !state.menuOpen;
const soundEnabledSelector = (state = store.state) => state.soundEnabled;
const canPlaySoundSelector = (state = store.state) =>
  isRunning(state) && soundEnabledSelector(state);
const qualitySelector = () => +store.state.config.quality;
const shellNameSelector = () => store.state.config.shell;
const shellSizeSelector = () => +store.state.config.size;
const finaleSelector = () => store.state.config.finale;
const skyLightingSelector = () => +store.state.config.skyLighting;
const scaleFactorSelector = () => store.state.config.scaleFactor;
const textBurstSelector = () => store.state.config.textBurst;

const helpContent = {
  shellType: {
    header: "Shell Type",
    body:
      'The type of firework that will be launched. Select "Random" for a nice assortment!',
  },
  shellSize: {
    header: "Shell Size",
    body:
      "The size of the fireworks. Modeled after real firework shell sizes, larger shells have bigger bursts with more stars, and sometimes more complex effects. However, larger shells also require more processing power and may cause lag.",
  },
  textBurst: {
    header: "Burst Text",
    body:
      'Text used for the "Text" shell type. Keep it short for best results. Example: "WOW 2026".',
  },
  droneShow: {
    header: "Drone Show",
    body:
      'Plays a looping 50s drone formation show alongside fireworks (heart → star → "WOW 2027" → smiley → diamond → ring).',
  },
  quality: {
    header: "Quality",
    body:
      "Overall graphics quality. If the animation is not running smoothly, try lowering the quality. High quality greatly increases the amount of sparks rendered and may cause lag.",
  },
  skyLighting: {
    header: "Sky Lighting",
    body:
      'Illuminates the background as fireworks explode. If the background looks too bright on your screen, try setting it to "Dim" or "None".',
  },
  scaleFactor: {
    header: "Scale",
    body:
      "Allows scaling the size of all fireworks, essentially moving you closer or farther away. For larger shell sizes, it can be convenient to decrease the scale a bit, especially on phones or tablets.",
  },
  autoLaunch: {
    header: "Auto Fire",
    body:
      "Launches sequences of fireworks automatically. Sit back and enjoy the show, or disable to have full control.",
  },
  finaleMode: {
    header: "Finale Mode",
    body:
      'Launches intense bursts of fireworks. May cause lag. Requires "Auto Fire" to be enabled.',
  },
  hideControls: {
    header: "Hide Controls",
    body:
      "Hides the translucent controls along the top of the screen. Useful for screenshots, or just a more seamless experience. While hidden, you can still tap the top-right corner to re-open this menu.",
  },
  fullscreen: {
    header: "Fullscreen",
    body: "Toggles fullscreen mode.",
  },
  longExposure: {
    header: "Open Shutter",
    body:
      "Experimental effect that preserves long streaks of light, similar to leaving a camera shutter open.",
  },
};

const nodeKeyToHelpKey = {
  shellTypeLabel: "shellType",
  shellSizeLabel: "shellSize",
  textBurstLabel: "textBurst",
  droneShowLabel: "droneShow",
  qualityLabel: "quality",
  skyLightingLabel: "skyLighting",
  scaleFactorLabel: "scaleFactor",
  autoLaunchLabel: "autoLaunch",
  finaleModeLabel: "finaleMode",
  hideControlsLabel: "hideControls",
  fullscreenLabel: "fullscreen",
  longExposureLabel: "longExposure",
};

const appNodes = {
  stageContainer: ".stage-container",
  canvasContainer: ".canvas-container",
  controls: ".controls",
  menu: ".menu",
  menuInnerWrap: ".menu__inner-wrap",
  pauseBtn: ".pause-btn",
  pauseBtnSVG: ".pause-btn use",
  soundBtn: ".sound-btn",
  soundBtnSVG: ".sound-btn use",
  shellType: ".shell-type",
  shellTypeLabel: ".shell-type-label",
  shellSize: ".shell-size",
  shellSizeLabel: ".shell-size-label",
  textBurst: ".text-burst",
  textBurstLabel: ".text-burst-label",
  droneShow: ".drone-show",
  droneShowLabel: ".drone-show-label",
  quality: ".quality-ui",
  qualityLabel: ".quality-ui-label",
  skyLighting: ".sky-lighting",
  skyLightingLabel: ".sky-lighting-label",
  scaleFactor: ".scaleFactor",
  scaleFactorLabel: ".scaleFactor-label",
  autoLaunch: ".auto-launch",
  autoLaunchLabel: ".auto-launch-label",
  finaleModeFormOption: ".form-option--finale-mode",
  finaleMode: ".finale-mode",
  finaleModeLabel: ".finale-mode-label",
  hideControls: ".hide-controls",
  hideControlsLabel: ".hide-controls-label",
  fullscreenFormOption: ".form-option--fullscreen",
  fullscreen: ".fullscreen",
  fullscreenLabel: ".fullscreen-label",
  longExposure: ".long-exposure",
  longExposureLabel: ".long-exposure-label",

  helpModal: ".help-modal",
  helpModalOverlay: ".help-modal__overlay",
  helpModalHeader: ".help-modal__header",
  helpModalBody: ".help-modal__body",
  helpModalCloseBtn: ".help-modal__close-btn",
};

Object.keys(appNodes).forEach((key) => {
  appNodes[key] = document.querySelector(appNodes[key]);
});

if (!fullscreenEnabled()) {
  appNodes.fullscreenFormOption.classList.add("remove");
}

let currentFrame = 0;
let speedBarOpacity = 0;
let autoLaunchTime = 0;