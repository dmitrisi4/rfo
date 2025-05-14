import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Texture } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { Component } from "../utils/EntityComponentSystem";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { Animation } from "@babylonjs/core/Animations/animation";

// Animation states for character
export enum CharacterAnimationState {
    IDLE = "Idle",
    WALKING = "Walk",
    RUNNING = "running",
    ATTACKING = "attacking",
    DYING = "dying"
}

// Character races from RF Online
export enum CharacterRace {
    BELLATO = "bellato",
    CORA = "cora",
    ACCRETIA = "accretia"
}

// Base stats for a character
export interface CharacterStats {
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    attack: number;
    defense: number;
    speed: number;
    level: number;
    experience: number;
}

// Character component that handles common character behaviors
export class CharacterComponent implements Component {
    private _scene: Scene;
    private _mesh: Mesh;
    private _race: CharacterRace;
    private _stats: CharacterStats;
    private _isDead: boolean = false;
    private _isMoving: boolean = false;
    private _targetPosition?: Vector3;
    
    // Animation properties
    private _animationGroups: AnimationGroup[] = [];
    private _currentAnimation?: AnimationGroup;
    private _animationState: CharacterAnimationState = CharacterAnimationState.IDLE;
    
    constructor(scene: Scene, race: CharacterRace = CharacterRace.BELLATO, position: Vector3 = Vector3.Zero()) {
        this._scene = scene;
        this._race = race;
        
        // Create a temporary mesh for the character
        this._mesh = this.createCharacterMesh(position);
        
        // Load appropriate model based on race
        switch(race) {
            case CharacterRace.BELLATO:
                // For Bellato, we'll use the buster_drone model
                const modelUrl = "assets/textures/";
                const fileName = "Character_Female_1.gltf";
                this.loadBusterDroneModel(position);
                break;
            default:
                // For other races, we'll stick to the simple mesh for now
                break;
        }
        
        // Initialize character stats based on race
        this._stats = this.initializeStats(race);
    }
    
    // Initialize stats based on race
    private initializeStats(race: CharacterRace): CharacterStats {
        switch(race) {
            case CharacterRace.BELLATO:
                return {
                    health: 100,
                    maxHealth: 100,
                    mana: 100,
                    maxMana: 100,
                    attack: 10,
                    defense: 5,
                    speed: 3,
                    level: 1,
                    experience: 0
                };
            case CharacterRace.CORA:
                return {
                    health: 80,
                    maxHealth: 80,
                    mana: 120,
                    maxMana: 120,
                    attack: 15,
                    defense: 3,
                    speed: 4,
                    level: 1,
                    experience: 0
                };
            case CharacterRace.ACCRETIA:
                return {
                    health: 120,
                    maxHealth: 120,
                    mana: 80,
                    maxMana: 80,
                    attack: 12,
                    defense: 8,
                    speed: 2,
                    level: 1,
                    experience: 0
                };
            default:
                return {
                    health: 100,
                    maxHealth: 100,
                    mana: 100,
                    maxMana: 100,
                    attack: 10,
                    defense: 5,
                    speed: 3,
                    level: 1,
                    experience: 0
                };
        }
    }
    
    // Create a simple character mesh with color based on race
    private createCharacterMesh(position: Vector3): Mesh {
        const mesh = MeshBuilder.CreateBox("character", { width: 1, height: 2, depth: 1 }, this._scene);
        mesh.position = new Vector3(position.x, position.y + 1, position.z); // Add height offset
        
        const material = new StandardMaterial("characterMaterial", this._scene);
        
        // Set color or texture based on race
        switch(this._race) {
            case CharacterRace.BELLATO:
                // Apply buster_drone texture for Bellato race
                const baseColorTexture = new Texture("assets/textures/buster_drone/textures/body_baseColor.png", this._scene);
                const normalMapTexture = new Texture("assets/textures/buster_drone/textures/body_normal.png", this._scene);
                const emissiveTexture = new Texture("assets/textures/buster_drone/textures/body_emissive.png", this._scene);
                
                material.diffuseTexture = baseColorTexture;
                material.bumpTexture = normalMapTexture;
                material.emissiveTexture = emissiveTexture;
                material.emissiveColor = new Color3(1, 1, 1);
                break;
            case CharacterRace.CORA:
                material.diffuseColor = new Color3(1, 0, 0); // Red
                break;
            case CharacterRace.ACCRETIA:
                material.diffuseColor = new Color3(0.5, 0.5, 0.5); // Grey
                break;
        }
        
        mesh.material = material;
        return mesh;
    }
    
