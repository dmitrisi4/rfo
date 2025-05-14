import { Scene, Vector3, ParticleSystem, Color3, Color4, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import { Entity, EntityManager } from "../../utils/EntityComponentSystem";
import { CharacterComponent, CharacterRace } from "../CharacterComponent";
import { 
    AbilityComponent, 
    AbilityType, 
    AbilityTargetType, 
    DamageType, 
    AbilityData, 
    Ability,
    DirectDamageAbility
} from "../AbilityComponent";

// Define Bellato Engineer abilities
class LaserBeamAbility extends DirectDamageAbility {
    // Laser beam is a direct damage ability with a unique visual effect
    // We're inheriting from DirectDamageAbility but customizing the visual effect
    
    private createLaserEffect(targetPosition: Vector3): void {
        // Get the owner position
        const ownerPosition = this._ownerComponent.mesh.position.clone();
        ownerPosition.y += 1; // Adjust to fire from head level
        
        // Create a temporary beam mesh
        const direction = targetPosition.subtract(ownerPosition);
        const distance = direction.length();
        direction.normalize();
        
        // Create a cylinder to represent the laser beam
        const beam = MeshBuilder.CreateCylinder(
            "laserBeam", 
            { 
                height: distance, 
                diameter: 0.2,
                tessellation: 8
            }, 
            this._scene
        );
        
        // Position and rotate the beam to point at the target
        beam.position = ownerPosition.add(direction.scale(distance / 2));
        
        // Calculate rotation to point at target
        const rotationAxis = Vector3.Cross(Vector3.Up(), direction);
        const angle = Math.acos(Vector3.Dot(Vector3.Up(), direction));
        beam.rotate(rotationAxis, angle);
        
        // Add particles at impact point
        const particleSystem = new ParticleSystem("laserImpact", 50, this._scene);
        particleSystem.emitter = new Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
        particleSystem.minEmitBox = new Vector3(-0.1, -0.1, -0.1);
        particleSystem.maxEmitBox = new Vector3(0.1, 0.1, 0.1);
        
        // Particles colors
        particleSystem.color1 = new Color4(0.7, 0.8, 1.0, 1.0);
        particleSystem.color2 = new Color4(0.2, 0.5, 1.0, 1.0);
        particleSystem.colorDead = new Color4(0, 0, 0.2, 0);
        
        // Particles size and lifetime
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 0.5;
        
        // Emission
        particleSystem.emitRate = 100;
        particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;
        particleSystem.gravity = new Vector3(0, 0, 0);
        particleSystem.direction1 = new Vector3(-1, 1, -1);
        particleSystem.direction2 = new Vector3(1, 1, 1);
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;
        
        // Start effect
        particleSystem.start();
        
        // Clean up after a short time
        setTimeout(() => {
            beam.dispose();
            particleSystem.stop();
            setTimeout(() => {
                particleSystem.dispose();
            }, 500);
        }, 200);
    }
    
    protected performEffect(target?: CharacterComponent): void {
        if (!target) return;
        
        // Deal damage to the target
        const damage = this._data.damage || 0;
        target.takeDamage(damage);
        
        // Create laser beam visual effect
        this.createLaserEffect(target.mesh.position);
    }
}

// Deploy Turret ability - creates a turret that attacks enemies
class DeployTurretAbility extends Ability {
    private _turretMesh: any = null;
    
    protected canActivate(targetPosition?: Vector3): boolean {
        // Can only activate if we have a valid position
        return !!targetPosition;
    }
    
    protected performEffect(targetPosition?: Vector3): void {
        if (!targetPosition) return;
        
        // Create a turret at the target position
        this.createTurret(targetPosition);
    }
    
    protected updateActiveEffect(deltaTime: number): void {
        // This is an instant cast ability, no ongoing effect to update
    }
    
    private createTurret(position: Vector3): void {
        // Create a simple turret mesh
        const base = MeshBuilder.CreateCylinder(
            "turretBase", 
            { height: 0.5, diameter: 1.2 }, 
            this._scene
        );
        base.position = new Vector3(position.x, 0.25, position.z);
        
        const turret = MeshBuilder.CreateBox(
            "turretBody", 
            { width: 0.8, height: 0.8, depth: 0.8 }, 
            this._scene
        );
        turret.position = new Vector3(position.x, 0.8, position.z);
        
        const barrel = MeshBuilder.CreateCylinder(
            "turretBarrel", 
            { height: 1.2, diameter: 0.2 }, 
            this._scene
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position = new Vector3(position.x, 0.8, position.z + 0.6);
        
        // In a real implementation, we would:
        // 1. Create a turret entity with its own AI component
        // 2. Add it to the EntityManager
        // 3. Make it target nearby enemies
        
        // For now, we'll just clean it up after a set duration
        setTimeout(() => {
            base.dispose();
            turret.dispose();
            barrel.dispose();
        }, this._data.duration ? this._data.duration * 1000 : 10000);
    }
}

// Shield Generator ability - gives temporary defense boost
class ShieldGeneratorAbility extends Ability {
    private _originalDefense: number = 0;
    private _buffActive: boolean = false;
    private _buffDuration: number = 0;
    
    protected canActivate(): boolean {
        // Can always activate this ability as it affects self
        return true;
    }
    
    protected performEffect(): void {
        // Store original defense value
        this._originalDefense = this._ownerComponent.stats.defense;
        
        // Apply defense buff (50% increase)
        this._ownerComponent.stats.defense = Math.floor(this._originalDefense * 1.5);
        
        // Set buff as active and start duration timer
        this._buffActive = true;
        this._buffDuration = this._data.duration || 5; // Default 5 seconds
        
        // Create a shield effect around the character
        this.createShieldEffect();
    }
    
    protected updateActiveEffect(deltaTime: number): void {
        if (!this._buffActive) return;
        
        // Update buff duration
        this._buffDuration -= deltaTime;
        
        // If duration expired, remove buff
        if (this._buffDuration <= 0) {
            this._buffActive = false;
            this._ownerComponent.stats.defense = this._originalDefense;
        }
    }
    
    private createShieldEffect(): void {
        // Create a sphere around the character to represent the shield
        const shieldMesh = MeshBuilder.CreateSphere(
            "shield", 
            { diameter: 3, segments: 16 }, 
            this._scene
        );
        shieldMesh.position = this._ownerComponent.mesh.position.clone();
        
        // Make the shield semi-transparent
        const material = new StandardMaterial("shieldMaterial", this._scene);
        material.diffuseColor = new Color3(0.3, 0.6, 1.0);
        material.alpha = 0.3;
        shieldMesh.material = material;
        
        // Clean up shield when buff expires
        setTimeout(() => {
            shieldMesh.dispose();
        }, this._buffDuration * 1000);
    }
}

// Export a function to create a Bellato Engineer hero
export function createBellatoEngineerHero(scene: Scene, position: Vector3, teamId: number): Entity {
    const entityManager = EntityManager.getInstance();
    
    // Create the entity
    const heroEntity = entityManager.createEntity("bellato_engineer");
    
    // Add character component
    const characterComponent = new CharacterComponent(scene, CharacterRace.BELLATO, position);
    heroEntity.addComponent("character", characterComponent);
    
    // Add ability component
    const abilityComponent = new AbilityComponent(characterComponent, scene);
    heroEntity.addComponent("ability", abilityComponent);
    
    // Define abilities
    const laserBeamData: AbilityData = {
        id: "laser_beam",
        name: "Laser Beam",
        description: "Fires a concentrated laser beam that deals damage to a single target.",
        cooldown: 3,
        manaCost: 15,
        type: AbilityType.ACTIVE,
        targetType: AbilityTargetType.SINGLE_TARGET,
        range: 10,
        damage: 25,
        damageType: DamageType.MAGICAL
    };
    
    const deployTurretData: AbilityData = {
        id: "deploy_turret",
        name: "Deploy Turret",
        description: "Deploys a defensive turret that attacks nearby enemies.",
        cooldown: 15,
        manaCost: 40,
        type: AbilityType.ACTIVE,
        targetType: AbilityTargetType.AREA,
        range: 8,
        duration: 10 // Turret lasts for 10 seconds
    };
    
    const shieldGeneratorData: AbilityData = {
        id: "shield_generator",
        name: "Shield Generator",
        description: "Activates a shield that increases defense for a short time.",
        cooldown: 20,
        manaCost: 30,
        type: AbilityType.ACTIVE,
        targetType: AbilityTargetType.NONE,
        range: 0,
        duration: 5 // Shield lasts for 5 seconds
    };
    
    // Create and add abilities
    const laserBeam = new LaserBeamAbility(laserBeamData, characterComponent, scene);
    const deployTurret = new DeployTurretAbility(deployTurretData, characterComponent, scene);
    const shieldGenerator = new ShieldGeneratorAbility(shieldGeneratorData, characterComponent, scene);
    
    abilityComponent.addAbility(laserBeam);
    abilityComponent.addAbility(deployTurret);
    abilityComponent.addAbility(shieldGenerator);
    
    // Add team tag
    const teamTag = teamId === 0 ? "team_blue" : "team_red";
    entityManager.addTagToEntity(heroEntity, teamTag);
    
    // Add hero tag
    entityManager.addTagToEntity(heroEntity, "hero");
    
    return heroEntity;
} 