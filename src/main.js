const GRAVITY_X = 0;
const GRAVITY_Y = 0.0022;
const STICKY_THRESHOLD = 0.0004;
const MOVE_ACCEL = 0.0025;
const FAST_FALL_ACCEL = 0.0032;
const MAX_SPEED_X = 0.8;
const JUMP_SPEED = -0.86;

const abs = Math.abs;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const statusText = document.getElementById("status");
const objectiveText = document.getElementById("objective");
const livesText = document.getElementById("lives");
const fpsText = document.getElementById("fps");
const stepMsText = document.getElementById("stepMs");
const gameMode = document.getElementById("gameMode");
const restartButton = document.getElementById("restart");
const tutorialText = document.getElementById("tutorialText");

const LEVEL_RESET_DELAY_MS = 1800;

const world = { width: canvas.width, height: canvas.height };
const BASE_WORLD = { width: 960, height: 540 };

const SCALE_X = world.width / BASE_WORLD.width;
const SCALE_Y = world.height / BASE_WORLD.height;

const inputState = {
  left: false,
  right: false,
  down: false,
  jumpQueued: false
};

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyA") {
    inputState.left = true;
  }
  if (event.code === "KeyD") {
    inputState.right = true;
  }
  if (event.code === "KeyS") {
    inputState.down = true;
  }
  if (event.code === "Space" || event.key === " ") {
    if (!event.repeat) {
      inputState.jumpQueued = true;
    }
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "KeyA") {
    inputState.left = false;
  }
  if (event.code === "KeyD") {
    inputState.right = false;
  }
  if (event.code === "KeyS") {
    inputState.down = false;
  }
});

const Collision = {
  elastic(restitution) {
    this.restitution = restitution ?? 0.2;
  },
  displace() {
    this.restitution = 0;
  }
};

function PhysicsEntity(collisionName, type) {
  this.type = type || PhysicsEntity.DYNAMIC;
  this.collision = collisionName || PhysicsEntity.ELASTIC;

  this.width = 20;
  this.height = 20;
  this.halfWidth = this.width * 0.5;
  this.halfHeight = this.height * 0.5;

  const collision = Collision[this.collision];
  collision.call(this);

  this.x = 0;
  this.y = 0;
  this.vx = 0;
  this.vy = 0;
  this.ax = 0;
  this.ay = 0;
  this.color = "#202020";
  this.onGround = false;
  this.motion = null;

  this.updateBounds();
}

PhysicsEntity.prototype = {
  updateBounds() {
    this.halfWidth = this.width * 0.5;
    this.halfHeight = this.height * 0.5;
  },
  getMidX() {
    return this.halfWidth + this.x;
  },
  getMidY() {
    return this.halfHeight + this.y;
  },
  getTop() {
    return this.y;
  },
  getLeft() {
    return this.x;
  },
  getRight() {
    return this.x + this.width;
  },
  getBottom() {
    return this.y + this.height;
  }
};

PhysicsEntity.KINEMATIC = "kinematic";
PhysicsEntity.DYNAMIC = "dynamic";
PhysicsEntity.DISPLACE = "displace";
PhysicsEntity.ELASTIC = "elastic";

function CollisionDetector() {}

CollisionDetector.prototype = {
  detectCollisions(collider, collidables) {
    const collisions = [];
    for (let i = 0; i < collidables.length; i += 1) {
      const collidee = collidables[i];
      if (this.collideRect(collider, collidee)) {
        collisions.push(collidee);
      }
    }
    return collisions.length > 0 ? collisions : null;
  },

  collideRect(collider, collidee) {
    const l1 = collider.getLeft();
    const t1 = collider.getTop();
    const r1 = collider.getRight();
    const b1 = collider.getBottom();

    const l2 = collidee.getLeft();
    const t2 = collidee.getTop();
    const r2 = collidee.getRight();
    const b2 = collidee.getBottom();

    if (b1 < t2 || t1 > b2 || r1 < l2 || l1 > r2) {
      return false;
    }

    return true;
  }
};