    // Load the buster_drone model for the character
    private loadBusterDroneModel(position: Vector3): void {
        // Load the model
        console.log("Loading buster_drone model with animations");
        
        SceneLoader.ImportMeshAsync(
            "", // Names of meshes to import (empty means all)
            "assets/textures/", // Base URL
            "Character_Female_1.gltf", // Model file path
            this._scene // Scene to import into
        ).then(result => {
            if (result.meshes.length > 0) {
                
                console.log(`Loaded buster_drone model with ${result.meshes.length} meshes and ${result.animationGroups.length} animation groups`);
                
                // Create a parent container for the model
                const modelContainer = new TransformNode("busterDroneContainer", this._scene);
                modelContainer.position = this._mesh.position.clone();
                
                // Hide the placeholder box mesh
                this._mesh.isVisible = false;
                
                // Scale the model appropriately
                const scaleFactor = 0.5; // Smaller size works better for this model
                
                // Process all meshes in the model
                result.meshes.forEach((mesh) => {
                    // Skip invisible meshes
                    if (!mesh.isVisible) return;
                    
                    console.log(`Processing mesh: ${mesh.name}`);
                    
                    // Set mesh pickability
                    mesh.isPickable = true;
                    
                    // Parent the mesh to our container
                    mesh.parent = modelContainer;
                    
                    // Scale the mesh
                    mesh.scaling.scaleInPlace(scaleFactor);
                    
                    // Apply emissive effects to the model for better visibility
                    if (mesh.material) {
                        const stdMaterial = mesh.material as StandardMaterial;
                        if (stdMaterial) {
                            // Add some emissive effect to make it stand out
                            stdMaterial.emissiveColor = new Color3(0.2, 0.5, 0.8);
                            
                            // Make engine parts glow
                            if (mesh.name.includes("engine") || mesh.name.includes("thruster")) {
                                stdMaterial.emissiveColor = new Color3(1.0, 0.5, 0.2);
                            }
                        }
                    }
                });
                
                // Store animation groups for later use
                this._animationGroups = result.animationGroups;
                
                // Check and log each animation group
                if (this._animationGroups.length > 0) {
                    console.log(`Found ${this._animationGroups.length} animation groups in buster_drone model`);
                    
                    // Log details about each animation group
                    this._animationGroups.forEach((ag, index) => {
                        console.log(`Animation Group ${index}: ${ag.name}, ${ag.targetedAnimations.length} targeted animations`);
                        
                        // Log detailed information about animation group
                        ag.targetedAnimations.forEach((ta, i) => {
                            console.log(`  - Target ${i}: Property: ${ta.animation.targetProperty}, Frames: ${ta.animation.getKeys().length}`);
                        });
                        
                        // Stop all animations initially to prepare for our controlled playback
                        ag.stop();
                    });
                    
                    // Either force animations to play if they exist or create our own
                    if (this._animationGroups.length > 0) {
                        // Create an animation map dictionary to help find animations by name
                        const animMap: Record<string, AnimationGroup> = {};
                        this._animationGroups.forEach(ag => {
                            animMap[ag.name.toLowerCase()] = ag;
                        });
                        
                        // Start with the idle animation
                        this.playAnimation(CharacterAnimationState.IDLE);
                    } else {
                        // No animations found, create our own
                        this.createAnimationsForBusterDrone(modelContainer);
                    }
                } else {
                    console.log("No animation groups found in buster_drone model");
                    
                    // Create our own animations for the model
                    this.createAnimationsForBusterDrone(modelContainer);
                }
                
                // Rotate the model to face forward
                modelContainer.rotation = new Vector3(0, Math.PI, 0); // Rotate 180 degrees
                
                // Use the container as our mesh for movement
                const originalMesh = this._mesh;
                this._mesh = modelContainer as any; // Not ideal but works for our purposes
                
                // Setup action manager
                this._mesh.actionManager = originalMesh.actionManager;
                
                // Setup manual animation for hover effect (simple up and down motion)
                // This animation will work even if other animations fail
                this.setupSimpleHoverAnimation(modelContainer);
                
                console.log("Buster drone model setup complete");
            } else {
                console.log("No meshes found in the buster_drone model");
            }
        }).catch(error => {
            console.error(`Error loading buster_drone model: ${error.message}`);
        });
    }
    
