// Mobile-optimized resize handler
function handleResize() {
  let w = window.innerWidth;
  let h = window.innerHeight;
  
  // On mobile, use full viewport
  const isMobile = w <= 840;
  const containerW = isMobile ? w : Math.min(w, MAX_WIDTH);
  const containerH = isMobile ? h : Math.min(h, MAX_HEIGHT);
  
  appNodes.stageContainer.style.width = containerW + "px";
  appNodes.stageContainer.style.height = containerH + "px";
  stages.forEach((stage) => stage.resize(containerW, containerH));
  
  // Account for scale
  const scaleFactor = scaleFactorSelector();
  stageW = containerW / scaleFactor;
  stageH = containerH / scaleFactor;
}

// Extracted function to keep `update()` optimized
function updateGlobals(timeStep, lag) {
  currentFrame++;

  // Always try to fade out speed bar
  if (!isUpdatingSpeed) {
    speedBarOpacity -= lag / 30; // half a second
    if (speedBarOpacity < 0) {
      speedBarOpacity = 0;
    }
  }

  // auto launch shells
  if (store.state.config.autoLaunch) {
    autoLaunchTime -= timeStep;
    if (autoLaunchTime <= 0) {
      autoLaunchTime = startSequence() * 1.25;
    }
  }
}

function update(frameTime, lag) {
  if (!isRunning()) return;

  const width = stageW;
  const height = stageH;
  const timeStep = frameTime * simSpeed;
  const speed = simSpeed * lag;

  updateGlobals(timeStep, lag);
  droneShow.update(timeStep);

  const starDrag = 1 - (1 - Star.airDrag) * speed;
  const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
  const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
  const gAcc = (timeStep / 1000) * GRAVITY;
  COLOR_CODES_W_INVIS.forEach((color) => {
    // Stars
    const stars = Star.active[color];
    for (let i = stars.length - 1; i >= 0; i = i - 1) {
      const star = stars[i];
      // Only update each star once per frame. Since color can change, it's possible a star could update twice without this, leading to a "jump".
      if (star.updateFrame === currentFrame) {
        continue;
      }
      star.updateFrame = currentFrame;

      star.life -= timeStep;
      if (star.life <= 0) {
        stars.splice(i, 1);
        Star.returnInstance(star);
      } else {
        const burnRate = Math.pow(star.life / star.fullLife, 0.5);
        const burnRateInverse = 1 - burnRate;

        star.prevX = star.x;
        star.prevY = star.y;
        star.x += star.speedX * speed;
        star.y += star.speedY * speed;
        // Apply air drag if star isn't "heavy". The heavy property is used for the shell comets.
        if (!star.heavy) {
          star.speedX *= starDrag;
          star.speedY *= starDrag;
        } else {
          star.speedX *= starDragHeavy;
          star.speedY *= starDragHeavy;
        }
        star.speedY += gAcc;

        if (star.spinRadius) {
          star.spinAngle += star.spinSpeed * speed;
          star.x += Math.sin(star.spinAngle) * star.spinRadius * speed;
          star.y += Math.cos(star.spinAngle) * star.spinRadius * speed;
        }

        if (star.sparkFreq) {
          star.sparkTimer -= timeStep;
          while (star.sparkTimer < 0) {
            star.sparkTimer +=
              star.sparkFreq * 0.75 + star.sparkFreq * burnRateInverse * 4;
            Spark.add(
              star.x,
              star.y,
              star.sparkColor,
              Math.random() * PI_2,
              Math.random() * star.sparkSpeed * burnRate,
              star.sparkLife * 0.8 +
                Math.random() * star.sparkLifeVariation * star.sparkLife
            );
          }
        }

        // Handle star transitions
        if (star.life < star.transitionTime) {
          if (star.secondColor && !star.colorChanged) {
            star.colorChanged = true;
            star.color = star.secondColor;
            stars.splice(i, 1);
            Star.active[star.secondColor].push(star);
            if (star.secondColor === INVISIBLE) {
              star.sparkFreq = 0;
            }
          }

          if (star.strobe) {
            // Strobes in the following pattern: on:off:off:on:off:off in increments of `strobeFreq` ms.
            star.visible = Math.floor(star.life / star.strobeFreq) % 3 === 0;
          }
        }
      }
    }

    // Sparks
    const sparks = Spark.active[color];
    for (let i = sparks.length - 1; i >= 0; i = i - 1) {
      const spark = sparks[i];
      spark.life -= timeStep;
      if (spark.life <= 0) {
        sparks.splice(i, 1);
        Spark.returnInstance(spark);
      } else {
        spark.prevX = spark.x;
        spark.prevY = spark.y;
        spark.x += spark.speedX * speed;
        spark.y += spark.speedY * speed;
        spark.speedX *= sparkDrag;
        spark.speedY *= sparkDrag;
        spark.speedY += gAcc;
      }
    }
  });

  render(speed);
}

