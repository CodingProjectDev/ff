const droneShow = (() => {
  const DRONE_COUNT = 1150;
  const SHOW_DURATION = 90000;
  const DRONE_COLORS = [
    "rgba(120, 200, 255, 0.9)",
    "rgba(180, 240, 255, 0.9)",
    "rgba(120, 255, 220, 0.9)",
    "rgba(200, 200, 255, 0.9)",
  ];

  function normalizePoints(points) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    points.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    const scale = Math.max(maxX - minX, maxY - minY) || 1;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    return points.map((point) => ({
      x: (point.x - midX) / (scale / 2),
      y: (point.y - midY) / (scale / 2),
    }));
  }

  function addLinePoints(points, x1, y1, x2, y2, count) {
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      points.push({
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
      });
    }
  }

  function createCirclePoints(
    radius,
    count,
    centerX = 0,
    centerY = 0,
    start = 0,
    end = PI_2
  ) {
    const points = [];
    const step = (end - start) / count;
    for (let i = 0; i <= count; i++) {
      const angle = start + step * i;
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    }
    return points;
  }

  function createHeartPoints() {
    const points = [];
    const steps = 220;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * PI_2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      points.push({ x, y: -y });
    }
    return normalizePoints(points);
  }

  function createStarPoints() {
    const points = [];
    const outerRadius = 1;
    const innerRadius = 0.45;

    for (let i = 0; i <= 10; i++) {
      const angle = (i / 10) * PI_2 - PI_HALF;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return normalizePoints(points);
  }

  function createSmileyPoints() {
    const points = [];
    points.push(...createCirclePoints(1, 220));
    points.push(...createCirclePoints(0.14, 40, -0.35, -0.25));
    points.push(...createCirclePoints(0.14, 40, 0.35, -0.25));
    points.push(
      ...createCirclePoints(0.55, 120, 0, 0.15, Math.PI * 0.15, Math.PI * 0.85)
    );
    return normalizePoints(points);
  }

  function createDiamondPoints() {
    const points = [];
    addLinePoints(points, 0, -1, 1, 0, 80);
    addLinePoints(points, 1, 0, 0, 1, 80);
    addLinePoints(points, 0, 1, -1, 0, 80);
    addLinePoints(points, -1, 0, 0, -1, 80);
    return normalizePoints(points);
  }

  function createRingPoints() {
    return normalizePoints(createCirclePoints(1, 260));
  }

  function createTextPoints(text) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const w = 1200;
    const h = 320;
    canvas.width = w;
    canvas.height = h;

    const safeText = (text || "").trim().slice(0, 50) || "WOW 2027";

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let fontSize = 150;
    ctx.font = `${fontSize}px "Russo One", sans-serif`;
    while (ctx.measureText(safeText).width > w * 0.9 && fontSize > 36) {
      fontSize -= 6;
      ctx.font = `${fontSize}px "Russo One", sans-serif`;
    }

    ctx.fillText(safeText, w / 2, h / 2);

    const image = ctx.getImageData(0, 0, w, h);
    const data = image.data;
    const points = [];
    const step = 2;

    const alphaAt = (x, y) => data[(y * w + x) * 4 + 3];

    for (let y = 1; y < h - 1; y += step) {
      for (let x = 1; x < w - 1; x += step) {
        const alpha = alphaAt(x, y);
        if (alpha < 10) continue;
        if (
          alphaAt(x - 1, y) < 10 ||
          alphaAt(x + 1, y) < 10 ||
          alphaAt(x, y - 1) < 10 ||
          alphaAt(x, y + 1) < 10
        ) {
          points.push({ x, y });
        }
      }
    }

    return points.length ? normalizePoints(points) : createStarPoints();
  }

  function getDroneText() {
    return (textBurstSelector && textBurstSelector()) || "WOW 2027";
  }

  const formationData = [
    { name: "heart", points: createHeartPoints() },
    { name: "star", points: createStarPoints() },
    { name: "text", points: () => createTextPoints(getDroneText()) },
    { name: "smiley", points: createSmileyPoints() },
    { name: "diamond", points: createDiamondPoints() },
    { name: "ring", points: createRingPoints() },
  ];

  const SEGMENT_DURATION = SHOW_DURATION / formationData.length;

  const drones = Array.from({ length: DRONE_COUNT }, (_, index) => ({
    x: 0,
    y: 0,
    color: DRONE_COLORS[index % DRONE_COLORS.length],
    drift: Math.random() * PI_2,
  }));

  function easeInOut(t) {
    return t * t * (3 - 2 * t);
  }

  function scalePoints(points) {
    const scale = Math.min(stageW * 0.3, stageH * 0.22);
    const centerX = stageW * 0.5;
    const centerY = stageH * 0.32;

    return points.map((point) => ({
      x: centerX + point.x * scale,
      y: centerY + point.y * scale,
    }));
  }

  function getFormationPoints(index) {
    const entry = formationData[index];
    const basePoints =
      typeof entry.points === "function" ? entry.points() : entry.points;
    return scalePoints(basePoints);
  }

  let time = 0;
  let lastSegmentIndex = null;

  function update(timeStep) {
    if (!store.state.config.droneShow || !isRunning()) {
      return;
    }

    time = (time + timeStep) % SHOW_DURATION;
    const segmentIndex = Math.floor(time / SEGMENT_DURATION);
    const nextIndex = (segmentIndex + 1) % formationData.length;
    const segmentT = (time % SEGMENT_DURATION) / SEGMENT_DURATION;
    const easedT = easeInOut(segmentT);

    if (lastSegmentIndex !== null && segmentIndex !== lastSegmentIndex) {
      if (typeof launchDroneShowBurst === "function") {
        launchDroneShowBurst();
      }
    }
    lastSegmentIndex = segmentIndex;

    const currentPoints = getFormationPoints(segmentIndex);
    const nextPoints = getFormationPoints(nextIndex);

    drones.forEach((drone, index) => {
      const current = currentPoints[index % currentPoints.length];
      const next = nextPoints[index % nextPoints.length];
      const targetX = current.x + (next.x - current.x) * easedT;
      const targetY = current.y + (next.y - current.y) * easedT;

      drone.x += (targetX - drone.x) * 0.08;
      drone.y += (targetY - drone.y) * 0.08;

      drone.drift += 0.02;
      drone.x += Math.cos(drone.drift) * 0.08;
      drone.y += Math.sin(drone.drift) * 0.08;
    });
  }

  function render(ctx) {
    if (!store.state.config.droneShow || !isRunning()) {
      return;
    }

    const radius = isLowQuality ? 1.2 : isHighQuality ? 2.2 : 1.6;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drones.forEach((drone) => {
      ctx.fillStyle = drone.color;
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, radius, 0, PI_2);
      ctx.fill();
    });
    ctx.restore();
  }

  return { update, render };
})();