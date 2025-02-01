/*************************************************
 * 1) LOAD ALL IMAGES
 ************************************************/

// Background image
let backgroundImage = new Image();
backgroundImage.src = "grass.png";

// Sheriff
let sheriffUpImage = new Image();
sheriffUpImage.src = "up.png";

let sheriffDownImage = new Image();
sheriffDownImage.src = "down.png";

let sheriffLeftImage = new Image();
sheriffLeftImage.src = "left.png";

let sheriffRightImage = new Image();
sheriffRightImage.src = "right.png";

// Traitors
let traitorUpImage = new Image();
traitorUpImage.src = "traitorUp.png";

let traitorDownImage = new Image();
traitorDownImage.src = "traitorDown.png";

let traitorLeftImage = new Image();
traitorLeftImage.src = "traitorLeft.png";

let traitorRightImage = new Image();
traitorRightImage.src = "traitorRight.png";

// 🔊 Added: Sound Effects
const tickSound = new Audio("tick.wav");
const shotSound = new Audio("shot.wav");
const murderedSound = new Audio("murdered.wav");
const winSound = new Audio("win.wav");
// Background Music
const backgroundMusic = new Audio("sunsetRiders.wav");
backgroundMusic.loop = true;  // so it restarts automatically if it ends
backgroundMusic.volume = 0.8;

//intro music
const introMusic = new Audio("sunsetRidersIntro.wav");
introMusic.volume = 0.7;
let introHasPlayed = false;

// Function to play tick sound (for button clicks)
function playTickSound() {
  tickSound.currentTime = 0;
  tickSound.play();
}

// DOM ready listener for button click sounds
document.addEventListener("DOMContentLoaded", function () {
  const startButton = document.getElementById("start-button");
  const playAgainButton = document.getElementById("playAgainButton");

  if (startButton) {
    startButton.addEventListener("click", playTickSound);
  }
  if (playAgainButton) {
    playAgainButton.addEventListener("click", playTickSound);
  }

  setupStartScreen(); // Continue setup
});

/*************************************************
 * 2) SHOW START SCREEN
 ************************************************/
/*document.addEventListener("DOMContentLoaded", function () {
  setupStartScreen();
});
*/

function setupStartScreen() {
    const startButton   = document.getElementById("start-button");
    const gameContainer = document.getElementById("game-container");
    const startScreen   = document.getElementById("start-screen");
    const nameInput     = document.getElementById("player-name");
  
    // A small guard to ensure we only play the intro once
    let introHasPlayed = false;
  
    // Play the intro music when the user focuses (clicks) on the input
    nameInput.addEventListener("focus", function () {
      if (!introHasPlayed) {
        introHasPlayed = true; // prevent re-playing on every focus
        introMusic.currentTime = 0;
        introMusic.play().catch(err => {
          console.warn("Intro music could not play:", err);
        });
      }
    });
  
    // Handle "Start Game" button click
    startButton.addEventListener("click", function () {
      // Stop intro music as soon as they click Start
      introMusic.pause();
      introMusic.currentTime = 0;
  
      console.log("Start button clicked!");
  
      const playerName = nameInput.value.trim();
      if (playerName === "") {
        alert("Please enter your name before starting the game!");
        return;
      }
  
      localStorage.setItem("playerName", playerName);
      console.log("Player's name stored:", playerName);
  
      // Hide start screen, show the game
      startScreen.style.display = "none";
      gameContainer.style.display = "flex";
  
      // Ensure images are loaded before initGame
      waitForImages()
        .then(() => {
          initGame();
        })
        .catch((err) => {
          console.error("Error loading images:", err);
        });
    });
  }

/*************************************************
 * 3) WAIT UNTIL ALL KEY IMAGES ARE LOADED
 ************************************************/
function waitForImages() {
  const images = [
    sheriffUpImage, sheriffDownImage, sheriffLeftImage, sheriffRightImage,
    traitorUpImage, traitorDownImage, traitorLeftImage, traitorRightImage
  ];

  return new Promise((resolve, reject) => {
    let loadedCount = 0;
    images.forEach((img) => {
      if (img.complete) {
        loadedCount++;
        if (loadedCount === images.length) resolve(true);
      } else {
        img.onload = () => {
          loadedCount++;
          if (loadedCount === images.length) resolve(true);
        };
        img.onerror = (err) => {
          reject(err);
        };
      }
    });
  });
}

/*************************************************
 * 4) MAIN GAME INIT
 ************************************************/
