// Constant derivations
const COLOR_NAMES = Object.keys(COLOR);
const COLOR_CODES = COLOR_NAMES.map((colorName) => COLOR[colorName]);
// Invisible stars need an indentifier, even through they won't be rendered - physics still apply.
const COLOR_CODES_W_INVIS = [...COLOR_CODES, INVISIBLE];
// Map of color codes to their index in the array. Useful for quickly determining if a color has already been updated in a loop.
const COLOR_CODE_INDEXES = COLOR_CODES_W_INVIS.reduce((obj, code, i) => {
  obj[code] = i;
  return obj;
}, {});
// Tuples is a map keys by color codes (hex) with values of { r, g, b } tuples (still just objects).
const COLOR_TUPLES = {};
COLOR_CODES.forEach((hex) => {
  COLOR_TUPLES[hex] = {
    r: parseInt(hex.substr(1, 2), 16),
    g: parseInt(hex.substr(3, 2), 16),
    b: parseInt(hex.substr(5, 2), 16),
  };
});

// Get a random color.
function randomColorSimple() {
  return COLOR_CODES[(Math.random() * COLOR_CODES.length) | 0];
}

// Get a random color, with some customization options available.
let lastColor;
function randomColor(options) {
  const notSame = options && options.notSame;
  const notColor = options && options.notColor;
  const limitWhite = options && options.limitWhite;
  let color = randomColorSimple();

  // limit the amount of white chosen randomly
  if (limitWhite && color === COLOR.White && Math.random() < 0.6) {
    color = randomColorSimple();
  }

  if (notSame) {
    while (color === lastColor) {
      color = randomColorSimple();
    }
  } else if (notColor) {
    while (color === notColor) {
      color = randomColorSimple();
    }
  }

  lastColor = color;
  return color;
}

function whiteOrGold() {
  return Math.random() < 0.5 ? COLOR.Gold : COLOR.White;
}

// Shell helpers
function makePistilColor(shellColor) {
  return shellColor === COLOR.White || shellColor === COLOR.Gold
    ? randomColor({ notColor: shellColor })
    : whiteOrGold();
}

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

function createTextPoints(text) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const w = 1200;
  const h = 320;
  canvas.width = w;
  canvas.height = h;

  const safeText = (text || "").trim().slice(0, 50) || "WOW 2026";

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Auto-fit font size to text width
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

  if (!points.length) {
    return createStarPoints();
  }

  return normalizePoints(points);
}

const HEART_POINTS = createHeartPoints();
const STAR_POINTS = createStarPoints();
const SMILEY_POINTS = createSmileyPoints();
let cachedText = null;
let cachedTextPoints = null;

function getTextPoints(text) {
  if (text === cachedText && cachedTextPoints) {
    return cachedTextPoints;
  }
  cachedText = text;
  cachedTextPoints = createTextPoints(text);
  return cachedTextPoints;
}

// Unique shell types
const crysanthemumShell = (size = 1) => {
  const glitter = Math.random() < 0.25;
  const singleColor = Math.random() < 0.72;
  const color = singleColor
    ? randomColor({ limitWhite: true })
    : [randomColor(), randomColor({ notSame: true })];
  const pistil = singleColor && Math.random() < 0.42;
  const pistilColor = pistil && makePistilColor(color);
  const secondColor =
    singleColor && (Math.random() < 0.2 || color === COLOR.White)
      ? pistilColor || randomColor({ notColor: color, limitWhite: true })
      : null;
  const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
  let starDensity = glitter ? 1.1 : 1.25;
  if (isLowQuality) starDensity *= 0.8;
  if (isHighQuality) starDensity = 1.2;
  return {
    shellSize: size,
    spreadSize: 300 + size * 100,
    starLife: 900 + size * 200,
    starDensity,
    color,
    secondColor,
    glitter: glitter ? "light" : "",
    glitterColor: whiteOrGold(),
    pistil,
    pistilColor,
    streamers,
  };
};

