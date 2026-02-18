// Actions
// ---------

function togglePause(toggle) {
  const paused = store.state.paused;
  let newValue;
  if (typeof toggle === "boolean") {
    newValue = toggle;
  } else {
    newValue = !paused;
  }

  if (paused !== newValue) {
    store.setState({ paused: newValue });
  }
}

function toggleSound(toggle) {
  if (typeof toggle === "boolean") {
    store.setState({ soundEnabled: toggle });
  } else {
    store.setState({ soundEnabled: !store.state.soundEnabled });
  }
}

function toggleMenu(toggle) {
  if (typeof toggle === "boolean") {
    store.setState({ menuOpen: toggle });
  } else {
    store.setState({ menuOpen: !store.state.menuOpen });
  }
}

function updateConfig(nextConfig) {
  nextConfig = nextConfig || getConfigFromDOM();
  store.setState({
    config: Object.assign({}, store.state.config, nextConfig),
  });

  configDidUpdate();
}

// Map config to various properties & apply side effects
function configDidUpdate() {
  const config = store.state.config;

  quality = qualitySelector();
  isLowQuality = quality === QUALITY_LOW;
  isNormalQuality = quality === QUALITY_NORMAL;
  isHighQuality = quality === QUALITY_HIGH;

  if (skyLightingSelector() === SKY_LIGHT_NONE) {
    appNodes.canvasContainer.style.backgroundColor = "#000";
  }

  Spark.drawWidth = quality === QUALITY_HIGH ? 0.75 : 1;
}