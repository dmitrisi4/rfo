// Entity Component System for the game

// Component interface
export interface Component {
    init?(): void;
    update?(deltaTime: number): void;
    destroy?(): void;
}

// Entity class
export class Entity {
    private _id: string;
    private _components: Map<string, Component>;
    private _tags: Set<string>;

    constructor(id: string) {
        this._id = id;
        this._components = new Map<string, Component>();
        this._tags = new Set<string>();
    }

    public get id(): string {
        return this._id;
    }

    // Add a component to the entity
    public addComponent<T extends Component>(type: string, component: T): T {
        this._components.set(type, component);
        if (component.init) {
            component.init();
        }
        return component;
    }

    // Get a component from the entity
    public getComponent<T extends Component>(type: string): T | undefined {
        return this._components.get(type) as T;
    }

    // Remove a component from the entity
    public removeComponent(type: string): boolean {
        const component = this._components.get(type);
        if (component) {
            if (component.destroy) {
                component.destroy();
            }
            return this._components.delete(type);
        }
        return false;
    }

    // Check if entity has a component
    public hasComponent(type: string): boolean {
        return this._components.has(type);
    }

    // Add a tag to the entity
    public addTag(tag: string): void {
        this._tags.add(tag);
    }

    // Remove a tag from the entity
    public removeTag(tag: string): void {
        this._tags.delete(tag);
    }

    // Check if entity has a tag
    public hasTag(tag: string): boolean {
        return this._tags.has(tag);
    }

    // Update all components
    public update(deltaTime: number): void {
        this._components.forEach(component => {
            if (component.update) {
                component.update(deltaTime);
            }
        });
    }

    // Destroy the entity and all its components
    public destroy(): void {
        this._components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this._components.clear();
        this._tags.clear();
    }
}

// EntityManager class
export class EntityManager {
    private static _instance: EntityManager;
    private _entities: Map<string, Entity>;
    private _entitiesByTag: Map<string, Set<Entity>>;

    private constructor() {
        this._entities = new Map<string, Entity>();
        this._entitiesByTag = new Map<string, Set<Entity>>();
    }

    public static getInstance(): EntityManager {
        if (!EntityManager._instance) {
            EntityManager._instance = new EntityManager();
        }
        return EntityManager._instance;
    }

    // Create a new entity
    public createEntity(id?: string): Entity {
        const entityId = id || crypto.randomUUID();
        const entity = new Entity(entityId);
        this._entities.set(entityId, entity);
        return entity;
    }

    // Get an entity by ID
    public getEntity(id: string): Entity | undefined {
        return this._entities.get(id);
    }

    // Remove an entity
    public removeEntity(id: string): boolean {
        const entity = this._entities.get(id);
        if (entity) {
            entity.destroy();
            return this._entities.delete(id);
        }
        return false;
    }

    // Get entities by tag
    public getEntitiesByTag(tag: string): Entity[] {
        const entities = this._entitiesByTag.get(tag);
        if (entities) {
            return Array.from(entities);
        }
        return [];
    }

    // Add tag to entity and update entitiesByTag map
    public addTagToEntity(entity: Entity, tag: string): void {
        entity.addTag(tag);
        
        let entities = this._entitiesByTag.get(tag);
        if (!entities) {
            entities = new Set<Entity>();
            this._entitiesByTag.set(tag, entities);
        }
        entities.add(entity);
    }

    // Remove tag from entity and update entitiesByTag map
    public removeTagFromEntity(entity: Entity, tag: string): void {
        entity.removeTag(tag);
        
        const entities = this._entitiesByTag.get(tag);
        if (entities) {
            entities.delete(entity);
            if (entities.size === 0) {
                this._entitiesByTag.delete(tag);
            }
        }
    }

    // Update all entities
    public update(deltaTime: number): void {
        this._entities.forEach(entity => {
            entity.update(deltaTime);
        });
    }

    // Clear all entities
    public clear(): void {
        this._entities.forEach(entity => {
            entity.destroy();
        });
        this._entities.clear();
        this._entitiesByTag.clear();
    }
} 