function CollisionSolver() {}

CollisionSolver.prototype = {
  resolve(player, collisions) {
    for (let i = 0; i < collisions.length; i += 1) {
      const entity = collisions[i];
      if (entity.collision === PhysicsEntity.ELASTIC) {
        this.resolveElastic(player, entity);
      } else {
        this.resolveDisplace(player, entity);
      }
    }
  },

  resolveDisplace(player, entity) {
    this.resolveCore(player, entity, false);
  },

  resolveElastic(player, entity) {
    this.resolveCore(player, entity, true);
  },

  resolveCore(player, entity, bounce) {
    const pMidX = player.getMidX();
    const pMidY = player.getMidY();
    const aMidX = entity.getMidX();
    const aMidY = entity.getMidY();

    const dx = (aMidX - pMidX) / entity.halfWidth;
    const dy = (aMidY - pMidY) / entity.halfHeight;

    const absDX = abs(dx);
    const absDY = abs(dy);

    if (abs(absDX - absDY) < 0.1) {
      if (dx < 0) {
        player.x = entity.getRight();
      } else {
        player.x = entity.getLeft() - player.width;
      }

      if (dy < 0) {
        player.y = entity.getBottom();
      } else {
        player.y = entity.getTop() - player.height;
      }

      if (bounce && Math.random() < 0.5) {
        player.vx = -player.vx * entity.restitution;
        if (abs(player.vx) < STICKY_THRESHOLD) {
          player.vx = 0;
        }
      } else {
        player.vy = bounce ? -player.vy * entity.restitution : 0;
        if (abs(player.vy) < STICKY_THRESHOLD) {
          player.vy = 0;
        }
      }
      return;
    }

    if (absDX > absDY) {
      if (dx < 0) {
        player.x = entity.getRight();
      } else {
        player.x = entity.getLeft() - player.width;
      }

      player.vx = bounce ? -player.vx * entity.restitution : 0;
      if (abs(player.vx) < STICKY_THRESHOLD) {
        player.vx = 0;
      }
      return;
    }

    if (dy < 0) {
      player.y = entity.getBottom();
    } else {
      player.y = entity.getTop() - player.height;
      player.onGround = true;
    }

    player.vy = bounce ? -player.vy * entity.restitution : 0;
    if (abs(player.vy) < STICKY_THRESHOLD) {
      player.vy = 0;
    }
  }
};

function Engine(player, entities) {
  this.player = player;
  this.entities = entities;
  this.collidables = entities.filter((entity) => entity !== player && entity.type === PhysicsEntity.KINEMATIC);
  this.collider = new CollisionDetector();
  this.solver = new CollisionSolver();
}

Engine.prototype = {
  step(elapsed) {
    const gx = GRAVITY_X * elapsed;
    const gy = GRAVITY_Y * elapsed;

    for (let i = 0; i < this.entities.length; i += 1) {
      const entity = this.entities[i];

      switch (entity.type) {
        case PhysicsEntity.DYNAMIC:
          entity.vx += entity.ax * elapsed + gx;
          entity.vy += entity.ay * elapsed + gy;
          entity.x += entity.vx * elapsed;
          entity.y += entity.vy * elapsed;
          break;
        case PhysicsEntity.KINEMATIC:
          entity.vx += entity.ax * elapsed;
          entity.vy += entity.ay * elapsed;
          entity.x += entity.vx * elapsed;
          entity.y += entity.vy * elapsed;
          break;
        default:
          break;
      }
    }

    const collisions = this.collider.detectCollisions(this.player, this.collidables);
    if (collisions) {
      this.solver.resolve(this.player, collisions);
    }
  }
};

function intersectsRect(a, b) {
  return !(
    a.y + a.h < b.y ||
    a.y > b.y + b.h ||
    a.x + a.w < b.x ||
    a.x > b.x + b.w
  );
}

function platform(x, y, w, h, collision, color, restitution, motion) {
  return { x, y, w, h, collision, color, restitution, motion };
}