function render(speed) {
  const { dpr } = mainStage;
  const width = stageW;
  const height = stageH;
  const trailsCtx = trailsStage.ctx;
  const mainCtx = mainStage.ctx;

  if (skyLightingSelector() !== SKY_LIGHT_NONE) {
    colorSky(speed);
  }

  // Account for high DPI screens, and custom scale factor.
  const scaleFactor = scaleFactorSelector();
  trailsCtx.scale(dpr * scaleFactor, dpr * scaleFactor);
  mainCtx.scale(dpr * scaleFactor, dpr * scaleFactor);

  trailsCtx.globalCompositeOperation = "source-over";
  trailsCtx.fillStyle = `rgba(0, 0, 0, ${
    store.state.config.longExposure ? 0.0025 : 0.175 * speed
  })`;
  trailsCtx.fillRect(0, 0, width, height);

  mainCtx.clearRect(0, 0, width, height);

  // Draw queued burst flashes
  // These must also be drawn using source-over due to Safari. Seems rendering the gradients using lighten draws large black boxes instead.
  // Thankfully, these burst flashes look pretty much the same either way.
  while (BurstFlash.active.length) {
    const bf = BurstFlash.active.pop();

    const burstGradient = trailsCtx.createRadialGradient(
      bf.x,
      bf.y,
      0,
      bf.x,
      bf.y,
      bf.radius
    );
    burstGradient.addColorStop(0.024, "rgba(255, 255, 255, 1)");
    burstGradient.addColorStop(0.125, "rgba(255, 160, 20, 0.2)");
    burstGradient.addColorStop(0.32, "rgba(255, 140, 20, 0.11)");
    burstGradient.addColorStop(1, "rgba(255, 120, 20, 0)");
    trailsCtx.fillStyle = burstGradient;
    trailsCtx.fillRect(
      bf.x - bf.radius,
      bf.y - bf.radius,
      bf.radius * 2,
      bf.radius * 2
    );

    BurstFlash.returnInstance(bf);
  }

  // Remaining drawing on trails canvas will use 'lighten' blend mode
  trailsCtx.globalCompositeOperation = "lighten";

  // Draw stars
  trailsCtx.lineWidth = Star.drawWidth;
  trailsCtx.lineCap = isLowQuality ? "square" : "round";
  mainCtx.strokeStyle = "#fff";
  mainCtx.lineWidth = 1;
  mainCtx.beginPath();
  COLOR_CODES.forEach((color) => {
    const stars = Star.active[color];
    trailsCtx.strokeStyle = color;
    trailsCtx.beginPath();
    stars.forEach((star) => {
      if (star.visible) {
        trailsCtx.moveTo(star.x, star.y);
        trailsCtx.lineTo(star.prevX, star.prevY);
        mainCtx.moveTo(star.x, star.y);
        mainCtx.lineTo(star.x - star.speedX * 1.6, star.y - star.speedY * 1.6);
      }
    });
    trailsCtx.stroke();
  });
  mainCtx.stroke();

  // Draw sparks
  trailsCtx.lineWidth = Spark.drawWidth;
  trailsCtx.lineCap = "butt";
  COLOR_CODES.forEach((color) => {
    const sparks = Spark.active[color];
    trailsCtx.strokeStyle = color;
    trailsCtx.beginPath();
    sparks.forEach((spark) => {
      trailsCtx.moveTo(spark.x, spark.y);
      trailsCtx.lineTo(spark.prevX, spark.prevY);
    });
    trailsCtx.stroke();
  });

  droneShow.render(mainCtx);

  // Render speed bar if visible
  if (speedBarOpacity) {
    const speedBarHeight = 6;
    mainCtx.globalAlpha = speedBarOpacity;
    mainCtx.fillStyle = COLOR.Blue;
    mainCtx.fillRect(
      0,
      height - speedBarHeight,
      width * simSpeed,
      speedBarHeight
    );
    mainCtx.globalAlpha = 1;
  }

  trailsCtx.setTransform(1, 0, 0, 1, 0, 0);
  mainCtx.setTransform(1, 0, 0, 1, 0, 0);
}

