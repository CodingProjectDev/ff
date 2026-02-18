function init() {
  // Remove loading state
  document.querySelector(".loading-init").remove();
  appNodes.stageContainer.classList.remove("remove");

  // Populate dropdowns
  function setOptionsForSelect(node, options) {
    node.innerHTML = options.reduce(
      (acc, opt) => (acc += `<option value="${opt.value}">${opt.label}</option>`),
      ""
    );
  }

  // shell type
  let options = "";
  shellNames.forEach((opt) => (options += `<option value="${opt}">${opt}</option>`));
  appNodes.shellType.innerHTML = options;
  
  // shell size
  options = "";
  ['3"', '4"', '6"', '8"', '12"', '16"'].forEach(
    (opt, i) => (options += `<option value="${i}">${opt}</option>`)
  );
  appNodes.shellSize.innerHTML = options;

  setOptionsForSelect(appNodes.quality, [
    { label: "Low", value: QUALITY_LOW },
    { label: "Normal", value: QUALITY_NORMAL },
    { label: "High", value: QUALITY_HIGH },
  ]);

  setOptionsForSelect(appNodes.skyLighting, [
    { label: "None", value: SKY_LIGHT_NONE },
    { label: "Dim", value: SKY_LIGHT_DIM },
    { label: "Normal", value: SKY_LIGHT_NORMAL },
  ]);

  setOptionsForSelect(
    appNodes.scaleFactor,
    [0.5, 0.62, 0.75, 0.9, 1.0, 1.5, 2.0].map((value) => ({
      value: value.toFixed(2),
      label: `${value * 100}%`,
    }))
  );

  // Begin simulation
  togglePause(false);

  // initial render
  renderApp(store.state);

  // Apply initial config
  configDidUpdate();
  
  console.log('✓ Fireworks initialized');
}

// Kick things off.
function setLoadingStatus(status) {
  const el = document.querySelector(".loading-init__status");
  if (el) el.textContent = status;
}

// Compute initial dimensions
handleResize();
window.addEventListener("resize", handleResize);

// Mobile optimization: Initialize without waiting for audio
if (IS_HEADER) {
  init();
} else {
  setLoadingStatus("Lighting Fuses");
  
  // MOBILE FIX: Don't block on audio, init immediately
  setTimeout(() => {
    // Try to load audio in background (won't block init)
    if (typeof soundManager !== 'undefined' && soundManager.preload) {
      soundManager.preload().then(() => {
        console.log('Audio loaded');
      }).catch(() => {
        console.log('Audio load skipped (mobile optimization)');
      });
    }
    
    // Initialize immediately
    init();
  }, 50);
}