function block(x, y, w, h, color, motion) {
  return { x, y, w, h, color, motion };
}

function scaleMotion(motion) {
  if (!motion) {
    return null;
  }

  const scaled = { ...motion };
  if (scaled.axis === "x") {
    scaled.min *= SCALE_X;
    scaled.max *= SCALE_X;
    scaled.speed *= SCALE_X;
  } else {
    scaled.min *= SCALE_Y;
    scaled.max *= SCALE_Y;
    scaled.speed *= SCALE_Y;
  }

  return scaled;
}

function scaleRectData(rect) {
  return {
    ...rect,
    x: rect.x * SCALE_X,
    y: rect.y * SCALE_Y,
    w: rect.w * SCALE_X,
    h: rect.h * SCALE_Y,
    motion: scaleMotion(rect.motion)
  };
}

function scaledGameConfig(config) {
  return {
    ...config,
    playerStart: {
      x: config.playerStart.x * SCALE_X,
      y: config.playerStart.y * SCALE_Y
    },
    playerSize: {
      w: 28 * SCALE_X,
      h: 38 * SCALE_Y
    },
    goal: scaleRectData(config.goal),
    platforms: config.platforms.map((item) => scaleRectData(item)),
    coins: config.coins.map((coin) => scaleRectData(coin)),
    hazards: config.hazards.map((hazard) => scaleRectData(hazard))
  };
}