// Draw colored overlay based on combined brightness of stars (light up the sky!)
// Note: this is applied to the canvas container's background-color, so it's behind the particles
const currentSkyColor = { r: 0, g: 0, b: 0 };
const targetSkyColor = { r: 0, g: 0, b: 0 };
function colorSky(speed) {
  // The maximum r, g, or b value that will be used (255 would represent no maximum)
  const maxSkySaturation = skyLightingSelector() * 15;
  // How many stars are required in total to reach maximum sky brightness
  const maxStarCount = 500;
  let totalStarCount = 0;
  // Initialize sky as black
  targetSkyColor.r = 0;
  targetSkyColor.g = 0;
  targetSkyColor.b = 0;
  // Add each known color to sky, multiplied by particle count of that color. This will put RGB values wildly out of bounds, but we'll scale them back later.
  // Also add up total star count.
  COLOR_CODES.forEach((color) => {
    const tuple = COLOR_TUPLES[color];
    const count = Star.active[color].length;
    totalStarCount += count;
    targetSkyColor.r += tuple.r * count;
    targetSkyColor.g += tuple.g * count;
    targetSkyColor.b += tuple.b * count;
  });

  // Clamp intensity at 1.0, and map to a custom non-linear curve. This allows few stars to perceivably light up the sky, while more stars continue to increase the brightness but at a lesser rate. This is more inline with humans' non-linear brightness perception.
  const intensity = Math.pow(Math.min(1, totalStarCount / maxStarCount), 0.3);
  // Figure out which color component has the highest value, so we can scale them without affecting the ratios.
  // Prevent 0 from being used, so we don't divide by zero in the next step.
  const maxColorComponent = Math.max(
    1,
    targetSkyColor.r,
    targetSkyColor.g,
    targetSkyColor.b
  );
  // Scale all color components to a max of `maxSkySaturation`, and apply intensity.
  targetSkyColor.r =
    (targetSkyColor.r / maxColorComponent) * maxSkySaturation * intensity;
  targetSkyColor.g =
    (targetSkyColor.g / maxColorComponent) * maxSkySaturation * intensity;
  targetSkyColor.b =
    (targetSkyColor.b / maxColorComponent) * maxSkySaturation * intensity;

  // Animate changes to color to smooth out transitions.
  const colorChange = 10;
  currentSkyColor.r +=
    ((targetSkyColor.r - currentSkyColor.r) / colorChange) * speed;
  currentSkyColor.g +=
    ((targetSkyColor.g - currentSkyColor.g) / colorChange) * speed;
  currentSkyColor.b +=
    ((targetSkyColor.b - currentSkyColor.b) / colorChange) * speed;

  appNodes.canvasContainer.style.backgroundColor = `rgb(${
    currentSkyColor.r | 0
  }, ${currentSkyColor.g | 0}, ${currentSkyColor.b | 0})`;
}

mainStage.addEventListener("ticker", update);