import { Scene, Mesh, MeshBuilder, Vector3, StandardMaterial, Color3 } from "@babylonjs/core";
import { Component } from "../utils/EntityComponentSystem";
import { CharacterComponent } from "./CharacterComponent";

// Tower stats
export interface TowerStats {
    health: number;
    maxHealth: number;
    attack: number;
    defense: number;
    attackRange: number;
    attackSpeed: number; // attacks per second
    lastAttackTime: number;
}

// Tower component
export class TowerComponent implements Component {
    private _scene: Scene;
    private _mesh: Mesh;
    private _baseMesh: Mesh;
    private _stats: TowerStats;
    private _position: Vector3;
    private _isDead: boolean = false;
    private _teamId: number; // 0 for blue, 1 for red
    private _targets: CharacterComponent[] = [];
    private _currentTarget?: CharacterComponent;
    private _lane: number; // 0 for top, 1 for middle, 2 for bottom
    
    constructor(
        scene: Scene, 
        position: Vector3 = Vector3.Zero(), 
        teamId: number = 0,
        lane: number = 0
    ) {
        this._scene = scene;
        this._position = position;
        this._teamId = teamId;
        this._lane = lane;
        
        // Create tower meshes
        const [baseMesh, towerMesh] = this.createTowerMesh();
        this._baseMesh = baseMesh;
        this._mesh = towerMesh;
        
        // Initialize tower stats
        this._stats = this.initializeStats();
    }
    
    // Initialize tower stats
    private initializeStats(): TowerStats {
        return {
            health: 1000,
            maxHealth: 1000,
            attack: 50,
            defense: 20,
            attackRange: 10,
            attackSpeed: 1, // 1 attack per second
            lastAttackTime: 0
        };
    }
    
    // Create tower mesh
    private createTowerMesh(): [Mesh, Mesh] {
        // Tower base
        const baseMesh = MeshBuilder.CreateCylinder(
            `tower_base_${this._teamId}_${this._lane}`, 
            { height: 1, diameter: 3 }, 
            this._scene
        );
        baseMesh.position = new Vector3(this._position.x, 0.5, this._position.z);
        
        // Tower body
        const towerMesh = MeshBuilder.CreateCylinder(
            `tower_body_${this._teamId}_${this._lane}`, 
            { height: 6, diameterTop: 1.5, diameterBottom: 2 }, 
            this._scene
        );
        towerMesh.position = new Vector3(this._position.x, 4, this._position.z);
        
        // Material
        const towerMaterial = new StandardMaterial(`tower_material_${this._teamId}`, this._scene);
        
        // Team color
        if (this._teamId === 0) {
            towerMaterial.diffuseColor = new Color3(0, 0, 1); // Blue
        } else {
            towerMaterial.diffuseColor = new Color3(1, 0, 0); // Red
        }
        
        baseMesh.material = towerMaterial;
        towerMesh.material = towerMaterial;
        
        return [baseMesh, towerMesh];
    }
    
    // Initialize component
    public init(): void {
        // Additional initialization
    }
    
    // Update component
    public update(deltaTime: number): void {
        if (this._isDead) return;
        
        // Find and attack targets
        this.findTargets();
        this.attackTarget(deltaTime);
    }
    
    // Find valid targets within range
    private findTargets(): void {
        // Reset targets
        this._targets = [];
        this._currentTarget = undefined;
        
        // Find characters of the opposing team within range
        // In a real implementation, this would use the EntityManager to find entities with CharacterComponent
        
        // For now, this is just a placeholder until we have proper entity management
        // We'll implement this using the EntityManager once it's properly integrated
    }
    
    // Attack current target
    private attackTarget(deltaTime: number): void {
        if (!this._currentTarget || this._currentTarget.isDead) return;
        
        const currentTime = performance.now() / 1000; // Convert to seconds
        const timeSinceLastAttack = currentTime - this._stats.lastAttackTime;
        
        // Check if it's time for a new attack
        if (timeSinceLastAttack >= 1 / this._stats.attackSpeed) {
            // Attack the target
            const damage = this._stats.attack;
            this._currentTarget.takeDamage(damage);
            
            // Update last attack time
            this._stats.lastAttackTime = currentTime;
        }
    }
    
    // Tower takes damage
    public takeDamage(amount: number): void {
        if (this._isDead) return;
        
        this._stats.health -= amount;
        
        if (this._stats.health <= 0) {
            this._stats.health = 0;
            this._isDead = true;
            this.destroy();
        }
    }
    
    // Register a target within range
    public registerTarget(target: CharacterComponent): void {
        if (this._isDead) return;
        
        // Check if target is already in the list
        if (!this._targets.includes(target)) {
            this._targets.push(target);
            
            // If we don't have a current target, set this as the current target
            if (!this._currentTarget || this._currentTarget.isDead) {
                this._currentTarget = target;
            }
        }
    }
    
    // Unregister a target (out of range or dead)
    public unregisterTarget(target: CharacterComponent): void {
        const index = this._targets.indexOf(target);
        if (index !== -1) {
            this._targets.splice(index, 1);
            
            // If this was the current target, find a new target
            if (this._currentTarget === target) {
                this._currentTarget = this._targets.length > 0 ? this._targets[0] : undefined;
            }
        }
    }
    
    // Clean up resources
    public destroy(): void {
        // Change appearance to show destruction
        this._mesh.scaling.y = 0.2;
        this._mesh.position.y = 1;
        
        // In a full implementation, we would also play destruction effects,
        // notify the game manager, etc.
    }
    
    // Getters
    public get position(): Vector3 {
        return this._position;
    }
    
    public get stats(): TowerStats {
        return this._stats;
    }
    
    public get teamId(): number {
        return this._teamId;
    }
    
    public get isDead(): boolean {
        return this._isDead;
    }
    
    public get attackRange(): number {
        return this._stats.attackRange;
    }
    
    public get lane(): number {
        return this._lane;
    }
} 