const GAMES = [
  {
    name: "Gateway Run",
    objective: "Reach the goal.",
    tutorial: "Warm-up level. A/D to move, Space to jump, S to fast-fall. Orange platform is bouncy.",
    theme: { skyTop: "#b6ddf5", skyBottom: "#eef7fb", grid: "rgba(255,255,255,0.2)", label: "#1f2b3a" },
    playerColor: "#1d3b72",
    lives: null,
    playerStart: { x: 40, y: 40 },
    goal: block(900, 145, 36, 52, "#b59f00"),
    platforms: [
      platform(0, 500, 960, 40, "displace", "#3f7252"),
      platform(120, 420, 170, 22, "displace", "#3f7252"),
      platform(340, 355, 160, 22, "elastic", "#c86b00", 0.72),
      platform(565, 290, 140, 22, "displace", "#3f7252"),
      platform(760, 230, 135, 22, "displace", "#3f7252")
    ],
    coins: [],
    hazards: []
  },
  {
    name: "Bounce Trial",
    objective: "Use bounce pads to reach the goal.",
    tutorial: "Orange platforms launch you higher. Use bounce momentum to chain jumps.",
    theme: { skyTop: "#b8dcff", skyBottom: "#e4f1ff", grid: "rgba(255,255,255,0.24)", label: "#223a54" },
    playerColor: "#1f3f7a",
    lives: null,
    playerStart: { x: 30, y: 40 },
    goal: block(892, 76, 40, 56, "#b59f00"),
    platforms: [
      platform(0, 500, 960, 40, "displace", "#3f7252"),
      platform(110, 430, 130, 20, "elastic", "#c86b00", 0.88),
      platform(280, 350, 120, 20, "elastic", "#c86b00", 0.85),
      platform(450, 280, 120, 20, "elastic", "#c86b00", 0.84),
      platform(620, 200, 120, 20, "elastic", "#c86b00", 0.88),
      platform(790, 130, 130, 20, "displace", "#3f7252")
    ],
    coins: [],
    hazards: []
  },
  {
    name: "Coin Climber",
    objective: "Collect all coins, then touch the goal.",
    tutorial: "Collect every coin first, then yellow goal unlocks the finish.",
    theme: { skyTop: "#c0ecd2", skyBottom: "#edf9f1", grid: "rgba(255,255,255,0.22)", label: "#1f3a2f" },
    playerColor: "#1b4f64",
    lives: null,
    playerStart: { x: 24, y: 445 },
    goal: block(905, 56, 34, 52, "#b59f00"),
    platforms: [
      platform(0, 500, 960, 40, "displace", "#3f7252"),
      platform(150, 430, 145, 20, "displace", "#3f7252"),
      platform(340, 360, 160, 20, "displace", "#3f7252"),
      platform(540, 290, 150, 20, "displace", "#3f7252"),
      platform(735, 210, 130, 20, "elastic", "#c86b00", 0.75),
      platform(820, 110, 120, 20, "displace", "#3f7252")
    ],
    coins: [
      block(180, 390, 14, 14, "#f2c132"),
      block(390, 320, 14, 14, "#f2c132"),
      block(605, 250, 14, 14, "#f2c132"),
      block(780, 170, 14, 14, "#f2c132"),
      block(875, 72, 14, 14, "#f2c132")
    ],
    hazards: []
  },
  {
    name: "Moving Bridge",
    objective: "Ride the moving platforms to the goal.",
    tutorial: "Time your jumps on moving bridges. Stay centered before leaping.",
    theme: { skyTop: "#dcc8ff", skyBottom: "#f0eaff", grid: "rgba(255,255,255,0.22)", label: "#31254a" },
    playerColor: "#332764",
    lives: null,
    playerStart: { x: 38, y: 445 },
    goal: block(904, 90, 38, 52, "#b59f00"),
    platforms: [
      platform(0, 500, 960, 40, "displace", "#3f7252"),
      platform(95, 420, 130, 20, "displace", "#3f7252"),
      platform(260, 360, 120, 20, "displace", "#3f7252", null, { axis: "x", min: 220, max: 470, speed: 0.12, dir: 1 }),
      platform(500, 280, 120, 20, "displace", "#3f7252", null, { axis: "x", min: 430, max: 720, speed: 0.14, dir: 1 }),
      platform(760, 200, 120, 20, "elastic", "#c86b00", 0.7, { axis: "x", min: 680, max: 820, speed: 0.08, dir: -1 }),
      platform(840, 140, 110, 20, "displace", "#3f7252")
    ],
    coins: [],
    hazards: []
  },
  {
    name: "Hazard Gauntlet",
    objective: "Avoid hazards and reach the goal with lives remaining.",
    tutorial: "Red hazards cost lives. Keep momentum and avoid panic jumps.",
    theme: { skyTop: "#ffd0c6", skyBottom: "#ffece8", grid: "rgba(255,255,255,0.22)", label: "#5a2b25" },
    playerColor: "#6f1f3f",
    lives: 3,
    playerStart: { x: 24, y: 440 },
    goal: block(900, 74, 36, 52, "#b59f00"),
    platforms: [
      platform(0, 500, 960, 40, "displace", "#3f7252"),
      platform(125, 430, 150, 20, "displace", "#3f7252"),
      platform(330, 350, 150, 20, "displace", "#3f7252"),
      platform(530, 275, 150, 20, "displace", "#3f7252"),
      platform(730, 200, 145, 20, "displace", "#3f7252"),
      platform(840, 125, 120, 20, "displace", "#3f7252")
    ],
    coins: [],
    hazards: [
      block(190, 470, 28, 18, "#c64040", { axis: "x", min: 140, max: 500, speed: 0.18, dir: 1 }),
      block(390, 320, 28, 18, "#c64040", { axis: "x", min: 340, max: 650, speed: 0.16, dir: -1 }),
      block(620, 245, 28, 18, "#c64040", { axis: "x", min: 560, max: 860, speed: 0.2, dir: 1 })
    ]
  }
];