let gameOver = false; // keep it outside so we can detect globally

function initGame() {
  console.log("Game Started!");

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  if (!canvas || !ctx) {
    console.error("Game canvas not found.");
    return;
  }

  // Start (or restart) the background music
 backgroundMusic.currentTime = 0; 
 backgroundMusic.play().catch(err => {
    console.warn("Could not start background music:", err);
});

  const canvasWidth = 500;
  const canvasHeight = 500;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Ensure background drawn after loading
  let backgroundImage = new Image();
  backgroundImage.src = "grass.png";
  backgroundImage.onload = function () {
    draw();
  };

  // ----- Sizing for Sheriff -----
  const sheriffScale = 1;
  const sheriffNatW = sheriffUpImage.naturalWidth;   // e.g. 50
  const sheriffNatH = sheriffUpImage.naturalHeight;  // e.g. 80
  const sheriffW = sheriffNatW * sheriffScale;       // 50
  const sheriffH = sheriffNatH * sheriffScale;       // 80

  // Sheriff object
  const sheriff = {
    x: canvasWidth / 2 - sheriffW / 2,
    y: canvasHeight / 2 - sheriffH / 2,
    width: sheriffW,
    height: sheriffH,
    collisionWidth:  (36 / 50) * sheriffW,
    collisionHeight: (64 / 80) * sheriffH,
    collisionOffsetX: (sheriffW - (36 / 50) * sheriffW) / 2,
    collisionOffsetY: (sheriffH - (64 / 80) * sheriffH) / 2,
    speed: 2,
    dx: 0,
    dy: 0
  };
  let lastDirection = "right"; // default facing

  // ----- Sizing for Traitors -----
  const traitorScale = 1;
  const traitorNatW = traitorUpImage.naturalWidth;
  const traitorNatH = traitorUpImage.naturalHeight;
  const traitorW = traitorNatW * traitorScale;
  const traitorH = traitorNatH * traitorScale;

  // ----- Arrays -----
  const bullets = [];
  const bulletSpeed = 6;
  gameOver = false; // Reset whenever a new game starts

  const totalTraitors = 10;
  let traitorsSpawned = 0;
  let traitorsShot = 0;
  const traitors = [];

  let currentTraitorSpeed = 0.45;
  const spawnMargin = 50;

  /*************************************************
   * Spawn Functions
   ************************************************/

  // 1) The first traitor
  function spawnFirstTraitor() {
    return createTraitor(
      canvasWidth,
      (canvasHeight - traitorH) / 2,
      -currentTraitorSpeed,
      0
    );
  }

  // 2) Spawn a traitor at random edge
  function spawnRandomTraitor() {
    const edge = Math.floor(Math.random() * 4);
    let x, y, dx, dy;

    if (edge === 0) {
      // Left edge
      x = -traitorW;
      y = randomBetween(0, canvasHeight - traitorH);
      dx = currentTraitorSpeed;
      dy = 0;
    } else if (edge === 1) {
      // Right edge
      x = canvasWidth;
      y = randomBetween(0, canvasHeight - traitorH);
      dx = -currentTraitorSpeed;
      dy = 0;
    } else if (edge === 2) {
      // Top edge
      x = randomBetween(0, canvasWidth - traitorW);
      y = -traitorH;
      dx = 0;
      dy = currentTraitorSpeed;
    } else {
      // Bottom edge
      x = randomBetween(0, canvasWidth - traitorW);
      y = canvasHeight;
      dx = 0;
      dy = -currentTraitorSpeed;
    }

    return createTraitor(x, y, dx, dy);
  }

  // Helper to create a traitor with collisions
  function createTraitor(x, y, dx, dy) {
     // If the new position overlaps the sheriff, pick a new position
     if (overlapsSheriff(x, y, traitorW, traitorH)) {
        return createTraitorAtRandomEdge(); 
        // or just pick a different edge & position again
    }
    return {
      x,
      y, dx, dy,
      width: traitorW,
      height: traitorH,
     
      alive: true,
      collisionWidth:  (34 / 50) * traitorW,
      collisionHeight: (64 / 80) * traitorH,
      collisionOffsetX: (traitorW - (34 / 50) * traitorW) / 2,
      collisionOffsetY: (traitorH - (64 / 80) * traitorH) / 2
    };
  }

  function overlapsSheriff(x, y, w, h) {
    const sheriffBox = {
      left:  sheriff.x + sheriff.collisionOffsetX,
      right: sheriff.x + sheriff.collisionOffsetX + sheriff.collisionWidth,
      top:   sheriff.y + sheriff.collisionOffsetY,
      bot:   sheriff.y + sheriff.collisionOffsetY + sheriff.collisionHeight,
    };

    // The new traitor's box:
    const traitorBox = {
      left:  x,
      right: x + w,
      top:   y,
      bot:   y + h
    };

    // Simple bounding-box check
    return !(
      traitorBox.right < sheriffBox.left  ||
      traitorBox.left  > sheriffBox.right ||
      traitorBox.bot   < sheriffBox.top   ||
      traitorBox.top   > sheriffBox.bot
    );
}

  // Respawn traitor if it goes off-canvas
  function respawnTraitor(t) {
    do {
      // Pick a random edge
      const edge = Math.floor(Math.random() * 4);
  
      if (edge === 0) {
        // Left edge
        t.x = -t.width;
        t.y = randomBetween(0, canvasHeight - t.height);
        t.dx = currentTraitorSpeed;
        t.dy = 0;
      } else if (edge === 1) {
        // Right edge
        t.x = canvasWidth;
        t.y = randomBetween(0, canvasHeight - t.height);
        t.dx = -currentTraitorSpeed;
        t.dy = 0;
      } else if (edge === 2) {
        // Top edge
        t.x = randomBetween(0, canvasWidth - t.width);
        t.y = -t.height;
        t.dx = 0;
        t.dy = currentTraitorSpeed;
      } else {
        // Bottom edge
        t.x = randomBetween(0, canvasWidth - t.width);
        t.y = canvasHeight;
        t.dx = 0;
        t.dy = -currentTraitorSpeed;
      }
  
      // Keep re-picking if it still overlaps the sheriff
    } while (overlapsSheriff(t.x, t.y, t.width, t.height));
  }

  function createTraitorAtRandomEdge() {
    const edge = Math.floor(Math.random() * 4);
    let x, y, dx, dy;
  
    if (edge === 0) {
      // Left edge
      x = -traitorW;
      y = randomBetween(0, canvasHeight - traitorH);
      dx = currentTraitorSpeed;  // move right
      dy = 0;
    } else if (edge === 1) {
      // Right edge
      x = canvasWidth;
      y = randomBetween(0, canvasHeight - traitorH);
      dx = -currentTraitorSpeed; // move left
      dy = 0;
    } else if (edge === 2) {
      // Top edge
      x = randomBetween(0, canvasWidth - traitorW);
      y = -traitorH;
      dx = 0;
      dy = currentTraitorSpeed;  // move down
    } else {
      // Bottom edge
      x = randomBetween(0, canvasWidth - traitorW);
      y = canvasHeight;
      dx = 0;
      dy = -currentTraitorSpeed; // move up
    }
  
    // If it still overlaps the sheriff, pick again
    if (overlapsSheriff(x, y, traitorW, traitorH)) {
      return createTraitorAtRandomEdge();
    }
  
    return {
      x, y, dx, dy,
      width: traitorW,
      height: traitorH,
      alive: true,
      collisionWidth:  (34 / 50) * traitorW,
      collisionHeight: (64 / 80) * traitorH,
      collisionOffsetX: (traitorW - (34 / 50) * traitorW) / 2,
      collisionOffsetY: (traitorH - (64 / 80) * traitorH) / 2
    };
  }

  // Random integer helper
  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /*************************************************
   * Schedule spawns (FIX: stop if gameOver)
   ************************************************/
  // immediate first spawn
  traitors.push(spawnFirstTraitor());
  traitorsSpawned++;

  // then schedule the remaining 9
  scheduleNextTraitor();

  function scheduleNextTraitor() {
    if (traitorsSpawned >= totalTraitors) return;

    const delay = 500 + Math.random() * 3000; // 1–4s
    setTimeout(() => {
      // *** Important fix: do not spawn if gameOver
      if (gameOver) return;

      currentTraitorSpeed *= 1.2;
      traitors.push(spawnRandomTraitor());
      traitorsSpawned++;
      scheduleNextTraitor();
    }, delay);
  }

  /*************************************************
   * Key Controls
   ************************************************/
  const keys = {};
  document.addEventListener("keydown", (e) => {
    if (gameOver) return;
    keys[e.key] = true;
    updateMovement();
  });
  document.addEventListener("keyup", (e) => {
    if (gameOver) return;
    keys[e.key] = false;
    updateMovement();
  });

  function updateMovement() {
    sheriff.dx = 0;
    sheriff.dy = 0;

    if (keys["ArrowLeft"]) {
      sheriff.dx = -sheriff.speed;
      lastDirection = "left";
    }
    if (keys["ArrowRight"]) {
      sheriff.dx = sheriff.speed;
      lastDirection = "right";
    }
    if (keys["ArrowUp"]) {
      sheriff.dy = -sheriff.speed;
      lastDirection = "up";
    }
    if (keys["ArrowDown"]) {
      sheriff.dy = sheriff.speed;
      lastDirection = "down";
    }
  }

  /*************************************************
   * Update Loop
   ************************************************/
  function update() {
    if (gameOver) return;

    // Move sheriff
    sheriff.x += sheriff.dx;
    sheriff.y += sheriff.dy;
    // Constrain
    sheriff.x = Math.max(0, Math.min(canvasWidth - sheriff.width, sheriff.x));
    sheriff.y = Math.max(0, Math.min(canvasHeight - sheriff.height, sheriff.y));

    // Move bullets
    bullets.forEach((bullet, index) => {
      bullet.x += bullet.dx;
      bullet.y += bullet.dy;
      if (
        bullet.x > canvasWidth || bullet.x < 0 ||
        bullet.y > canvasHeight || bullet.y < 0
      ) {
        bullets.splice(index, 1);
      }
    });

    // Move traitors
    traitors.forEach((t) => {
      if (!t.alive) return;

      t.x += t.dx;
      t.y += t.dy;

      // check off-canvas
      if (
        t.x < -t.width ||
        t.x > canvasWidth ||
        t.y < -t.height ||
        t.y > canvasHeight
      ) {
        respawnTraitor(t);
        return;
      }

      // Sheriff vs Traitor collision
      // *** Removed direct `gameOver = true;` here => let showEndScreen handle it
      const sLeft   = sheriff.x + sheriff.collisionOffsetX;
      const sRight  = sLeft + sheriff.collisionWidth;
      const sTop    = sheriff.y + sheriff.collisionOffsetY;
      const sBottom = sTop + sheriff.collisionHeight;

      const tLeft   = t.x + t.collisionOffsetX;
      const tRight  = tLeft + t.collisionWidth;
      const tTop    = t.y + t.collisionOffsetY;
      const tBottom = tTop + t.collisionHeight;

      if (
        sLeft < tRight &&
        sRight > tLeft &&
        sTop < tBottom &&
        sBottom > tTop
      ) {
        console.log("Sheriff hit! Game Over!");
        showEndScreen("You have been MURDERED!");
      }
    });

    // Bullet vs. Traitor
    bullets.forEach((bullet, bulletIndex) => {
      traitors.forEach((t) => {
        if (!t.alive) return;

        const bLeft   = bullet.x;
        const bRight  = bullet.x + bullet.width;
        const bTop    = bullet.y;
        const bBottom = bullet.y + bullet.height;

        const tLeft   = t.x + t.collisionOffsetX;
        const tRight  = tLeft + t.collisionWidth;
        const tTop    = t.y + t.collisionOffsetY;
        const tBottom = tTop + t.collisionHeight;

        if (
          bLeft < tRight &&
          bRight > tLeft &&
          bTop < tBottom &&
          bBottom > tTop
        ) {
          // bullet kills traitor
          bullets.splice(bulletIndex, 1);
          t.alive = false;
          traitorsShot++;

          // check win
          if (traitorsShot >= totalTraitors) {
            showEndScreen("YOU WIN!");
            sendDiscordMessage();
          }
        }
      });
    });
  }

  /*************************************************
   * Draw Loop
   ************************************************/
  function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // background
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    // sheriff
    let sheriffImage;
    switch (lastDirection) {
      case "left":  sheriffImage = sheriffLeftImage;  break;
      case "right": sheriffImage = sheriffRightImage; break;
      case "up":    sheriffImage = sheriffUpImage;    break;
      case "down":  sheriffImage = sheriffDownImage;  break;
      default:      sheriffImage = sheriffRightImage;
    }
    ctx.drawImage(sheriffImage, sheriff.x, sheriff.y, sheriff.width, sheriff.height);

    // bullets
    bullets.forEach((b) => {
      ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // traitors
    traitors.forEach((t) => {
      if (!t.alive) return;

      let traitorImage;
      if (t.dx > 0)      traitorImage = traitorRightImage;
      else if (t.dx < 0) traitorImage = traitorLeftImage;
      else if (t.dy > 0) traitorImage = traitorDownImage;
      else               traitorImage = traitorUpImage;

      ctx.drawImage(traitorImage, t.x, t.y, t.width, t.height);
    });
  }

  /*************************************************
   * Game Loop
   ************************************************/
  let lastFrameTime = performance.now();
  function gameLoop() {
    if (gameOver) return;

    let now = performance.now();
    let deltaTime = now - lastFrameTime;
    lastFrameTime = now;

    update();
    draw();
    requestAnimationFrame(gameLoop);
  }
  gameLoop();

  /*************************************************
   * Shoot
   ************************************************/
  document.addEventListener("keydown", (e) => {
    if (gameOver) return;
    if (e.code === "Space") shoot();
  });

  function shoot() {
    if (gameOver) return;

    // 🔊 Play shot sound
    shotSound.currentTime = 0;
    shotSound.play().catch(err =>
      console.warn("Shot sound failed to play:", err)
    );

    const bulletSize = 10;
    let bulletX = sheriff.x + (sheriff.width / 2) - (bulletSize / 2);
    let bulletY = sheriff.y + (sheriff.height * 2/3) - (bulletSize / 2);

    let bullet = {
      x: bulletX,
      y: bulletY,
      width: bulletSize,
      height: bulletSize,
      dx: 0,
      dy: 0
    };

    switch (lastDirection) {
      case "left":  bullet.dx = -bulletSpeed; break;
      case "right": bullet.dx =  bulletSpeed; break;
      case "up":    bullet.dy = -bulletSpeed; break;
      case "down":  bullet.dy =  bulletSpeed; break;
    }

    bullets.push(bullet);
  }

  /*************************************************
   * End Screen + Discord
   ************************************************/
  function showEndScreen(message) {
    if (gameOver) return;
    gameOver = true;

// Stop the background music
backgroundMusic.pause();
backgroundMusic.currentTime = 0;  // reset to start for next time


    // Play sounds if message is "You have been MURDERED!" or "YOU WIN!"
    if (message === "You have been MURDERED!") {
        murderedSound.currentTime = 0;
        murderedSound.play();
        // Hide any extra text
        document.getElementById("end-submessage").textContent = "";
    } else if (message === "YOU WIN!") {
        winSound.currentTime = 0;
        winSound.play();
        // Show the extra line
        document.getElementById("end-submessage").textContent = "Please wait in your room";
    }

    // Freeze everything
    sheriff.dx = 0;
    sheriff.dy = 0;
    traitors.forEach(t => {
        t.dx = 0;
        t.dy = 0;
    });

    // Display end screen text
    document.getElementById("end-message").textContent = message;
    document.getElementById("end-screen").style.display = "flex";

    // Play again logic
    const playAgainButton = document.getElementById("playAgainButton");
    playAgainButton.onclick = function () {
        resetGame();
    };
}

  function resetGame() {
    console.log("Resetting game...");
    document.getElementById("end-screen").style.display = "none";
    gameOver = false;

    // Clear arrays
    traitors.length = 0;
    bullets.length = 0;

    // Reset spawns
    traitorsSpawned = 0;
    traitorsShot = 0;
    currentTraitorSpeed = 0.45;

    // Sheriff center
    sheriff.x = canvasWidth / 2 - sheriff.width / 2;
    sheriff.y = canvasHeight / 2 - sheriff.height / 2;
    sheriff.dx = 0;
    sheriff.dy = 0;

    // Remove old event listeners from button, if any
    const playAgainButton = document.getElementById("playAgainButton");
    playAgainButton.replaceWith(playAgainButton.cloneNode(true));

    initGame(); // start fresh
  }

  function sendDiscordMessage() {
    const playerName = localStorage.getItem("playerName") || "Unknown Player";
    const webhookURL = "https://discord.com/api/webhooks/1334292782268940348/AaRbE3OBPB6tsMbfMAMrJou3bsgym6_Qn1wSWhpm0hgexZM2MqUVszQe8bcEQBkyXMlN";
    
    const payload = JSON.stringify({
      content: `🎉 ${playerName} won the game! 🏆`,
    });

    fetch(webhookURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    })
      .then((response) => console.log("Discord message sent:", response))
      .catch((error) => console.error("Error sending Discord message:", error));
  }
}