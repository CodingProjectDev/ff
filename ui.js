// First render is called in init()
function renderApp(state) {
  const pauseBtnIcon = `#icon-${state.paused ? "play" : "pause"}`;
  const soundBtnIcon = `#icon-sound-${soundEnabledSelector() ? "on" : "off"}`;
  appNodes.pauseBtnSVG.setAttribute("href", pauseBtnIcon);
  appNodes.pauseBtnSVG.setAttribute("xlink:href", pauseBtnIcon);
  appNodes.soundBtnSVG.setAttribute("href", soundBtnIcon);
  appNodes.soundBtnSVG.setAttribute("xlink:href", soundBtnIcon);
  appNodes.controls.classList.toggle(
    "hide",
    state.menuOpen || state.config.hideControls
  );
  appNodes.canvasContainer.classList.toggle("blur", state.menuOpen);
  appNodes.menu.classList.toggle("hide", !state.menuOpen);
  appNodes.finaleModeFormOption.style.opacity = state.config.autoLaunch
    ? 1
    : 0.32;

  appNodes.quality.value = state.config.quality;
  appNodes.shellType.value = state.config.shell;
  appNodes.shellSize.value = state.config.size;
  appNodes.textBurst.value = state.config.textBurst;
  appNodes.droneShow.checked = state.config.droneShow;
  appNodes.autoLaunch.checked = state.config.autoLaunch;
  appNodes.finaleMode.checked = state.config.finale;
  appNodes.skyLighting.value = state.config.skyLighting;
  appNodes.hideControls.checked = state.config.hideControls;
  appNodes.fullscreen.checked = state.fullscreen;
  appNodes.longExposure.checked = state.config.longExposure;
  appNodes.scaleFactor.value = state.config.scaleFactor.toFixed(2);

  appNodes.menuInnerWrap.style.opacity = state.openHelpTopic ? 0.12 : 1;
  appNodes.helpModal.classList.toggle("active", !!state.openHelpTopic);
  if (state.openHelpTopic) {
    const { header, body } = helpContent[state.openHelpTopic];
    appNodes.helpModalHeader.textContent = header;
    appNodes.helpModalBody.textContent = body;
  }
}

store.subscribe(renderApp);

// Perform side effects on state changes
function handleStateChange(state, prevState) {
  const canPlaySound = canPlaySoundSelector(state);
  const canPlaySoundPrev = canPlaySoundSelector(prevState);

  if (canPlaySound !== canPlaySoundPrev) {
    if (canPlaySound) {
      soundManager.resumeAll();
    } else {
      soundManager.pauseAll();
    }
  }
}

store.subscribe(handleStateChange);

function getConfigFromDOM() {
  return {
    quality: appNodes.quality.value,
    shell: appNodes.shellType.value,
    size: appNodes.shellSize.value,
    textBurst: appNodes.textBurst.value.trim() || "WOW 2026",
    droneShow: appNodes.droneShow.checked,
    autoLaunch: appNodes.autoLaunch.checked,
    finale: appNodes.finaleMode.checked,
    skyLighting: appNodes.skyLighting.value,
    longExposure: appNodes.longExposure.checked,
    hideControls: appNodes.hideControls.checked,
    // Store value as number.
    scaleFactor: parseFloat(appNodes.scaleFactor.value),
  };
}

const updateConfigNoEvent = () => updateConfig();
appNodes.quality.addEventListener("input", updateConfigNoEvent);
appNodes.shellType.addEventListener("input", updateConfigNoEvent);
appNodes.shellSize.addEventListener("input", updateConfigNoEvent);
appNodes.textBurst.addEventListener("input", updateConfigNoEvent);
appNodes.droneShow.addEventListener("click", () => setTimeout(updateConfig, 0));
appNodes.autoLaunch.addEventListener("click", () => setTimeout(updateConfig, 0));
appNodes.finaleMode.addEventListener("click", () => setTimeout(updateConfig, 0));
appNodes.skyLighting.addEventListener("input", updateConfigNoEvent);
appNodes.longExposure.addEventListener("click", () =>
  setTimeout(updateConfig, 0)
);
appNodes.hideControls.addEventListener("click", () =>
  setTimeout(updateConfig, 0)
);
appNodes.fullscreen.addEventListener("click", () =>
  setTimeout(toggleFullscreen, 0)
);
// Changing scaleFactor requires triggering resize handling code as well.
appNodes.scaleFactor.addEventListener("input", () => {
  updateConfig();
  handleResize();
});

Object.keys(nodeKeyToHelpKey).forEach((nodeKey) => {
  const helpKey = nodeKeyToHelpKey[nodeKey];
  appNodes[nodeKey].addEventListener("click", () => {
    store.setState({ openHelpTopic: helpKey });
  });
});

appNodes.helpModalCloseBtn.addEventListener("click", () => {
  store.setState({ openHelpTopic: null });
});

appNodes.helpModalOverlay.addEventListener("click", () => {
  store.setState({ openHelpTopic: null });
});

// Prevent canvas pointer handlers from firing when clicking controls
function blockCanvasPointer(event) {
  event.preventDefault();
  event.stopPropagation();
}

appNodes.pauseBtn.addEventListener("pointerdown", blockCanvasPointer);
appNodes.pauseBtn.addEventListener("pointerstart", blockCanvasPointer);
appNodes.pauseBtn.addEventListener("click", blockCanvasPointer);

appNodes.soundBtn.addEventListener("pointerdown", blockCanvasPointer);
appNodes.soundBtn.addEventListener("pointerstart", blockCanvasPointer);
appNodes.soundBtn.addEventListener("click", blockCanvasPointer);

// Controls handlers
appNodes.pauseBtn.addEventListener("click", () => togglePause());
appNodes.soundBtn.addEventListener("click", () => toggleSound());
appNodes.settingsBtn = appNodes.controls.querySelector(".settings-btn");
appNodes.settingsBtn.addEventListener("pointerdown", blockCanvasPointer);
appNodes.settingsBtn.addEventListener("pointerstart", blockCanvasPointer);
appNodes.settingsBtn.addEventListener("click", blockCanvasPointer);
appNodes.settingsBtn.addEventListener("click", () => toggleMenu());
appNodes.closeMenuBtn = appNodes.menu.querySelector(".close-menu-btn");
appNodes.closeMenuBtn.addEventListener("pointerdown", blockCanvasPointer);
appNodes.closeMenuBtn.addEventListener("pointerstart", blockCanvasPointer);
appNodes.closeMenuBtn.addEventListener("click", blockCanvasPointer);
appNodes.closeMenuBtn.addEventListener("click", () => toggleMenu(false));