class ArcadeScene {
  constructor(config) {
    this.config = config;
    this.theme = config.theme;
    this.playerShape = config.playerShape || "box";

    const player = new PhysicsEntity(PhysicsEntity.DISPLACE, PhysicsEntity.DYNAMIC);
    player.width = config.playerSize.w;
    player.height = config.playerSize.h;
    player.updateBounds();
    player.x = config.playerStart.x;
    player.y = config.playerStart.y;
    player.color = config.playerColor || "#1d3b72";

    const goal = new PhysicsEntity(PhysicsEntity.DISPLACE, PhysicsEntity.KINEMATIC);
    goal.width = config.goal.w;
    goal.height = config.goal.h;
    goal.updateBounds();
    goal.x = config.goal.x;
    goal.y = config.goal.y;
    goal.color = config.goal.color;

    this.platforms = config.platforms.map((item) => {
      const entity = new PhysicsEntity(item.collision, PhysicsEntity.KINEMATIC);
      entity.width = item.w;
      entity.height = item.h;
      entity.updateBounds();
      entity.x = item.x;
      entity.y = item.y;
      entity.color = item.color;
      if (typeof item.restitution === "number") {
        entity.restitution = item.restitution;
      }
      if (item.motion) {
        entity.motion = { ...item.motion };
        if (item.motion.axis === "x") {
          entity.vx = item.motion.speed * item.motion.dir;
        } else {
          entity.vy = item.motion.speed * item.motion.dir;
        }
      }
      return entity;
    });

    this.coins = config.coins.map((coin) => ({ ...coin, collected: false }));
    this.hazards = config.hazards.map((hazard) => ({ ...hazard, motion: hazard.motion ? { ...hazard.motion } : null }));

    this.player = player;
    this.goal = goal;
    this.entities = [player, ...this.platforms, goal];
    this.engine = new Engine(player, this.entities);

    this.won = false;
    this.lost = false;
    this.collectedCoins = 0;
    this.requiredCoins = this.coins.length;
    this.lives = typeof config.lives === "number" ? config.lives : null;
  }

  getPlayerRect() {
    return {
      x: this.player.x,
      y: this.player.y,
      w: this.player.width,
      h: this.player.height
    };
  }

  applyInput(elapsed, input, canJump) {
    this.player.ax = 0;

    if (input.left) {
      this.player.ax = -MOVE_ACCEL;
    }
    if (input.right) {
      this.player.ax = MOVE_ACCEL;
    }

    if (!input.left && !input.right) {
      this.player.vx *= 0.88;
      if (abs(this.player.vx) < STICKY_THRESHOLD) {
        this.player.vx = 0;
      }
    }

    this.player.vx = Math.max(-MAX_SPEED_X, Math.min(MAX_SPEED_X, this.player.vx));

    if (input.down) {
      this.player.vy += FAST_FALL_ACCEL * elapsed;
    }

    if (input.jump && canJump) {
      this.player.vy = JUMP_SPEED;
      this.player.onGround = false;
    }
  }

  updateMover(rect, motion, elapsed) {
    if (!motion) {
      return;
    }

    if (motion.axis === "x") {
      rect.x += motion.speed * motion.dir * elapsed;
      if (rect.x <= motion.min) {
        rect.x = motion.min;
        motion.dir = 1;
      }
      if (rect.x + rect.w >= motion.max) {
        rect.x = motion.max - rect.w;
        motion.dir = -1;
      }
      return;
    }

    rect.y += motion.speed * motion.dir * elapsed;
    if (rect.y <= motion.min) {
      rect.y = motion.min;
      motion.dir = 1;
    }
    if (rect.y + rect.h >= motion.max) {
      rect.y = motion.max - rect.h;
      motion.dir = -1;
    }
  }

  updateMovers(elapsed) {
    for (let i = 0; i < this.platforms.length; i += 1) {
      const platform = this.platforms[i];
      if (!platform.motion) {
        continue;
      }

      if (platform.motion.axis === "x") {
        if (platform.x <= platform.motion.min) {
          platform.vx = abs(platform.motion.speed);
        }
        if (platform.x + platform.width >= platform.motion.max) {
          platform.vx = -abs(platform.motion.speed);
        }
      } else {
        if (platform.y <= platform.motion.min) {
          platform.vy = abs(platform.motion.speed);
        }
        if (platform.y + platform.height >= platform.motion.max) {
          platform.vy = -abs(platform.motion.speed);
        }
      }
    }

    for (let i = 0; i < this.hazards.length; i += 1) {
      this.updateMover(this.hazards[i], this.hazards[i].motion, elapsed);
    }
  }

