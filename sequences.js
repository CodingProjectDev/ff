function fitShellPositionInBoundsH(position) {
  const edge = 0.18;
  return (1 - edge * 2) * position + edge;
}

function fitShellPositionInBoundsV(position) {
  return position * 0.75;
}

function getRandomShellPositionH() {
  return fitShellPositionInBoundsH(Math.random());
}

function getRandomShellPositionV() {
  return fitShellPositionInBoundsV(Math.random());
}

function getRandomShellSize() {
  const baseSize = shellSizeSelector();
  const maxVariance = Math.min(2.5, baseSize);
  const variance = Math.random() * maxVariance;
  const size = baseSize - variance;
  const height = maxVariance === 0 ? Math.random() : 1 - variance / maxVariance;
  const centerOffset = Math.random() * (1 - height * 0.65) * 0.5;
  const x = Math.random() < 0.5 ? 0.5 - centerOffset : 0.5 + centerOffset;
  return {
    size,
    x: fitShellPositionInBoundsH(x),
    height: fitShellPositionInBoundsV(height),
  };
}

// Launches a shell from a user pointer event, based on state.config
function launchShellFromConfig(event) {
  const shell = new Shell(shellFromConfig(shellSizeSelector()));
  const w = mainStage.width;
  const h = mainStage.height;

  shell.launch(
    event ? event.x / w : getRandomShellPositionH(),
    event ? 1 - event.y / h : getRandomShellPositionV()
  );
}

// Sequences
// -----------

function seqRandomShell() {
  const size = getRandomShellSize();
  const shell = new Shell(shellFromConfig(size.size));
  shell.launch(size.x, size.height);

  let extraDelay = shell.starLife;
  if (shell.fallingLeaves) {
    extraDelay = 4600;
  }

  return 900 + Math.random() * 600 + extraDelay;
}

function seqRandomFastShell() {
  const shellType = randomFastShell();
  const size = getRandomShellSize();
  const shell = new Shell(shellType(size.size));
  shell.launch(size.x, size.height);

  let extraDelay = shell.starLife;

  return 900 + Math.random() * 600 + extraDelay;
}

function seqTwoRandom() {
  const size1 = getRandomShellSize();
  const size2 = getRandomShellSize();
  const shell1 = new Shell(shellFromConfig(size1.size));
  const shell2 = new Shell(shellFromConfig(size2.size));
  const leftOffset = Math.random() * 0.2 - 0.1;
  const rightOffset = Math.random() * 0.2 - 0.1;
  shell1.launch(0.3 + leftOffset, size1.height);
  setTimeout(() => {
    shell2.launch(0.7 + rightOffset, size2.height);
  }, 100);

  let extraDelay = Math.max(shell1.starLife, shell2.starLife);
  if (shell1.fallingLeaves || shell2.fallingLeaves) {
    extraDelay = 4600;
  }

  return 900 + Math.random() * 600 + extraDelay;
}

function seqTriple() {
  const shellType = randomFastShell();
  const baseSize = shellSizeSelector();
  const smallSize = Math.max(0, baseSize - 1.25);

  const offset = Math.random() * 0.08 - 0.04;
  const shell1 = new Shell(shellType(baseSize));
  shell1.launch(0.5 + offset, 0.7);

  const leftDelay = 1000 + Math.random() * 400;
  const rightDelay = 1000 + Math.random() * 400;

  setTimeout(() => {
    const offset = Math.random() * 0.08 - 0.04;
    const shell2 = new Shell(shellType(smallSize));
    shell2.launch(0.2 + offset, 0.1);
  }, leftDelay);

  setTimeout(() => {
    const offset = Math.random() * 0.08 - 0.04;
    const shell3 = new Shell(shellType(smallSize));
    shell3.launch(0.8 + offset, 0.1);
  }, rightDelay);

  return 4000;
}

function seqPyramid() {
  const barrageCountHalf = IS_DESKTOP ? 7 : 4;
  const largeSize = shellSizeSelector();
  const smallSize = Math.max(0, largeSize - 3);
  const randomMainShell = Math.random() < 0.78 ? crysanthemumShell : ringShell;
  const randomSpecialShell = randomShell;

  function launchShell(x, useSpecial) {
    const isRandom = shellNameSelector() === "Random";
    let shellType = isRandom
      ? useSpecial
        ? randomSpecialShell
        : randomMainShell
      : shellTypes[shellNameSelector()];
    const shell = new Shell(shellType(useSpecial ? largeSize : smallSize));
    const height = x <= 0.5 ? x / 0.5 : (1 - x) / 0.5;
    shell.launch(x, useSpecial ? 0.75 : height * 0.42);
  }

  let count = 0;
  let delay = 0;
  while (count <= barrageCountHalf) {
    if (count === barrageCountHalf) {
      setTimeout(() => {
        launchShell(0.5, true);
      }, delay);
    } else {
      const offset = (count / barrageCountHalf) * 0.5;
      const delayOffset = Math.random() * 30 + 30;
      setTimeout(() => {
        launchShell(offset, false);
      }, delay);
      setTimeout(() => {
        launchShell(1 - offset, false);
      }, delay + delayOffset);
    }

    count++;
    delay += 200;
  }

  return 3400 + barrageCountHalf * 250;
}

