import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3, Color4, Nullable, ParticleSystem, Texture, Animation } from "@babylonjs/core";
import { Component } from "../utils/EntityComponentSystem";
import { CharacterComponent } from "./CharacterComponent";

// Ability types
export enum AbilityType {
    ACTIVE = "active",   // Requires activation
    PASSIVE = "passive", // Always active
    TOGGLE = "toggle"    // Can be toggled on/off
}

// Ability target types
export enum AbilityTargetType {
    NONE = "none",           // No target needed (self-buff, etc.)
    SINGLE_TARGET = "single", // Requires a specific target
    AREA = "area",           // Targets an area
    DIRECTION = "direction"  // Targets a direction
}

// Damage types
export enum DamageType {
    PHYSICAL = "physical",
    MAGICAL = "magical",
    TRUE = "true"  // True damage ignores defense
}

// Basic ability data
export interface AbilityData {
    id: string;
    name: string;
    description: string;
    cooldown: number;        // In seconds
    manaCost: number;        // Resource cost
    type: AbilityType;
    targetType: AbilityTargetType;
    range: number;           // Range in units
    damage?: number;         // Base damage (if applicable)
    damageType?: DamageType; // Damage type (if applicable)
    duration?: number;       // Duration in seconds (if applicable)
    icon?: string;           // Icon path
}

// Base class for abilities
export abstract class Ability {
    protected _data: AbilityData;
    protected _remainingCooldown: number = 0;
    protected _isActive: boolean = false;
    protected _ownerComponent: CharacterComponent;
    protected _scene: Scene;
    
    constructor(data: AbilityData, ownerComponent: CharacterComponent, scene: Scene) {
        this._data = data;
        this._ownerComponent = ownerComponent;
        this._scene = scene;
    }
    
    // Update ability state
    public update(deltaTime: number): void {
        // Update cooldown
        if (this._remainingCooldown > 0) {
            this._remainingCooldown -= deltaTime;
            if (this._remainingCooldown < 0) {
                this._remainingCooldown = 0;
            }
        }
        
        // Update active effects if ability is active
        if (this._isActive && this._data.type !== AbilityType.PASSIVE) {
            this.updateActiveEffect(deltaTime);
        }
    }
    
    // Activate the ability
    public activate(target?: any): boolean {
        // Check if ability is on cooldown
        if (this._remainingCooldown > 0) {
            console.log(`Ability ${this._data.name} is on cooldown`);
            return false;
        }
        
        // Check if owner has enough mana/resources
        if (this._ownerComponent.stats.mana < this._data.manaCost) {
            console.log(`Not enough mana for ${this._data.name}`);
            return false;
        }
        
        // Check if the ability can be activated (target validation, etc.)
        if (!this.canActivate(target)) {
            console.log(`Cannot activate ${this._data.name} with the given target`);
            return false;
        }
        
        // Spend resources
        this._ownerComponent.stats.mana -= this._data.manaCost;
        
        // Set cooldown
        this._remainingCooldown = this._data.cooldown;
        
        // Set active if it's a toggle ability
        if (this._data.type === AbilityType.TOGGLE) {
            this._isActive = !this._isActive;
        } else if (this._data.type === AbilityType.ACTIVE) {
            this._isActive = true;
            
            // For active abilities, perform the effect and then deactivate
            this.performEffect(target);
            this._isActive = false;
        }
        
        return true;
    }
    
    // Deactivate the ability (for toggles)
    public deactivate(): void {
        if (this._data.type === AbilityType.TOGGLE && this._isActive) {
            this._isActive = false;
        }
    }
    
    // Abstract methods to be implemented by specific abilities
    protected abstract canActivate(target?: any): boolean;
    protected abstract performEffect(target?: any): void;
    protected abstract updateActiveEffect(deltaTime: number): void;
    
    // Getters
    public get data(): AbilityData {
        return this._data;
    }
    
    public get isOnCooldown(): boolean {
        return this._remainingCooldown > 0;
    }
    
    public get cooldownRemaining(): number {
        return this._remainingCooldown;
    }
    
    public get isActive(): boolean {
        return this._isActive;
    }
}

// Ability component that manages a character's abilities
export class AbilityComponent implements Component {
    private _abilities: Map<string, Ability>;
    private _owner: CharacterComponent;
    private _scene: Scene;
    
