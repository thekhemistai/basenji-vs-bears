interface GameCallbacks {
  onScoreChange: (score: number) => void;
  onHeartsChange: (hearts: number) => void;
  onGameOver: () => void;
}

import { SoundManager } from './SoundManager';

interface Bone {
  x: number;
  y: number;
  isGolden: boolean;
}

interface Bear {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  type: 'brown' | 'red' | 'blue';
  spawnTime: number;
  movePattern: 'normal' | 'wave' | 'zigzag' | 'orbiter' | 'charger';
  chargeState?: 'pausing' | 'charging';
  pauseStartTime?: number;
  orbitAngle?: number;
  orbitRadius?: number;
}

interface PowerUp {
  x: number;
  y: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  startTime: number;
  duration: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameCallbacks;
  private soundManager: SoundManager;
  private animationId: number | null = null;
  private gameTime = 0;
  private lastSpawn = 0;
  private lastFrameTime = 0;

  // Game state
  private score = 0;
  private hearts = 3;
  private gameRunning = false;
  private gameOver = false;
  private isDying = false;
  private deathStartTime = 0;

  // Background particles
  private particles: Array<{x: number, y: number, size: number, speed: number, alpha: number}> = [];

  // Player
  private playerX = 0;
  private playerY = 0;
  private playerVelocityX = 0;
  private playerVelocityY = 0;
  private readonly playerSize = 40;
  private readonly playerSpeed = 0.3;
  private playerSlowed = false;
  private slowEndTime = 0;
  private playerHit = false;
  private hitFlashTime = 0;
  private screenShake = 0;

  // Input
  private targetX = 0;
  private targetY = 0;

  // Game objects
  private bones: Bone[] = [];
  private bears: Bear[] = [];
  private powerUps: PowerUp[] = [];
  private scoreMultiplier = 1;
  private multiplierEndTime = 0;
  private scorePopups: ScorePopup[] = [];

  // Score popup constants
  private readonly POPUP_DURATION = 1000;
  private readonly POPUP_FLOAT_DISTANCE = 60;
  private readonly POPUP_COLOR = '#fbbf24';
  private readonly POPUP_OUTLINE_COLOR = '#92400e';
  private readonly POPUP_FONT = 'bold 22px "Arial", sans-serif';

  // Player sprite
  private playerSprite: HTMLImageElement | null = null;
  
  // Cached gradient for performance
  private bgGradient: CanvasGradient | null = null;
  
  // Bound handlers for cleanup
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleTouchStart: (e: TouchEvent) => void;
  private boundHandleTouchMove: (e: TouchEvent) => void;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.soundManager = new SoundManager();

    // Load player sprite
    this.playerSprite = new Image();
    this.playerSprite.src = '/basenji-logo.jpg';

    // Initialize background particles
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    // Initialize player at center
    this.playerX = canvas.width / 2;
    this.playerY = canvas.height / 2;
    this.targetX = this.playerX;
    this.targetY = this.playerY;

    // Create cached gradient for performance
    this.bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    this.bgGradient.addColorStop(0, '#4c1d95');
    this.bgGradient.addColorStop(0.5, '#111827');
    this.bgGradient.addColorStop(1, '#1e3a8a');

    // Create bound handlers for proper cleanup
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleTouchStart = this.handleTouchStart.bind(this);
    this.boundHandleTouchMove = this.handleTouchMove.bind(this);

    canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    canvas.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });

    // Initial callbacks
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onHeartsChange(this.hearts);
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.targetX = e.clientX - rect.left;
    this.targetY = e.clientY - rect.top;
  }

  private handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Don't jump - just start tracking from current player position
    // The next touchMove will smoothly move towards the finger
    // This prevents slingshot when lifting and placing finger elsewhere
    this.targetX = this.playerX + (touchX - this.playerX) * 0.1;
    this.targetY = this.playerY + (touchY - this.playerY) * 0.1;
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    // Absolute positioning - player follows finger
    this.targetX = touch.clientX - rect.left;
    this.targetY = touch.clientY - rect.top;
  }

  public start() {
    this.gameRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  public stop() {
    this.gameRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    // Remove event listeners to prevent memory leaks and double-firing
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.removeEventListener('touchstart', this.boundHandleTouchStart);
    this.canvas.removeEventListener('touchmove', this.boundHandleTouchMove);
    // Clean up sound resources
    this.soundManager.destroy();
  }

  private gameLoop() {
    if (!this.gameRunning) return;
    
    // Calculate delta time for FPS-independent gameplay
    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    
    // Handle death animation
    if (this.isDying) {
      const deathElapsed = Date.now() - this.deathStartTime;
      if (deathElapsed > 1500) {
        this.gameOver = true;
        this.callbacks.onGameOver();
        return;
      }
      // Continue rendering death animation
      this.render();
      this.animationId = requestAnimationFrame(() => this.gameLoop());
      return;
    }
    
    if (this.gameOver) return;

    const wallNow = Date.now();
    this.gameTime += delta * 1000;

    // Check if multiplier expired
    if (this.scoreMultiplier > 1 && wallNow > this.multiplierEndTime) {
      this.scoreMultiplier = 1;
    }

    // Check if slow effect expired
    if (this.playerSlowed && wallNow > this.slowEndTime) {
      this.playerSlowed = false;
    }

    // Player movement - precise, follows cursor exactly with slight smoothing
    let speedMultiplier = this.playerSlowed ? 0.5 : 1;
    const dx = this.targetX - this.playerX;
    const dy = this.targetY - this.playerY;
    
    // Direct movement with lerp for smoothness
    this.playerX += dx * this.playerSpeed * speedMultiplier;
    this.playerY += dy * this.playerSpeed * speedMultiplier;

    // Keep player in bounds
    this.playerX = Math.max(this.playerSize/2, Math.min(this.canvas.width - this.playerSize/2, this.playerX));
    this.playerY = Math.max(this.playerSize/2, Math.min(this.canvas.height - this.playerSize/2, this.playerY));

    // Score increases over time (12 points per second, FPS-independent)
    this.score += 12 * delta;
    this.callbacks.onScoreChange(Math.floor(this.score));

    // Spawn bones
    if (wallNow - this.lastSpawn > 2000 && this.bones.length < 5) {
      this.spawnBone();
      this.lastSpawn = wallNow;
    }

    // Spawn power-ups (less frequent, max 2 at a time)
    if (this.powerUps.length < 2 && Math.random() < 0.004) {
      this.spawnPowerUp();
    }

    // Spawn bears based on game time
    this.spawnBears(wallNow);

    // Update bears
    this.updateBears();

    // Check collisions
    this.checkCollisions();

    // Render
    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private spawnBone() {
    const isGolden = Math.random() < 0.1;
    const padding = 60;
    this.bones.push({
      x: padding + Math.random() * (this.canvas.width - padding * 2),
      y: padding + Math.random() * (this.canvas.height - padding * 2),
      isGolden,
    });
  }

  private spawnPowerUp() {
    const padding = 60;
    this.powerUps.push({
      x: padding + Math.random() * (this.canvas.width - padding * 2),
      y: padding + Math.random() * (this.canvas.height - padding * 2),
    });
  }

  private spawnBears(now: number) {
    const gameTimeSeconds = this.gameTime / 1000;
    const maxBears = Math.min(6 + Math.floor(gameTimeSeconds / 20), 18);

    if (this.bears.length >= maxBears) return;

    // Spawn rate - faster start, steady ramp
    const spawnChance = Math.min(0.025 + gameTimeSeconds / 4000, 0.06);
    if (Math.random() > spawnChance) return;

    // Determine bear type based on game time.
    // Check red BEFORE blue so the blue probability range doesn't block red.
    // After 25s: 15% blue (0–0.15), 35% red (0.15–0.50), 50% brown.
    let type: 'brown' | 'red' | 'blue' = 'brown';
    const roll = Math.random();

    if (gameTimeSeconds > 15) {
      if (roll < 0.15) type = 'blue';       // 15% ice bear
      else if (roll < 0.50) type = 'red';   // 35% wave bear
      // else brown (50%)
    } else if (gameTimeSeconds > 10 && roll < 0.15) {
      type = 'blue';
    }

    // Spawn at edge of screen with CONVERGING movement toward player
    let x = 0, y = 0, vx = 0, vy = 0;
    const speed = type === 'brown' ? 2.0 : type === 'red' ? 2.8 : 2.3;
    
    // Pick an edge to spawn from
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    
    switch (edge) {
      case 0: // Top
        x = Math.random() * this.canvas.width;
        y = -40;
        break;
      case 1: // Right
        x = this.canvas.width + 40;
        y = Math.random() * this.canvas.height;
        break;
      case 2: // Bottom
        x = Math.random() * this.canvas.width;
        y = this.canvas.height + 40;
        break;
      case 3: // Left
        x = -40;
        y = Math.random() * this.canvas.height;
        break;
    }
    
    // Calculate direction toward player (with some randomness so they don't ALL hit)
    const dx = this.playerX - x;
    const dy = this.playerY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      // Base direction toward player
      let dirX = dx / dist;
      let dirY = dy / dist;
      
      // Add randomness: ±30 degrees variation
      const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 1.0; // ~±30deg
      dirX = Math.cos(angle);
      dirY = Math.sin(angle);
      
      vx = dirX * speed;
      vy = dirY * speed;
    } else {
      // Fallback to horizontal if player is at spawn point somehow
      vx = x < this.canvas.width / 2 ? speed : -speed;
    }

    // Assign movement pattern based on type and game progression
    let movePattern: Bear['movePattern'] = 'normal';

    if (type === 'red') {
      movePattern = 'wave'; // Red bears: simple wave movement
    }
    // Blue and brown: normal straight movement (no fancy patterns)

    this.bears.push({
      x,
      y,
      velocityX: vx,
      velocityY: vy,
      type,
      spawnTime: now,
      movePattern,
    });
  }

  private updateBears() {
    const now = Date.now();
    const gameTimeSeconds = this.gameTime / 1000;

    this.bears = this.bears.filter(bear => {
      // Wave movement: simple perpendicular wiggle (red bears only)
      if (bear.movePattern === 'wave') {
        const timeAlive = (now - bear.spawnTime) / 1000;
        if (bear.velocityX !== 0) {
          bear.y += Math.sin(timeAlive * 4) * 3;
        } else {
          bear.x += Math.sin(timeAlive * 4) * 3;
        }
      }

      // Brown bears have slight tracking toward player (after 40s)
      if (bear.type === 'brown' && gameTimeSeconds > 40) {
        const dx = this.playerX - bear.x;
        const dy = this.playerY - bear.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          bear.velocityX += (dx / dist) * 0.01;
          bear.velocityY += (dy / dist) * 0.01;
        }
      }

      bear.x += bear.velocityX;
      bear.y += bear.velocityY;

      // Keep bears that are still on screen
      return bear.x > -100 && bear.x < this.canvas.width + 100 &&
             bear.y > -100 && bear.y < this.canvas.height + 100;
    });
  }

  private checkCollisions() {
    const playerRadius = this.playerSize / 2;

    // Check bone collisions
    for (let i = this.bones.length - 1; i >= 0; i--) {
      const bone = this.bones[i];
      const dx = this.playerX - bone.x;
      const dy = this.playerY - bone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerRadius + 15) {
        // Collect bone
        const points = bone.isGolden ? 30 : 6;
        const earned = points * this.scoreMultiplier;
        this.score += earned;
        this.callbacks.onScoreChange(this.score);

        // Spawn score popup at bone position
        this.spawnScorePopup(bone.x, bone.y, `+${earned}`);

        this.bones.splice(i, 1);

        // Play sound
        if (bone.isGolden) {
          this.soundManager.playGoldenBone();
        } else {
          this.soundManager.playBoneCollect();
        }
      }
    }

    // Check power-up collisions
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const powerUp = this.powerUps[i];
      const dx = this.playerX - powerUp.x;
      const dy = this.playerY - powerUp.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerRadius + 18) {
        // Collect power-up: double score multiplier, max x6
        this.scoreMultiplier = Math.min(this.scoreMultiplier * 2, 6);
        this.multiplierEndTime = Date.now() + 3000;

        // Spawn popup showing new multiplier
        this.spawnScorePopup(powerUp.x, powerUp.y, `x${this.scoreMultiplier}!`);

        this.powerUps.splice(i, 1);

        // Play sound
        this.soundManager.playPowerUp();
      }
    }

    // Check bear collisions
    for (const bear of this.bears) {
      const dx = this.playerX - bear.x;
      const dy = this.playerY - bear.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const bearRadius = bear.type === 'blue' ? 14 : 17;

      if (distance < playerRadius + bearRadius) {
        if (bear.type === 'blue') {
          // Ice bear slows player
          this.playerSlowed = true;
          this.slowEndTime = Date.now() + 3000;
          this.playerHit = true;
          this.hitFlashTime = Date.now();
          this.screenShake = 10;
          
          // Play sound
          this.soundManager.playHit();
          
          // Remove bear
          const index = this.bears.indexOf(bear);
          if (index > -1) this.bears.splice(index, 1);
        } else {
          // Brown and red bears take hearts
          this.hearts--;
          this.callbacks.onHeartsChange(this.hearts);
          
          // Visual feedback
          this.playerHit = true;
          this.hitFlashTime = Date.now();
          this.screenShake = 15;
          
          // Play sound
          this.soundManager.playHit();
          
          // Remove bear to prevent multiple hits
          const index = this.bears.indexOf(bear);
          if (index > -1) this.bears.splice(index, 1);

          if (this.hearts <= 0 && !this.isDying) {
            this.isDying = true;
            this.deathStartTime = Date.now();
            // Don't call onGameOver yet - wait for death animation
          }
        }
      }
    }
  }

  private spawnScorePopup(x: number, y: number, text: string) {
    this.scorePopups.push({
      x,
      y,
      text,
      startTime: Date.now(),
      duration: this.POPUP_DURATION,
    });
  }

  private render() {
    // Apply screen shake
    let shakeX = 0, shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake;
      shakeY = (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.9;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }
    
    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);
    
    // Draw cached gradient background (matches UI screens: purple-900 → gray-900 → blue-900)
    this.ctx.fillStyle = this.bgGradient!;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update and draw particles
    for (const particle of this.particles) {
      particle.y -= particle.speed;
      if (particle.y < -10) {
        particle.y = this.canvas.height + 10;
        particle.x = Math.random() * this.canvas.width;
      }
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw multiplier indicator with glow
    if (this.scoreMultiplier > 1) {
      this.ctx.shadowColor = '#f59e0b';
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.font = 'bold 24px sans-serif';
      this.ctx.fillText(`x${this.scoreMultiplier}`, 20, 100);
      this.ctx.shadowBlur = 0;
    }

    // Draw slow indicator with glow
    if (this.playerSlowed) {
      this.ctx.shadowColor = '#3b82f6';
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.font = 'bold 20px sans-serif';
      this.ctx.fillText('SLOWED!', 20, 130);
      this.ctx.shadowBlur = 0;
    }

    // Draw bones
    for (const bone of this.bones) {
      this.ctx.font = bone.isGolden ? '28px sans-serif' : '24px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Golden glow for special bones
      if (bone.isGolden) {
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.shadowBlur = 10;
      }
      
      this.ctx.fillText('🦴', bone.x, bone.y);
      
      // Reset shadow
      if (bone.isGolden) {
        this.ctx.shadowBlur = 0;
      }
    }

    // Draw power-ups
    for (const powerUp of this.powerUps) {
      // Glow effect
      this.ctx.shadowColor = '#f59e0b';
      this.ctx.shadowBlur = 15;
      
      // Power-up circle
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, 15, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Inner circle
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.beginPath();
      this.ctx.arc(powerUp.x, powerUp.y, 10, 0, Math.PI * 2);
      this.ctx.fill();
      
      // "2x" text
      this.ctx.fillStyle = '#000';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('2x', powerUp.x, powerUp.y + 4);
      
      // Reset shadow
      this.ctx.shadowBlur = 0;
    }

    // Draw bears
    for (const bear of this.bears) {
      const size = bear.type === 'blue' ? 27 : 33;
      const scale = size / 44; // Scale factor relative to original
      
      // Bear body
      if (bear.type === 'brown') {
        this.ctx.fillStyle = '#78350f';
      } else if (bear.type === 'red') {
        this.ctx.fillStyle = '#dc2626';
      } else {
        this.ctx.fillStyle = '#3b82f6';
      }
      
      this.ctx.beginPath();
      this.ctx.arc(bear.x, bear.y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Bear ears (scaled)
      this.ctx.beginPath();
      this.ctx.arc(bear.x - 15 * scale, bear.y - 15 * scale, 8 * scale, 0, Math.PI * 2);
      this.ctx.arc(bear.x + 15 * scale, bear.y - 15 * scale, 8 * scale, 0, Math.PI * 2);
      this.ctx.fill();

      // Bear eyes (angry, scaled)
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(bear.x - 12 * scale, bear.y - 5 * scale, 6 * scale, 0, Math.PI * 2);
      this.ctx.arc(bear.x + 12 * scale, bear.y - 5 * scale, 6 * scale, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(bear.x - 12 * scale, bear.y - 5 * scale, 3 * scale, 0, Math.PI * 2);
      this.ctx.arc(bear.x + 12 * scale, bear.y - 5 * scale, 3 * scale, 0, Math.PI * 2);
      this.ctx.fill();

      // Bear nose (scaled)
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(bear.x, bear.y + 5 * scale, 6 * scale, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw player (Basenji)
    const now = Date.now();
    let playerColor = '#fbbf24';
    let playerScale = 1;
    let playerAlpha = 1;
    
    if (this.isDying) {
      const deathElapsed = now - this.deathStartTime;
      const deathProgress = deathElapsed / 1500; // 0 to 1 over 1.5 seconds
      
      // Scale up then down
      playerScale = 1 + Math.sin(deathProgress * Math.PI) * 0.5;
      // Fade out
      playerAlpha = 1 - deathProgress;
      // Flash red during death
      playerColor = '#ef4444';
    } else {
      if (this.playerSlowed) playerColor = '#60a5fa';
      if (this.playerHit && now - this.hitFlashTime < 200) {
        playerColor = '#ef4444'; // Red flash on hit
      }
      if (now - this.hitFlashTime > 300) {
        this.playerHit = false;
      }
    }
    
    this.ctx.save();
    this.ctx.globalAlpha = playerAlpha;
    this.ctx.translate(this.playerX, this.playerY);
    this.ctx.scale(playerScale, playerScale);
    
    // Draw player sprite or fallback to shapes
    if (this.playerSprite && this.playerSprite.complete) {
      const size = this.playerSize * 1.3;
      
      // Draw glow shadow first (like start screen)
      this.ctx.shadowColor = 'rgba(147, 51, 234, 0.5)';
      this.ctx.shadowBlur = 15;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      
      // Draw border circle with glow
      this.ctx.beginPath();
      this.ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(147, 51, 234, 0.5)';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
      
      // Reset shadow for image
      this.ctx.shadowBlur = 0;
      
      // Create circular clip for image
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, size / 2 - 2, 0, Math.PI * 2);
      this.ctx.clip();
      
      // Draw image with high quality
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.drawImage(
        this.playerSprite,
        -size / 2 + 2,
        -size / 2 + 2,
        size - 4,
        size - 4
      );
      
      this.ctx.restore();
      
      // Apply color tint for effects (hit, slowed, dying)
      if (playerColor !== '#fbbf24') {
        this.ctx.globalCompositeOperation = 'source-atop';
        this.ctx.fillStyle = playerColor;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = playerAlpha;
      }
    } else {
      // Fallback: Draw simple player circle
      this.ctx.fillStyle = playerColor;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.playerSize / 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Player ears (pointy like Basenji)
      this.ctx.beginPath();
      this.ctx.moveTo(-15, -10);
      this.ctx.lineTo(-25, -30);
      this.ctx.lineTo(-5, -15);
      this.ctx.fill();
      
      this.ctx.beginPath();
      this.ctx.moveTo(15, -10);
      this.ctx.lineTo(25, -30);
      this.ctx.lineTo(5, -15);
      this.ctx.fill();
      
      // Player eyes
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(-8, -5, 3, 0, Math.PI * 2);
      this.ctx.arc(8, -5, 3, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Player nose
      this.ctx.beginPath();
      this.ctx.arc(0, 5, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore(); // Restore player death animation transform

    // Draw and update score popups (reverse loop for safe splice)
    const popupNow = Date.now();
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const popup = this.scorePopups[i];
      const elapsed = popupNow - popup.startTime;
      
      if (elapsed >= popup.duration) {
        this.scorePopups.splice(i, 1);
        continue;
      }

      const progress = elapsed / popup.duration;
      const alpha = 1 - progress;
      const yOffset = progress * this.POPUP_FLOAT_DISTANCE;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      // Shadow for readability against any background
      this.ctx.shadowColor = 'rgba(0,0,0,0.9)';
      this.ctx.shadowBlur = 6;

      // Gold outline
      this.ctx.strokeStyle = this.POPUP_OUTLINE_COLOR;
      this.ctx.lineWidth = 3;
      this.ctx.font = this.POPUP_FONT;
      this.ctx.strokeText(popup.text, popup.x, popup.y - yOffset);

      this.ctx.fillStyle = this.POPUP_COLOR;
      this.ctx.fillText(popup.text, popup.x, popup.y - yOffset);

      this.ctx.restore();
    }

    this.ctx.restore(); // Restore screen shake transform
  }
}