const ghostShell = (size = 1) => {
  // Extend crysanthemum shell
  const shell = crysanthemumShell(size);
  // Ghost effect can be fast, so extend star life
  shell.starLife *= 1.5;
  // Ensure we always have a single color other than white
  let ghostColor = randomColor({ notColor: COLOR.White });
  // Always use streamers, and sometimes a pistil
  shell.streamers = true;
  const pistil = Math.random() < 0.42;
  const pistilColor = pistil && makePistilColor(ghostColor);
  // Ghost effect - transition from invisible to chosen color
  shell.color = INVISIBLE;
  shell.secondColor = ghostColor;
  // We don't want glitter to be spewed by invisible stars, and we don't currently
  // have a way to transition glitter state. So we'll disable it.
  shell.glitter = "";

  return shell;
};

const strobeShell = (size = 1) => {
  const color = randomColor({ limitWhite: true });
  return {
    shellSize: size,
    spreadSize: 280 + size * 92,
    starLife: 1100 + size * 200,
    starLifeVariation: 0.4,
    starDensity: 1.1,
    color,
    glitter: "light",
    glitterColor: COLOR.White,
    strobe: true,
    strobeColor: Math.random() < 0.5 ? COLOR.White : null,
    pistil: Math.random() < 0.5,
    pistilColor: makePistilColor(color),
  };
};

const palmShell = (size = 1) => {
  const color = randomColor();
  const thick = Math.random() < 0.5;
  return {
    shellSize: size,
    color,
    spreadSize: 250 + size * 75,
    starDensity: thick ? 0.15 : 0.4,
    starLife: 1800 + size * 200,
    glitter: thick ? "thick" : "heavy",
  };
};

const ringShell = (size = 1) => {
  const color = randomColor();
  const pistil = Math.random() < 0.75;
  return {
    shellSize: size,
    ring: true,
    color,
    spreadSize: 300 + size * 100,
    starLife: 900 + size * 200,
    starCount: 2.2 * PI_2 * (size + 1),
    pistil,
    pistilColor: makePistilColor(color),
    glitter: !pistil ? "light" : "",
    glitterColor: color === COLOR.Gold ? COLOR.Gold : COLOR.White,
    streamers: Math.random() < 0.3,
  };
};

const crossetteShell = (size = 1) => {
  const color = randomColor({ limitWhite: true });
  return {
    shellSize: size,
    spreadSize: 300 + size * 100,
    starLife: 750 + size * 160,
    starLifeVariation: 0.4,
    starDensity: 0.85,
    color,
    crossette: true,
    pistil: Math.random() < 0.5,
    pistilColor: makePistilColor(color),
  };
};

const floralShell = (size = 1) => ({
  shellSize: size,
  spreadSize: 300 + size * 120,
  starDensity: 0.12,
  starLife: 500 + size * 50,
  starLifeVariation: 0.5,
  color:
    Math.random() < 0.65
      ? "random"
      : Math.random() < 0.15
      ? randomColor()
      : [randomColor(), randomColor({ notSame: true })],
  floral: true,
});

const fallingLeavesShell = (size = 1) => ({
  shellSize: size,
  color: INVISIBLE,
  spreadSize: 300 + size * 120,
  starDensity: 0.12,
  starLife: 500 + size * 50,
  starLifeVariation: 0.5,
  glitter: "medium",
  glitterColor: COLOR.Gold,
  fallingLeaves: true,
});

const willowShell = (size = 1) => ({
  shellSize: size,
  spreadSize: 300 + size * 100,
  starDensity: 0.6,
  starLife: 3000 + size * 300,
  glitter: "willow",
  glitterColor: COLOR.Gold,
  color: INVISIBLE,
});

const crackleShell = (size = 1) => {
  // favor gold
  const color = Math.random() < 0.75 ? COLOR.Gold : randomColor();
  return {
    shellSize: size,
    spreadSize: 380 + size * 75,
    starDensity: isLowQuality ? 0.65 : 1,
    starLife: 600 + size * 100,
    starLifeVariation: 0.32,
    glitter: "light",
    glitterColor: COLOR.Gold,
    color,
    crackle: true,
    pistil: Math.random() < 0.65,
    pistilColor: makePistilColor(color),
  };
};