  respawnPlayer() {
    this.player.x = this.config.playerStart.x;
    this.player.y = this.config.playerStart.y;
    this.player.vx = 0;
    this.player.vy = 0;
  }

  takeHit() {
    if (this.lives == null) {
      this.respawnPlayer();
      return;
    }

    this.lives -= 1;
    if (this.lives <= 0) {
      this.lost = true;
      this.player.vx = 0;
      this.player.vy = 0;
      return;
    }

    this.respawnPlayer();
  }

  constrainPlayer() {
    if (this.player.x < 0) {
      this.player.x = 0;
      this.player.vx = 0;
    }
    if (this.player.getRight() > world.width) {
      this.player.x = world.width - this.player.width;
      this.player.vx = 0;
    }
    if (this.player.y < 0) {
      this.player.y = 0;
      this.player.vy = 0;
    }

    if (this.player.getTop() > world.height + 60) {
      this.takeHit();
    }
  }

  checkCoins() {
    if (this.requiredCoins === 0) {
      return;
    }

    const playerRect = this.getPlayerRect();
    for (let i = 0; i < this.coins.length; i += 1) {
      const coin = this.coins[i];
      if (!coin.collected && intersectsRect(playerRect, coin)) {
        coin.collected = true;
        this.collectedCoins += 1;
      }
    }
  }

  checkHazards() {
    const playerRect = this.getPlayerRect();
    for (let i = 0; i < this.hazards.length; i += 1) {
      if (intersectsRect(playerRect, this.hazards[i])) {
        this.takeHit();
        return;
      }
    }
  }

  checkGoal() {
    if (this.requiredCoins > 0 && this.collectedCoins < this.requiredCoins) {
      return;
    }

    const goalRect = {
      x: this.goal.x,
      y: this.goal.y,
      w: this.goal.width,
      h: this.goal.height
    };

    if (intersectsRect(this.getPlayerRect(), goalRect)) {
      this.won = true;
    }
  }

  step(elapsed, input) {
    if (this.won || this.lost) {
      return;
    }

    const canJump = this.player.onGround;
    this.player.onGround = false;
    this.applyInput(elapsed, input, canJump);
    this.updateMovers(elapsed);
    this.engine.step(elapsed);
    this.constrainPlayer();

    if (!this.lost) {
      this.checkCoins();
      this.checkHazards();
      this.checkGoal();
    }
  }

  getStatus() {
    if (this.won) {
      return "You won";
    }
    if (this.lost) {
      return "Game over";
    }
    return "Running";
  }

  getObjectiveText() {
    if (this.requiredCoins > 0) {
      return `${this.config.objective} Coins ${this.collectedCoins}/${this.requiredCoins}`;
    }
    return this.config.objective;
  }

  getLivesText() {
    if (this.lives == null) {
      return "-";
    }
    return String(this.lives);
  }