    // Setup a simple hover animation for the buster_drone
    private setupSimpleHoverAnimation(modelContainer: TransformNode): void {
        console.log("Setting up simple hover animation");
        
        // Create the animation
        const hoverAnimation = new Animation(
            "hoverAnimation", 
            "position.y", 
            30, // Frames per second
            Animation.ANIMATIONTYPE_FLOAT, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Create hover keyframes
        const keys = [];
        const baseY = modelContainer.position.y;
        
        // Slightly hover up and down
        keys.push({ frame: 0, value: baseY });
        keys.push({ frame: 15, value: baseY + 0.1 });
        keys.push({ frame: 30, value: baseY });
        
        // Set keys to animation
        hoverAnimation.setKeys(keys);
        
        // Attach animation to the model
        this._scene.beginDirectAnimation(
            modelContainer,
            [hoverAnimation],
            0,
            30,
            true // Loop
        );
        
        console.log("Simple hover animation started");
    }
    
    // Create animations for the buster_drone model if none exist
    private createAnimationsForBusterDrone(modelContainer: TransformNode): void {
        console.log("Creating custom animations for buster_drone model");
        
        // Create animation groups
        // 1. Idle animation - slight up/down bobbing and rotation
        const idleAnim = new AnimationGroup("Idle");
        
        // Create animations for bobbing up and down
        const bobAnimation = new Animation(
            "bobbing", 
            "position.y", 
            30, 
            Animation.ANIMATIONTYPE_FLOAT, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Set bobbing keyframes
        const bobKeys = [];
        bobKeys.push({ frame: 0, value: modelContainer.position.y });
        bobKeys.push({ frame: 15, value: modelContainer.position.y + 0.2 });
        bobKeys.push({ frame: 30, value: modelContainer.position.y });
        bobAnimation.setKeys(bobKeys);
        
        // Create animation for slight rotation
        const rotationAnimation = new Animation(
            "rotation", 
            "rotation.y", 
            30, 
            Animation.ANIMATIONTYPE_FLOAT, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Set rotation keyframes
        const rotKeys = [];
        rotKeys.push({ frame: 0, value: modelContainer.rotation.y });
        rotKeys.push({ frame: 15, value: modelContainer.rotation.y + 0.05 });
        rotKeys.push({ frame: 30, value: modelContainer.rotation.y });
        rotationAnimation.setKeys(rotKeys);
        
        // Add animations to the idle group
        idleAnim.addTargetedAnimation(bobAnimation, modelContainer);
        idleAnim.addTargetedAnimation(rotationAnimation, modelContainer);
        
        // 2. Walking animation - faster bobbing and tilting
        const walkingAnim = new AnimationGroup("Walk");
        
        // Create animations for walking
        const walkBobAnimation = new Animation(
            "walkBobbing", 
            "position.y", 
            30, 
            Animation.ANIMATIONTYPE_FLOAT, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Set walking bob keyframes
        const walkBobKeys = [];
        walkBobKeys.push({ frame: 0, value: modelContainer.position.y });
        walkBobKeys.push({ frame: 7, value: modelContainer.position.y + 0.15 });
        walkBobKeys.push({ frame: 15, value: modelContainer.position.y });
        walkBobKeys.push({ frame: 22, value: modelContainer.position.y + 0.15 });
        walkBobKeys.push({ frame: 30, value: modelContainer.position.y });
        walkBobAnimation.setKeys(walkBobKeys);
        
        // Create animation for tilting during walking
        const tiltAnimation = new Animation(
            "tilt", 
            "rotation.z", 
            30, 
            Animation.ANIMATIONTYPE_FLOAT, 
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        // Set tilt keyframes
        const tiltKeys = [];
        tiltKeys.push({ frame: 0, value: 0 });
        tiltKeys.push({ frame: 7, value: 0.05 });
        tiltKeys.push({ frame: 15, value: 0 });
        tiltKeys.push({ frame: 22, value: -0.05 });
        tiltKeys.push({ frame: 30, value: 0 });
        tiltAnimation.setKeys(tiltKeys);
        
        // Add animations to the walking group
        walkingAnim.addTargetedAnimation(walkBobAnimation, modelContainer);
        walkingAnim.addTargetedAnimation(tiltAnimation, modelContainer);
        
        // Store the animation groups
        this._animationGroups = [idleAnim, walkingAnim];
        console.log("Created animation groups:");
        this._animationGroups.forEach((ag, index) => {
            console.log(`Animation ${index}: name="${ag.name}", targetedAnimations=${ag.targetedAnimations.length}`);
        });
        
        // Start the idle animation
        this.playAnimation(CharacterAnimationState.IDLE);
    }
    
    // Play a specific animation based on state
    public playAnimation(state: CharacterAnimationState): void {
        // Добавим дополнительный лог для диагностики
        console.log(`playAnimation called with state: ${state}, string value: "${state}"`);
        
        // If we're already in this state, don't change
        if (state === this._animationState && this._currentAnimation?.isPlaying) {
            console.log(`Already playing animation ${this._animationState}, skipping`);
            return;
        }
        
        console.log(`Switching animation from ${this._animationState} to ${state}`);
        console.log(`Available animations: ${this._animationGroups.map(ag => ag.name).join(', ')}`);
        
        // Stop current animation if any
        if (this._currentAnimation) {
            console.log(`Stopping current animation: ${this._currentAnimation.name}`);
            this._currentAnimation.stop();
        }
        
        // Set new animation state
        this._animationState = state;
        
        // Find the corresponding animation name based on the state
        let targetAnimationName = "";
        
        switch(state) {
            case CharacterAnimationState.IDLE:
                targetAnimationName = "Idle";
                break;
            case CharacterAnimationState.WALKING:
                targetAnimationName = "Walk";
                break;
            case CharacterAnimationState.RUNNING:
                targetAnimationName = "run";
                break;
            case CharacterAnimationState.ATTACKING:
                targetAnimationName = "attack";
                break;
            case CharacterAnimationState.DYING:
                targetAnimationName = "die";
                break;
        }
        
        console.log(`Looking for animation with name containing: "${targetAnimationName}"`);
        console.log(`Animation enum state value: ${state}, target name: ${targetAnimationName}`);
        
        // If we don't have any animation groups, we can't play animations
        if (this._animationGroups.length === 0) {
            console.warn("No animation groups available to play");
            return;
        }
        
        // Debug all animation groups
        this._animationGroups.forEach((anim, index) => {
            console.log(`Animation group ${index}: name=${anim.name}, isPlaying=${anim.isPlaying}, isStarted=${anim.isStarted}, targetedAnimations=${anim.targetedAnimations.length}`);
        });
        
        // Try direct name match first
        let foundAnimation = this._animationGroups.find(ag => 
            ag.name.toLowerCase() === targetAnimationName.toLowerCase()
        );
        
        if (foundAnimation) {
            console.log(`Found exact match: ${foundAnimation.name}`);
        } else {
            // Try to find animation by comparing name substrings
            foundAnimation = this._animationGroups.find(ag => 
                ag.name.toLowerCase().includes(targetAnimationName.toLowerCase())
            );
            
            if (foundAnimation) {
                console.log(`Found substring match: ${foundAnimation.name}`);
            }
        }
        
        // If still not found, check for common alternate names
        if (!foundAnimation) {
            const alternateNames = {
                [CharacterAnimationState.IDLE]: ["idle", "default", "stand"],
                [CharacterAnimationState.WALKING]: ["Walk", "move", "anim"],
                [CharacterAnimationState.RUNNING]: ["run", "sprint", "fast"],
                [CharacterAnimationState.ATTACKING]: ["attack", "hit", "swing"],
                [CharacterAnimationState.DYING]: ["die", "death", "dead"]
            };
            
            const alternates = alternateNames[state] || [];
            console.log(`Trying alternate names: ${alternates.join(', ')}`);
            
            for (const alt of alternates) {
                const found = this._animationGroups.find(ag => 
                    ag.name.toLowerCase().includes(alt)
                );
                if (found) {
                    console.log(`Found match with alternate name ${alt}: ${found.name}`);
                    foundAnimation = found;
                    break;
                }
            }
        }
        
        // If still no animation found, use a default/fallback
        if (!foundAnimation) {
            // If no specific animation found, use the first animation group as fallback
            // This is better than no animation at all
            console.log(`No specific animation found for ${state}, using fallback animation`);
            foundAnimation = this._animationGroups[0]; 
        }
        
        // Play the selected animation
        if (foundAnimation) {
            console.log(`Playing animation: ${foundAnimation.name} (target: ${state})`);
            
            // Store reference to current animation
            this._currentAnimation = foundAnimation;
            
            // Start the animation with looping enabled
            try {
                foundAnimation.start(true);
                console.log("Animation started successfully");
                
                // Check animation state after starting
                setTimeout(() => {
                    if (foundAnimation && foundAnimation.isPlaying) {
                        console.log(`Animation ${foundAnimation.name} is playing successfully`);
                    } else {
                        console.warn(`Animation ${foundAnimation?.name} is not playing`);
                    }
                }, 100);
            } catch (error: any) {
                console.error(`Error starting animation: ${error.message}`);
            }
        } else {
            console.warn("No animation available to play");
        }
    }
    
    // Initialize component
    public init(): void {
        // Additional initialization can be done here
    }
    
    // Update component
    public update(deltaTime: number): void {
        if (this._isDead) return;
        
        // Handle movement
        if (this._isMoving && this._targetPosition) {
            // Проверяем, что анимация ходьбы воспроизводится, если персонаж движется
            if (this._animationState !== CharacterAnimationState.WALKING) {
                console.log("Character is moving but walking animation is not playing. Forcing walking animation.");
                this.playAnimation(CharacterAnimationState.WALKING);
            }
            
            this.moveTowards(this._targetPosition, deltaTime);
            
            // Additional visual feedback for movement
            // Apply a slight tilt based on movement direction
            // This provides a visual cue that the character is moving, even if animations fail
            if (this._race === CharacterRace.BELLATO) {
                const direction = this._targetPosition.subtract(this._mesh.position);
                direction.normalize();
                
                // Tilt slightly in the direction of movement
                const tiltX = -direction.z * 0.1;
                const tiltZ = direction.x * 0.1;
                
                // Apply tilt with smooth interpolation
                this._mesh.rotation.x = this._mesh.rotation.x * 0.9 + tiltX * 0.1;
                this._mesh.rotation.z = this._mesh.rotation.z * 0.9 + tiltZ * 0.1;
            }
        } else if (!this._isMoving) {
            // Reset any tilt when not moving
            if (this._race === CharacterRace.BELLATO) {
                // Smoothly reset tilt
                this._mesh.rotation.x = this._mesh.rotation.x * 0.9;
                this._mesh.rotation.z = this._mesh.rotation.z * 0.9;
            }
            
            // Return to idle when not moving
            if (this._animationGroups.length > 0 && this._animationState !== CharacterAnimationState.IDLE) {
                this.playAnimation(CharacterAnimationState.IDLE);
            }
        }
        
        // Passive mana regeneration
        this.regenerateMana(deltaTime);
    }
    
    // Regenerate mana over time
    private regenerateMana(deltaTime: number): void {
        // Regenerate 2% of max mana per second
        const regenAmount = this._stats.maxMana * 0.02 * deltaTime;
        this._stats.mana = Math.min(this._stats.mana + regenAmount, this._stats.maxMana);
    }
    
    // Move character towards a target position
    public moveTowards(targetPosition: Vector3, deltaTime: number): void {
        const direction = targetPosition.subtract(this._mesh.position);
        direction.y = 0; // Keep y position constant for now
        const distance = direction.length();
        
        // If we're close enough to the target, stop moving
        if (distance < 0.1) {
            this._isMoving = false;
            this._targetPosition = undefined;
            
            // Return to idle animation
            if (this._animationGroups.length > 0) {
                this.playAnimation(CharacterAnimationState.IDLE);
            }
            return;
        }
        
        // Normalize direction and apply speed
        direction.normalize();
        const movement = direction.scale(this._stats.speed * deltaTime);
        
        // Update position
        this._mesh.position.addInPlace(movement);
        
        // Rotate the character to face the direction of movement
        // For buster_drone model, we need a different rotation scheme
        if (this._race === CharacterRace.BELLATO) {
            // Drone model rotation based on movement
            this._mesh.rotation.y = Math.atan2(-direction.z, direction.x) - Math.PI/2;
            
            // Add slight tilt in the direction of movement
            const tiltAmount = 0.1;
            this._mesh.rotation.x = -direction.z * tiltAmount;
            this._mesh.rotation.z = direction.x * tiltAmount;
        } else {
            // Default rotation for other models
            this._mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
    }
    
    // Move character to a target position
    public moveTo(targetPosition: Vector3): void {
        this._isMoving = true;
        this._targetPosition = targetPosition;
        
        // Immediately start walking animation when movement begins
        this.playAnimation(CharacterAnimationState.WALKING);
        
        // Log for debugging
        console.log(`Character moving to ${targetPosition.toString()}, playing walking animation`);
    }
    
    // Stop any ongoing movement
    public stopMovement(): void {
        console.log("Stopping movement, clearing target position");
        this._isMoving = false;
        this._targetPosition = undefined;
        // Note: we're not forcing IDLE animation here to allow keyboard movement to control animation
    }
    
    // Attack another character
    public attack(target: CharacterComponent): void {
        if (this._isDead) return;
        
        // Play attack animation
        if (this._animationGroups.length > 0) {
            this.playAnimation(CharacterAnimationState.ATTACKING);
            
            // After animation completes, return to idle
            setTimeout(() => {
                this.playAnimation(CharacterAnimationState.IDLE);
            }, 1000); // Adjust time based on animation length
        }
        
        const damage = Math.max(1, this._stats.attack - target.stats.defense);
        target.takeDamage(damage);
    }
    
    // Take damage from an attack
    public takeDamage(amount: number): void {
        if (this._isDead) return;
        
        this._stats.health -= amount;
        
        if (this._stats.health <= 0) {
            this._stats.health = 0;
            this._isDead = true;
            this.die();
        }
    }
    
    // Handle character death
    private die(): void {
        // Play death animation if available
        if (this._animationGroups.length > 0) {
            this.playAnimation(CharacterAnimationState.DYING);
        } else {
            // Simple visual representation of death
            this._mesh.scaling.y = 0.5;
            this._mesh.position.y = 0.5; // Lower the character to the ground
        }
    }
    
    // Heal the character
    public heal(amount: number): void {
        if (this._isDead) return;
        
        this._stats.health += amount;
        if (this._stats.health > this._stats.maxHealth) {
            this._stats.health = this._stats.maxHealth;
        }
    }
    
    // Restore mana
    public restoreMana(amount: number): void {
        this._stats.mana += amount;
        if (this._stats.mana > this._stats.maxMana) {
            this._stats.mana = this._stats.maxMana;
        }
    }
    
    // Spend mana
    public spendMana(amount: number): boolean {
        if (this._stats.mana >= amount) {
            this._stats.mana -= amount;
            return true;
        }
        return false;
    }
    
    // Gain experience
    public gainExperience(amount: number): void {
        this._stats.experience += amount;
        
        // Simple level up logic
        if (this._stats.experience >= this._stats.level * 100) {
            this.levelUp();
        }
    }
    
    // Level up the character
    private levelUp(): void {
        this._stats.level++;
        this._stats.experience = 0;
        
        // Improve stats
        this._stats.maxHealth += 20;
        this._stats.health = this._stats.maxHealth;
        this._stats.maxMana += 10;
        this._stats.mana = this._stats.maxMana;
        this._stats.attack += 2;
        this._stats.defense += 1;
    }
    
    // Clean up resources
    public destroy(): void {
        this._mesh.dispose();
    }
    
    // Getters and setters
    public get mesh(): Mesh {
        return this._mesh;
    }
    
    public get race(): CharacterRace {
        return this._race;
    }
    
    public get stats(): CharacterStats {
        return this._stats;
    }
    
    public get isDead(): boolean {
        return this._isDead;
    }
} 