function seqSmallBarrage() {
  seqSmallBarrage.lastCalled = Date.now();
  const barrageCount = IS_DESKTOP ? 11 : 5;
  const specialIndex = IS_DESKTOP ? 3 : 1;
  const shellSize = Math.max(0, shellSizeSelector() - 2);
  const randomMainShell = Math.random() < 0.78 ? crysanthemumShell : ringShell;
  const randomSpecialShell = randomFastShell();

  // (cos(x*5π+0.5π)+1)/2 is a custom wave bounded by 0 and 1 used to set varying launch heights
  function launchShell(x, useSpecial) {
    const isRandom = shellNameSelector() === "Random";
    let shellType = isRandom
      ? useSpecial
        ? randomSpecialShell
        : randomMainShell
      : shellTypes[shellNameSelector()];
    const shell = new Shell(shellType(shellSize));
    const height = (Math.cos(x * 5 * Math.PI + PI_HALF) + 1) / 2;
    shell.launch(x, height * 0.75);
  }

  let count = 0;
  let delay = 0;
  while (count < barrageCount) {
    if (count === 0) {
      launchShell(0.5, false);
      count += 1;
    } else {
      const offset = (count + 1) / barrageCount / 2;
      const delayOffset = Math.random() * 30 + 30;
      const useSpecial = count === specialIndex;
      setTimeout(() => {
        launchShell(0.5 + offset, useSpecial);
      }, delay);
      setTimeout(() => {
        launchShell(0.5 - offset, useSpecial);
      }, delay + delayOffset);
      count += 2;
    }
    delay += 200;
  }

  return 3400 + barrageCount * 120;
}
seqSmallBarrage.cooldown = 15000;
seqSmallBarrage.lastCalled = Date.now();

// Triggered by drone show when formations switch
function launchDroneShowBurst() {
  const baseSize = Math.max(shellSizeSelector(), 2.5);
  const shellType = randomFastShell();

  const offsets = [-0.22, 0, 0.22];
  offsets.forEach((offset, i) => {
    setTimeout(() => {
      const shell = new Shell(shellType(baseSize));
      shell.launch(0.5 + offset, 0.6);
    }, i * 120);
  });
}

const sequences = [
  seqRandomShell,
  seqTwoRandom,
  seqTriple,
  seqPyramid,
  seqSmallBarrage,
];

let isFirstSeq = true;
const finaleCount = 32;
let currentFinaleCount = 0;
function startSequence() {
  if (isFirstSeq) {
    isFirstSeq = false;
    if (IS_HEADER) {
      return seqTwoRandom();
    } else {
      const shell = new Shell(crysanthemumShell(shellSizeSelector()));
      shell.launch(0.5, 0.5);
      return 2400;
    }
  }

  if (finaleSelector()) {
    seqRandomFastShell();
    if (currentFinaleCount < finaleCount) {
      currentFinaleCount++;
      return 170;
    } else {
      currentFinaleCount = 0;
      return 6000;
    }
  }

  const rand = Math.random();

  if (
    rand < 0.08 &&
    Date.now() - seqSmallBarrage.lastCalled > seqSmallBarrage.cooldown
  ) {
    return seqSmallBarrage();
  }

  if (rand < 0.1) {
    return seqPyramid();
  }

  if (rand < 0.6 && !IS_HEADER) {
    return seqRandomShell();
  } else if (rand < 0.8) {
    return seqTwoRandom();
  } else if (rand < 1) {
    return seqTriple();
  }
}

let activePointerCount = 0;
let isUpdatingSpeed = false;

function handlePointerStart(event) {
  activePointerCount++;
  const btnSize = 50;

  if (event.y < btnSize) {
    if (event.x < btnSize) {
      togglePause();
      return;
    }
    if (
      event.x > mainStage.width / 2 - btnSize / 2 &&
      event.x < mainStage.width / 2 + btnSize / 2
    ) {
      toggleSound();
      return;
    }
    if (event.x > mainStage.width - btnSize) {
      toggleMenu();
      return;
    }
  }

  if (!isRunning()) return;

  if (updateSpeedFromEvent(event)) {
    isUpdatingSpeed = true;
  } else if (event.onCanvas) {
    launchShellFromConfig(event);
  }
}

function handlePointerEnd(event) {
  activePointerCount--;
  isUpdatingSpeed = false;
}

function handlePointerMove(event) {
  if (!isRunning()) return;

  if (isUpdatingSpeed) {
    updateSpeedFromEvent(event);
  }
}

function handleKeydown(event) {
  // 
  if (event.keyCode === 32) {
    togglePause();
  }
  // O
  else if (event.keyCode === 79) {
    toggleMenu();
  }
  // Esc
  else if (event.keyCode === 27) {
    toggleMenu(false);
  }
}

mainStage.addEventListener("pointerstart", handlePointerStart);
mainStage.addEventListener("pointerend", handlePointerEnd);
mainStage.addEventListener("pointermove", handlePointerMove);
window.addEventListener("keydown", handleKeydown);

function updateSpeedFromEvent(event) {
  if (isUpdatingSpeed || event.y >= mainStage.height - 44) {
    // On phones it's hard to hit the edge pixels in order to set speed at 0 or 1, so some padding is provided to make that easier.
    const edge = 16;
    const newSpeed = (event.x - edge) / (mainStage.width - edge * 2);
    simSpeed = Math.min(Math.max(newSpeed, 0), 1);
    // show speed bar after an update
    speedBarOpacity = 1;
    // If we updated the speed, return true
    return true;
  }
  // Return false if the speed wasn't updated
  return false;
}