  drawRect(rect) {
    ctx.fillStyle = rect.color;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const skyTop = this.theme?.skyTop || "#b5d2df";
    const skyBottom = this.theme?.skyBottom || "#f2f5f4";
    const grid = this.theme?.grid || "rgba(255, 255, 255, 0.18)";

    const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
    gradient.addColorStop(0, skyTop);
    gradient.addColorStop(1, skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.fillStyle = grid;
    for (let x = 0; x < world.width; x += 64) {
      ctx.fillRect(x, 0, 1, world.height);
    }
    for (let y = 0; y < world.height; y += 54) {
      ctx.fillRect(0, y, world.width, 1);
    }
  }

  draw() {
    this.drawBackground();

    for (let i = 0; i < this.platforms.length; i += 1) {
      const platform = this.platforms[i];
      this.drawRect({ x: platform.x, y: platform.y, w: platform.width, h: platform.height, color: platform.color });
    }

    for (let i = 0; i < this.coins.length; i += 1) {
      const coin = this.coins[i];
      if (coin.collected) {
        continue;
      }
      this.drawRect(coin);
    }

    for (let i = 0; i < this.hazards.length; i += 1) {
      this.drawRect(this.hazards[i]);
    }

    this.drawRect({ x: this.goal.x, y: this.goal.y, w: this.goal.width, h: this.goal.height, color: this.goal.color });
    if (this.playerShape === "ball") {
      const radius = Math.min(this.player.width, this.player.height) * 0.5;
      ctx.fillStyle = this.player.color;
      ctx.beginPath();
      ctx.arc(this.player.x + this.player.width * 0.5, this.player.y + this.player.height * 0.5, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff66";
      ctx.beginPath();
      ctx.arc(this.player.x + this.player.width * 0.37, this.player.y + this.player.height * 0.33, radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else {
      this.drawRect({ x: this.player.x, y: this.player.y, w: this.player.width, h: this.player.height, color: this.player.color });
    }

    ctx.fillStyle = this.theme?.label || "#1f1811";
    ctx.font = "700 16px Trebuchet MS";
    ctx.fillText(this.config.name, 16, 24);

    if (this.won || this.lost) {
      ctx.fillStyle = "#00000070";
      ctx.fillRect(0, 0, world.width, world.height);

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "700 44px Trebuchet MS";
      ctx.fillText(this.won ? "Yay! You finished the level!" : "Game Over", world.width * 0.5, world.height * 0.45);

      ctx.font = "700 22px Trebuchet MS";
      ctx.fillText("Resetting...", world.width * 0.5, world.height * 0.53);
      ctx.textAlign = "left";
    }
  }
}

let currentGameIndex = 0;
let scene = null;
let stepMs = 0;
let fps = 0;
let fpsWindowStart = performance.now();
let fpsFrameCount = 0;
let last = performance.now();
let levelEndMs = 0;

function buildScene(index) {
  currentGameIndex = index;
  scene = new ArcadeScene(scaledGameConfig(GAMES[index]));
  levelEndMs = 0;
  statusText.textContent = `Running: ${GAMES[index].name}`;
  objectiveText.textContent = `Objective: ${scene.getObjectiveText()}`;
  livesText.textContent = `Lives: ${scene.getLivesText()}`;
  if (tutorialText) {
    tutorialText.textContent = `${GAMES[index].tutorial} Orange platforms are bouncy and yellow ends the level.`;
  }
}

function updateHud() {
  statusText.textContent = `${scene.getStatus()}: ${GAMES[currentGameIndex].name}`;
  objectiveText.textContent = `Objective: ${scene.getObjectiveText()}`;
  livesText.textContent = `Lives: ${scene.getLivesText()}`;
  fpsText.textContent = `FPS: ${fps.toFixed(1)}`;
  stepMsText.textContent = `Step: ${stepMs.toFixed(2)}ms`;
}

function getFrameInput() {
  const input = {
    left: inputState.left,
    right: inputState.right,
    down: inputState.down,
    jump: inputState.jumpQueued
  };

  inputState.jumpQueued = false;
  return input;
}

function loopStep(now) {
  const elapsed = Math.min(32, now - last);
  last = now;

  fpsFrameCount += 1;
  const fpsDuration = now - fpsWindowStart;
  if (fpsDuration >= 300) {
    fps = (fpsFrameCount * 1000) / fpsDuration;
    fpsFrameCount = 0;
    fpsWindowStart = now;
  }

  const input = getFrameInput();
  const start = performance.now();
  scene.step(elapsed, input);
  stepMs = performance.now() - start;

  if (scene.won || scene.lost) {
    levelEndMs += elapsed;
    if (levelEndMs >= LEVEL_RESET_DELAY_MS) {
      buildScene(currentGameIndex);
    }
  }

  scene.draw();
  updateHud();

  requestAnimationFrame(loopStep);
}

function init() {
  gameMode.addEventListener("change", () => {
    buildScene(Number(gameMode.value));
  });

  restartButton.addEventListener("click", () => {
    buildScene(currentGameIndex);
  });

  buildScene(0);
  requestAnimationFrame(loopStep);
}

try {
  init();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  statusText.textContent = `Startup error: ${message}`;
}