const horsetailShell = (size = 1) => {
  const color = randomColor();
  return {
    shellSize: size,
    horsetail: true,
    color,
    spreadSize: 250 + size * 38,
    starDensity: 0.9,
    starLife: 2500 + size * 300,
    glitter: "medium",
    glitterColor: Math.random() < 0.5 ? whiteOrGold() : color,
    // Add strobe effect to white horsetails, to make them more interesting
    strobe: color === COLOR.White,
  };
};

const heartShell = (size = 1) => ({
  shellSize: size,
  spreadSize: 260 + size * 90,
  starLife: 1200 + size * 240,
  starLifeVariation: 0.2,
  color: COLOR.Red,
  glitter: "light",
  glitterColor: COLOR.White,
  shapePoints: HEART_POINTS,
  shapeRotation: Math.random() * PI_2,
  shapePointCount: isLowQuality ? 260 : isHighQuality ? 520 : 400,
});

const starShell = (size = 1) => ({
  shellSize: size,
  spreadSize: 260 + size * 90,
  starLife: 1100 + size * 220,
  starLifeVariation: 0.2,
  color: randomColor({ limitWhite: true }),
  glitter: "light",
  glitterColor: COLOR.White,
  shapePoints: STAR_POINTS,
  shapeRotation: Math.random() * PI_2,
  shapePointCount: isLowQuality ? 260 : isHighQuality ? 520 : 420,
});

const smileyShell = (size = 1) => ({
  shellSize: size,
  spreadSize: 260 + size * 90,
  starLife: 1150 + size * 220,
  starLifeVariation: 0.2,
  color: COLOR.Gold,
  glitter: "light",
  glitterColor: COLOR.White,
  shapePoints: SMILEY_POINTS,
  shapeRotation: Math.random() * PI_2,
  shapePointCount: isLowQuality ? 260 : isHighQuality ? 520 : 420,
});

const textShell = (size = 1) => {
  const text = textBurstSelector();
  return {
    shellSize: size,
    spreadSize: 320 + size * 120,
    starLife: 1300 + size * 260,
    starLifeVariation: 0.2,
    color: randomColor({ limitWhite: true }),
    glitter: "light",
    glitterColor: COLOR.White,
    shapePoints: getTextPoints(text),
    shapeRotation: 0,
    shapePointCount: isLowQuality ? 420 : isHighQuality ? 900 : 700,
  };
};

function randomShellName() {
  return Math.random() < 0.5
    ? "Crysanthemum"
    : shellNames[(Math.random() * (shellNames.length - 1) + 1) | 0];
}

function randomShell(size) {
  // Special selection for codepen header.
  if (IS_HEADER) return randomFastShell()(size);
  // Normal operation
  return shellTypes[randomShellName()](size);
}

function shellFromConfig(size) {
  return shellTypes[shellNameSelector()](size);
}

// Get a random shell, not including processing intensive varients
// Note this is only random when "Random" shell is selected in config.
// Also, this does not create the shell, only returns the factory function.
const fastShellBlacklist = ["Falling Leaves", "Floral", "Willow", "Text"];
function randomFastShell() {
  const isRandom = shellNameSelector() === "Random";
  let shellName = isRandom ? randomShellName() : shellNameSelector();
  if (isRandom) {
    while (fastShellBlacklist.includes(shellName)) {
      shellName = randomShellName();
    }
  }
  return shellTypes[shellName];
}

const shellTypes = {
  Random: randomShell,
  Crackle: crackleShell,
  Crossette: crossetteShell,
  Crysanthemum: crysanthemumShell,
  "Falling Leaves": fallingLeavesShell,
  Floral: floralShell,
  Ghost: ghostShell,
  "Horse Tail": horsetailShell,
  Palm: palmShell,
  Ring: ringShell,
  Strobe: strobeShell,
  Willow: willowShell,
  Heart: heartShell,
  Smiley: smileyShell,
  Star: starShell,
  Text: textShell,
};

const shellNames = Object.keys(shellTypes);