    constructor(owner: CharacterComponent, scene: Scene) {
        this._abilities = new Map<string, Ability>();
        this._owner = owner;
        this._scene = scene;
    }
    
    // Add an ability to the component
    public addAbility(ability: Ability): void {
        this._abilities.set(ability.data.id, ability);
    }
    
    // Get an ability by ID
    public getAbility(id: string): Ability | undefined {
        return this._abilities.get(id);
    }
    
    // Remove an ability
    public removeAbility(id: string): boolean {
        return this._abilities.delete(id);
    }
    
    // Activate an ability
    public activateAbility(id: string, target?: any): boolean {
        const ability = this._abilities.get(id);
        if (!ability) {
            console.log(`Ability ${id} not found`);
            return false;
        }
        
        return ability.activate(target);
    }
    
    // Initialize component
    public init(): void {
        // Additional initialization
    }
    
    // Update component
    public update(deltaTime: number): void {
        // Update all abilities
        this._abilities.forEach(ability => {
            ability.update(deltaTime);
        });
    }
    
    // Clean up resources
    public destroy(): void {
        // Clean up ability resources
    }
}

// Example direct damage ability implementation
export class DirectDamageAbility extends Ability {
    private _particleSystem: Nullable<ParticleSystem> = null;
    
    protected canActivate(target?: CharacterComponent): boolean {
        if (!target) return false;
        
        // Check if target is valid (not dead, within range, etc.)
        if (target.isDead) return false;
        
        // Calculate distance to target
        const ownerMesh = this._ownerComponent.mesh;
        const targetMesh = target.mesh;
        const distance = Vector3.Distance(ownerMesh.position, targetMesh.position);
        
        // Check if target is within range
        return distance <= this._data.range;
    }
    
    protected performEffect(target?: CharacterComponent): void {
        if (!target) return;
        
        // Deal damage to the target
        const damage = this._data.damage || 0;
        target.takeDamage(damage);
        
        // Create visual effect
        this.createVisualEffect(target.mesh.position);
    }
    
    protected updateActiveEffect(deltaTime: number): void {
        // Direct damage abilities don't have ongoing effects
    }
    
    private createVisualEffect(position: Vector3): void {
        // Create a simple particle system for the impact
        if (this._particleSystem) {
            this._particleSystem.dispose();
        }
        
        // Create a temporary emitter mesh
        const emitter = MeshBuilder.CreateSphere("abilityEmitter", { diameter: 0.1 }, this._scene);
        emitter.position = position;
        emitter.isVisible = false;
        
        // Create particle system
        this._particleSystem = new ParticleSystem("abilityParticles", 100, this._scene);
        this._particleSystem.emitter = emitter;
        this._particleSystem.minEmitBox = new Vector3(-0.5, 0, -0.5);
        this._particleSystem.maxEmitBox = new Vector3(0.5, 1, 0.5);
        
        // Particle appearance
        this._particleSystem.color1 = new Color4(1, 0.5, 0, 1);
        this._particleSystem.color2 = new Color4(1, 0, 0, 1);
        this._particleSystem.colorDead = new Color4(0, 0, 0, 0);
        
        // Particle behavior
        this._particleSystem.minSize = 0.2;
        this._particleSystem.maxSize = 0.5;
        this._particleSystem.minLifeTime = 0.3;
        this._particleSystem.maxLifeTime = 0.5;
        this._particleSystem.emitRate = 100;
        this._particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        this._particleSystem.gravity = new Vector3(0, 8, 0);
        this._particleSystem.direction1 = new Vector3(-1, 8, -1);
        this._particleSystem.direction2 = new Vector3(1, 8, 1);
        this._particleSystem.minAngularSpeed = 0;
        this._particleSystem.maxAngularSpeed = Math.PI;
        
        // Start the effect
        this._particleSystem.start();
        
        // Clean up after the effect
        setTimeout(() => {
            if (this._particleSystem) {
                this._particleSystem.stop();
                setTimeout(() => {
                    if (this._particleSystem) {
                        this._particleSystem.dispose();
                        this._particleSystem = null;
                    }
                    emitter.dispose();
                }, 500);
            }
        }, 500);
    }
} 