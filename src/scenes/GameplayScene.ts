import { Engine } from "@babylonjs/core/Engines/engine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { ActionManager } from "@babylonjs/core/Actions/actionManager";
import { ExecuteCodeAction } from "@babylonjs/core/Actions/directActions";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import "@babylonjs/loaders/glTF";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Action } from "@babylonjs/core/Actions/action";

import { GameScene } from "./SceneManager";
import { EntityManager, Entity } from "../utils/EntityComponentSystem";
import { CharacterComponent, CharacterRace, CharacterAnimationState } from "../components/CharacterComponent";
import { TowerComponent } from "../components/TowerComponent";
import { createBellatoEngineerHero } from "../components/heroes/BellatoEngineerHero";
import { AbilityComponent } from "../components/AbilityComponent";

export class GameplayScene extends GameScene {
    private _canvas: HTMLCanvasElement;
    private _entityManager: EntityManager;
    private _lastFrameTime: number = 0;
    private _selectedCharacter?: Entity;
    private _targetCharacter?: Entity;
    
    // Movement input state
    private _moveForward: boolean = false;
    private _moveBackward: boolean = false;
    private _moveLeft: boolean = false;
    private _moveRight: boolean = false;
    
    // Camera state
    private _isCameraFollowing: boolean = true;
    private _freeCameraPosition?: Vector3;
    private _freeCameraTarget?: Vector3;
    
    // Model controller state
    private _mainModelMesh?: AbstractMesh;
    private _modelParts: AbstractMesh[] = [];
    private _defaultScaleX: number = 1.14;
    private _defaultScaleY: number = 1.14;
    private _defaultScaleZ: number = 1.14;
    private _defaultPositionY: number = -3.0; // Поставим модель на уровень земли
    
    // Высота игровых объектов над поверхностью
    private readonly OBJECT_HEIGHT_OFFSET: number = 0.5; 
    
    // Team IDs
    private readonly TEAM_BLUE = 0;
    private readonly TEAM_RED = 1;
    
    // Lane IDs
    private readonly LANE_TOP = 0;
    private readonly LANE_MIDDLE = 1;
    private readonly LANE_BOTTOM = 2;

    constructor(engine: Engine) {
        super(engine);
        const canvas = document.getElementById("renderCanvas");
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Canvas element not found");
        }
        this._canvas = canvas;
        this._entityManager = EntityManager.getInstance();
    }

    public initialize(): void {
        // Reset entity manager
        this._entityManager.clear();
        
        // Create camera
        this.setupCamera();

        // Create light
        this.setupLights();

        // Create ground (representing the game map)
        this.createMap();
        
        // Все остальные элементы создаются после загрузки модели
        // в коллбэке SceneLoader.ImportMesh в методе createMap()
    }
    
    private setupCamera(): void {
        // Create an arc rotate camera to allow for better viewing of the game
        const camera = new ArcRotateCamera(
            "gameCamera", 
            0, // Alpha - set to 0 to align with our movement system
            Math.PI / 4,  // Beta - angle from horizontal
            20,           // Radius - distance from target
            new Vector3(0, 5, 0), // Target at height=5
            this._scene
        );
        
        // Set camera limits
        camera.lowerRadiusLimit = 10;
        camera.upperRadiusLimit = 100;
        camera.lowerBetaLimit = 0.1;
        camera.upperBetaLimit = Math.PI / 2.2;
        
        // Add camera controls
        camera.attachControl(this._canvas, true);
        
        // Set initial position (above and in front in the negative Z direction)
        camera.setPosition(new Vector3(0, 10, -15));
    }
    
    private setupLights(): void {
        // Create ambient light
        const hemisphericLight = new HemisphericLight(
            "ambientLight", 
            new Vector3(0, 1, 0), 
            this._scene
        );
        hemisphericLight.intensity = 0.7;
        
        // Add point lights for better illumination
        const blueBaseLight = new PointLight(
            "blueBaseLight",
            new Vector3(-30, 10, 0),
            this._scene
        );
        blueBaseLight.diffuse = new Color3(0.3, 0.3, 0.8);
        blueBaseLight.intensity = 0.6;
        
        const redBaseLight = new PointLight(
            "redBaseLight",
            new Vector3(30, 10, 0),
            this._scene
        );
        redBaseLight.diffuse = new Color3(0.8, 0.3, 0.3);
        redBaseLight.intensity = 0.6;
    }
    
    private createMap(): void {
        // Create basic ground as fallback
        const tempGround = MeshBuilder.CreateGround("tempGround", { width: 200, height: 200 }, this._scene);
        const tempMaterial = new StandardMaterial("tempGroundMaterial", this._scene);
        tempMaterial.diffuseColor = new Color3(0.3, 0.5, 0.2);
        tempGround.material = tempMaterial;
        tempGround.position.y = -0.1;
        
        // Load the GLB model for ground
        SceneLoader.ImportMesh(
            "", // Names of meshes to import (empty means all)
            "", // Base URL
            "assets/textures/core/hq_bellato.glb", // Model file path
            this._scene, // Scene to import into
            (meshes, particleSystems, skeletons) => {
                if (meshes.length > 0) {
                    console.log("Loaded GLB model for ground");
                    
                    // Скрываем временный ground
                    tempGround.isVisible = false;
                    
                    // Position and scale the imported meshes
                    let mainModelFound = false;
                    
                    // Clear the model parts array
                    this._modelParts = [];
                    
                    meshes.forEach((mesh) => {
                        // Skip invisible meshes
                        if (!mesh.isVisible) return;
                        
                        // Save reference to all visible meshes
                        this._modelParts.push(mesh);
                        
                        // Обрабатываем по-разному в зависимости от размера и типа модели
                        if (mesh.getBoundingInfo().boundingBox.extendSize.y > 1 && !mainModelFound) {
                            // Это основная часть модели
                            mainModelFound = true;
                            this._mainModelMesh = mesh;
                            
                            // Настраиваем масштаб модели
                            mesh.scaling = new Vector3(this._defaultScaleX, this._defaultScaleY, this._defaultScaleZ);
                            
                            // Размещаем модель на уровне земли
                            mesh.position = new Vector3(0, this._defaultPositionY, 0);
                            
                            console.log("Main model part found and positioned: ", mesh.name);
                        } else {
                            // Мелкие детали, делаем их меньше
                            // mesh.scaling = new Vector3(0.5, 0.5, 0.5);
														mesh.scaling = new Vector3(this._defaultScaleX, this._defaultScaleY, this._defaultScaleZ);

                            
                            // Позиционируем их на основной модели
														// (Math.random() - 0.5) * 60,
                            mesh.position = new Vector3(
                                -10, // Случайное положение по X
                                0.2, // Немного выше поверхности
                                0  // Случайное положение по Z
                            );
                        }
                        
                        // Enable picking for all meshes
                        mesh.isPickable = true;
                        
                        // Add click handler
                        mesh.actionManager = new ActionManager(this._scene);
                        mesh.actionManager.registerAction(
                            new ExecuteCodeAction(
                                ActionManager.OnPickTrigger,
                                (evt) => {
                                    this.handleModelClick(mesh);
                                }
                            )
                        );
                    });
                    
                    // Теперь после загрузки модели создаем остальные элементы
                    this.createGameElements();
                    this.createTowers();
                    this.createHeroes();
                    this.setupCharacterSelection();
                    this.setupAbilityKeys();
                    this.setupMovementControls();
                    this.setupCameraToggle();
                    this.setupModelController();
                    
                    // Update the UI controls to match the current model values
                    this.updateModelControlUI();
                } else {
                    console.log("No meshes found in the GLB file");
                }
            },
            null,
            (scene, message, exception) => {
                console.error(`Error loading model: ${message}`, exception);
            }
        );
    }
    
    private createGameElements(): void {
        // Create river (water) in the middle
        this.createRiver();
        
        // Create jungle areas with obstacles
        this.createJungleAreas();
        
        // Create lanes (slightly elevated paths)
        this.createLane(new Vector3(-40, this.OBJECT_HEIGHT_OFFSET, 40), new Vector3(40, this.OBJECT_HEIGHT_OFFSET, 40), "topLane");
        this.createLane(new Vector3(-40, this.OBJECT_HEIGHT_OFFSET, 0), new Vector3(40, this.OBJECT_HEIGHT_OFFSET, 0), "middleLane");
        this.createLane(new Vector3(-40, this.OBJECT_HEIGHT_OFFSET, -40), new Vector3(40, this.OBJECT_HEIGHT_OFFSET, -40), "bottomLane");
        
        // Create bases (blue on left, red on right)
        this.createBase(new Vector3(-45, this.OBJECT_HEIGHT_OFFSET, 0), this.TEAM_BLUE);
        this.createBase(new Vector3(45, this.OBJECT_HEIGHT_OFFSET, 0), this.TEAM_RED);
    }
    
    private createRiver(): void {
        // Create a winding river through the middle
        const riverPath = [
            new Vector3(-20, this.OBJECT_HEIGHT_OFFSET, 30),
            new Vector3(0, this.OBJECT_HEIGHT_OFFSET, 20),
            new Vector3(0, this.OBJECT_HEIGHT_OFFSET, 0),
            new Vector3(0, this.OBJECT_HEIGHT_OFFSET, -20),
            new Vector3(20, this.OBJECT_HEIGHT_OFFSET, -30)
        ];
        
        // Create river segments
        for (let i = 0; i < riverPath.length - 1; i++) {
            // Calculate direction and length
            const start = riverPath[i];
            const end = riverPath[i+1];
            const direction = end.subtract(start);
            const distance = direction.length();
            const normalized = direction.normalize();
            
            // Create a river segment (wide, flat box)
            const riverSegment = MeshBuilder.CreateGround(
                `riverSegment_${i}`,
                { width: 15, height: distance },
                this._scene
            );
            
            // Position river segment
            const midpoint = start.add(direction.scale(0.5));
            riverSegment.position = midpoint;
            
            // Rotate to align with direction
            const angle = Math.atan2(normalized.z, normalized.x) - Math.PI/2;
            riverSegment.rotation.y = angle;
            
            // River material
            const riverMaterial = new StandardMaterial(`riverMaterial_${i}`, this._scene);
            riverMaterial.diffuseColor = new Color3(0.1, 0.3, 0.8);
            riverMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
            riverMaterial.specularPower = 32;
            riverMaterial.alpha = 0.7; // Полупрозрачность
            
            // Add some emissive effect for a glowing water look
            riverMaterial.emissiveColor = new Color3(0.0, 0.1, 0.3);
            
            riverSegment.material = riverMaterial;
        }
        
        // Create two circular ponds
        this.createPond(new Vector3(0, this.OBJECT_HEIGHT_OFFSET, 0), 8); // Center pond
        this.createPond(new Vector3(25, this.OBJECT_HEIGHT_OFFSET, 25), 6); // Upper right pond
    }
    
    private createPond(position: Vector3, radius: number): void {
        const pond = MeshBuilder.CreateGround(
            `pond_${position.x}_${position.z}`,
            { width: radius * 2, height: radius * 2 },
            this._scene
        );
        pond.position = position;
        
        // Pond material
        const pondMaterial = new StandardMaterial(`pondMaterial_${position.x}_${position.z}`, this._scene);
        pondMaterial.diffuseColor = new Color3(0.1, 0.3, 0.8);
        pondMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
        pondMaterial.specularPower = 32;
        pondMaterial.alpha = 0.7; // Полупрозрачность
        
        // Add some emissive effect for a glowing water look
        pondMaterial.emissiveColor = new Color3(0.0, 0.1, 0.3);
        
        pond.material = pondMaterial;
    }
    
    private createJungleAreas(): void {
        // Create jungle obstacles (groups of rocks and vegetation)
        const junglePositions = [
            // Top jungle
            new Vector3(-30, this.OBJECT_HEIGHT_OFFSET, 25),
            new Vector3(-10, this.OBJECT_HEIGHT_OFFSET, 30),
            new Vector3(10, this.OBJECT_HEIGHT_OFFSET, 35),
            new Vector3(30, this.OBJECT_HEIGHT_OFFSET, 30),
            
            // Middle jungle
            new Vector3(-20, this.OBJECT_HEIGHT_OFFSET, 10),
            new Vector3(20, this.OBJECT_HEIGHT_OFFSET, 10),
            new Vector3(-20, this.OBJECT_HEIGHT_OFFSET, -10),
            new Vector3(20, this.OBJECT_HEIGHT_OFFSET, -10),
            
            // Bottom jungle
            new Vector3(-30, this.OBJECT_HEIGHT_OFFSET, -25),
            new Vector3(-10, this.OBJECT_HEIGHT_OFFSET, -30),
            new Vector3(10, this.OBJECT_HEIGHT_OFFSET, -35),
            new Vector3(30, this.OBJECT_HEIGHT_OFFSET, -30),
        ];
        
        // Create jungle elements
        junglePositions.forEach((position, index) => {
            this.createJungleElement(position, index);
        });
    }
    
    private createJungleElement(position: Vector3, index: number): void {
        // Create a group of objects for each jungle element
        
        // Create main obstacle (rock or tree stump)
        const obstacle = MeshBuilder.CreateCylinder(
            `jungleObstacle_${index}`,
            { height: 1.5, diameter: 3 + Math.random() * 2 },
            this._scene
        );
        obstacle.position = new Vector3(position.x, position.y + 0.75, position.z);
        
        // Create material with rocky texture
        const obstacleMaterial = new StandardMaterial(`jungleMaterial_${index}`, this._scene);
        
        // Apply rocky texture to obstacles
        const rockTexture = new Texture("assets/textures/rocky/rocky_terrain_diff_4k.jpg", this._scene);
        obstacleMaterial.diffuseTexture = rockTexture;
        obstacleMaterial.diffuseColor = new Color3(0.4, 0.4, 0.3); // Tint the texture
        
        // Add some specular effect
        obstacleMaterial.specularColor = new Color3(0.2, 0.2, 0.2);
        obstacleMaterial.specularPower = 64;
        
        // Adjust texture scaling
        if (obstacleMaterial.diffuseTexture) {
            const texture = obstacleMaterial.diffuseTexture as Texture;
            texture.uScale = 1;
            texture.vScale = 1;
        }
        
        obstacle.material = obstacleMaterial;
        
        // Add some small rocks around the main obstacle
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 2 + Math.random() * 2;
            const rockPosition = new Vector3(
                position.x + Math.cos(angle) * distance,
                position.y + 0.4,
                position.z + Math.sin(angle) * distance
            );
            
            const rock = MeshBuilder.CreateBox(
                `jungleRock_${index}_${i}`,
                { width: 0.8 + Math.random(), height: 0.8, depth: 0.8 + Math.random() },
                this._scene
            );
            rock.position = rockPosition;
            rock.rotation = new Vector3(Math.random(), Math.random(), Math.random());
            
            const rockMaterial = new StandardMaterial(`rockMaterial_${index}_${i}`, this._scene);
            rockMaterial.diffuseTexture = rockTexture.clone();
            rockMaterial.diffuseColor = new Color3(0.35, 0.35, 0.35);
            
            rock.material = rockMaterial;
        }
    }
    
    private createLane(start: Vector3, end: Vector3, name: string): void {
        const startPoint = new Vector3(start.x, start.y, start.z); // Slightly elevated
        const endPoint = new Vector3(end.x, end.y, end.z);
        
        // Create lane path (simple rectangle for now)
        const lane = MeshBuilder.CreateGround(
            name, 
            { width: Math.abs(endPoint.x - startPoint.x), height: 8 }, 
            this._scene
        );
        
        // Position the lane
        lane.position = new Vector3(
            (startPoint.x + endPoint.x) / 2, 
            (startPoint.y + endPoint.y) / 2, // Same elevation
            (startPoint.z + endPoint.z) / 2
        );
        
        // Lane material
        const laneMaterial = new StandardMaterial(`${name}Material`, this._scene);
        
        // Create stone path texture for lanes
        const laneTexture = new Texture("assets/textures/rocky/rocky_terrain_diff_4k.jpg", this._scene);
        laneMaterial.diffuseTexture = laneTexture;
        
        // Adjust the color to make lanes stand out
        laneMaterial.diffuseColor = new Color3(0.7, 0.7, 0.6);
        laneMaterial.alpha = 0.8; // Делаем полупрозрачным
        
        // Adjust texture tiling
        if (laneMaterial.diffuseTexture) {
            const texture = laneMaterial.diffuseTexture as Texture;
            texture.uScale = 2;
            texture.vScale = 0.2;
        }
        
        lane.material = laneMaterial;
    }
    
    private createBase(position: Vector3, teamId: number): void {
        // Create base platform
        const base = MeshBuilder.CreateCylinder(
            `base_${teamId}`, 
            { height: 1, diameter: 20 }, 
            this._scene
        );
        base.position = new Vector3(position.x, position.y + 0.5, position.z);
        
        // Base material
        const baseMaterial = new StandardMaterial(`baseMaterial_${teamId}`, this._scene);
        
        // Team color
        if (teamId === this.TEAM_BLUE) {
            baseMaterial.diffuseColor = new Color3(0, 0, 0.8); // Blue
        } else {
            baseMaterial.diffuseColor = new Color3(0.8, 0, 0); // Red
        }
        
        baseMaterial.alpha = 0.7; // Полупрозрачный
        base.material = baseMaterial;
    }
    
    private createTowers(): void {
        // Create blue team towers
        this.createTowerEntity(new Vector3(-20, this.OBJECT_HEIGHT_OFFSET, 20), this.TEAM_BLUE, this.LANE_TOP);
        this.createTowerEntity(new Vector3(-20, this.OBJECT_HEIGHT_OFFSET, 0), this.TEAM_BLUE, this.LANE_MIDDLE);
        this.createTowerEntity(new Vector3(-20, this.OBJECT_HEIGHT_OFFSET, -20), this.TEAM_BLUE, this.LANE_BOTTOM);
        
        // Create red team towers
        this.createTowerEntity(new Vector3(20, this.OBJECT_HEIGHT_OFFSET, 20), this.TEAM_RED, this.LANE_TOP);
        this.createTowerEntity(new Vector3(20, this.OBJECT_HEIGHT_OFFSET, 0), this.TEAM_RED, this.LANE_MIDDLE);
        this.createTowerEntity(new Vector3(20, this.OBJECT_HEIGHT_OFFSET, -20), this.TEAM_RED, this.LANE_BOTTOM);
    }
    
    private createTowerEntity(position: Vector3, teamId: number, lane: number): Entity {
        const towerEntity = this._entityManager.createEntity(`tower_${teamId}_${lane}`);
        const towerComponent = new TowerComponent(this._scene, position, teamId, lane);
        towerEntity.addComponent("tower", towerComponent);
        
        // Add team tag
        const teamTag = teamId === this.TEAM_BLUE ? "team_blue" : "team_red";
        this._entityManager.addTagToEntity(towerEntity, teamTag);
        
        // Add lane tag
        let laneTag = "";
        if (lane === this.LANE_TOP) laneTag = "lane_top";
        else if (lane === this.LANE_MIDDLE) laneTag = "lane_middle";
        else laneTag = "lane_bottom";
        
        this._entityManager.addTagToEntity(towerEntity, laneTag);
        
        return towerEntity;
    }
    
    private createHeroes(): void {
        // Create blue team Bellato Engineer hero
        const blueHero = createBellatoEngineerHero(
            this._scene,
            new Vector3(-25, this.OBJECT_HEIGHT_OFFSET, 0),
            this.TEAM_BLUE
        );
        
        // Create red team hero (Accretia)
        const redHero = this.createHeroEntity(
            new Vector3(25, this.OBJECT_HEIGHT_OFFSET, 0),
            CharacterRace.ACCRETIA,
            this.TEAM_RED,
            "red_hero_1"
        );
        
        // Set blue hero as initially selected
        this._selectedCharacter = blueHero;
    }
    
    private createHeroEntity(position: Vector3, race: CharacterRace, teamId: number, id: string): Entity {
        const heroEntity = this._entityManager.createEntity(id);
        const heroComponent = new CharacterComponent(this._scene, race, position);
        heroEntity.addComponent("character", heroComponent);
        
        // Add team tag
        const teamTag = teamId === this.TEAM_BLUE ? "team_blue" : "team_red";
        this._entityManager.addTagToEntity(heroEntity, teamTag);
        
        // Add hero tag
        this._entityManager.addTagToEntity(heroEntity, "hero");
        
        return heroEntity;
    }
    
    // Обработчик клика по модели
    private handleModelClick(mesh: AbstractMesh): void {
        if (!this._selectedCharacter) return;
        
        // Get the character component
        const characterComponent = this._selectedCharacter.getComponent<CharacterComponent>("character");
        if (!characterComponent) return;
        
        // Get pick position
        const pickInfo = this._scene.pick(
            this._scene.pointerX, 
            this._scene.pointerY,
            (m) => m === mesh
        );
        
        if (pickInfo?.hit && pickInfo.pickedPoint) {
            // Клонируем позицию точки на поверхности модели
            const targetPoint = pickInfo.pickedPoint.clone();
            // Сохраняем Y-координату как есть, без смещения, так как 
            // система движения сама будет обновлять высоту
            
            // Move character to the picked point - this will also trigger walking animation
            characterComponent.moveTo(targetPoint);
            
            // Make camera follow the character as it moves
            if (this._isCameraFollowing) {
                this.updateCameraPosition(characterComponent.mesh.position);
            }
            
            // Clear target when moving
            this._targetCharacter = undefined;
            
            console.log("Character moving to position, should play walking animation");
        }
    }
    
    private setupCharacterSelection(): void {
        // Get all entities with character components
        const heroes = this._entityManager.getEntitiesByTag("hero");
        
        // Set up selection for each hero
        heroes.forEach(hero => {
            const characterComponent = hero.getComponent<CharacterComponent>("character");
            if (!characterComponent) return;
            
            // Get the mesh
            const mesh = characterComponent.mesh;
            
            // Set up action manager
            if (!mesh.actionManager) {
                mesh.actionManager = new ActionManager(this._scene);
            }
            
            // Add click action
            mesh.actionManager.registerAction(
                new ExecuteCodeAction(
                    ActionManager.OnPickTrigger,
                    (evt) => {
                        // If it's our team's hero, select it
                        if (hero.hasTag("team_blue")) {
                            this._selectedCharacter = hero;
                            console.log(`Selected hero: ${hero.id}`);
                            
                            // Make camera follow the selected character
                            if (this._isCameraFollowing) {
                                this.updateCameraPosition(characterComponent.mesh.position);
                            }
                        } else {
                            // If it's enemy hero, set as target
                            this._targetCharacter = hero;
                            console.log(`Targeted enemy: ${hero.id}`);
                            
                            // If we have a selected character, attack the target
                            if (this._selectedCharacter && this._targetCharacter) {
                                const selectedCharacter = this._selectedCharacter.getComponent<CharacterComponent>("character");
                                const targetCharacter = this._targetCharacter.getComponent<CharacterComponent>("character");
                                
                                if (selectedCharacter && targetCharacter) {
                                    // Move to target if not in range
                                    const selectedPos = selectedCharacter.mesh.position;
                                    const targetPos = targetCharacter.mesh.position;
                                    const distance = Vector3.Distance(selectedPos, targetPos);
                                    
                                    if (distance > 5) {
                                        // Move to position near the target
                                        const direction = targetPos.subtract(selectedPos).normalize();
                                        const moveToPos = targetPos.subtract(direction.scale(3));
                                        selectedCharacter.moveTo(moveToPos);
                                    } else {
                                        // Attack if in range
                                        selectedCharacter.attack(targetCharacter);
                                    }
                                }
                            }
                        }
                    }
                )
            );
            
            // If the mesh has children (like a loaded model), set up their action managers too
            if (mesh.getChildMeshes) {
                const childMeshes = mesh.getChildMeshes();
                childMeshes.forEach(childMesh => {
                    childMesh.isPickable = true;
                    childMesh.actionManager = new ActionManager(this._scene);
                    childMesh.actionManager.registerAction(
                        new ExecuteCodeAction(
                            ActionManager.OnPickTrigger,
                            (evt) => {
                                // Trigger the same action as the parent mesh
                                if (mesh.actionManager) {
                                    const actions = mesh.actionManager.actions;
                                    if (actions.length > 0) {
                                        const action = actions[0] as Action;
                                        action.execute(evt);
                                    }
                                }
                            }
                        )
                    );
                });
            }
        });
    }
    
    private setupAbilityKeys(): void {
        // Define key bindings for abilities
        const keyBindings = {
            "KeyQ": "laser_beam",
            "KeyW": "deploy_turret",
            "KeyE": "shield_generator"
        };
        
        // Set up key event listener
        window.addEventListener("keydown", (event) => {
            if (!this._selectedCharacter) return;
            
            // Check if the key is one of our ability keys
            const abilityId = keyBindings[event.code as keyof typeof keyBindings];
            if (!abilityId) return;
            
            // Get the ability component
            const abilityComponent = this._selectedCharacter.getComponent<AbilityComponent>("ability");
            if (!abilityComponent) return;
            
            // Activate the ability
            if (this._targetCharacter && (abilityId === "laser_beam")) {
                // Target ability
                const targetCharacter = this._targetCharacter.getComponent<CharacterComponent>("character");
                if (targetCharacter) {
                    abilityComponent.activateAbility(abilityId, targetCharacter);
                }
            } else if (abilityId === "deploy_turret") {
                // Get mouse position on ground
                const ground = this._scene.getMeshByName("ground");
                if (!ground) return;
                
                const pickInfo = this._scene.pick(
                    this._scene.pointerX, 
                    this._scene.pointerY,
                    (mesh) => mesh === ground
                );
                
                if (pickInfo?.hit && pickInfo.pickedPoint) {
                    abilityComponent.activateAbility(abilityId, pickInfo.pickedPoint);
                }
            } else {
                // Self-cast ability
                abilityComponent.activateAbility(abilityId);
            }
        });
    }

    private setupMovementControls(): void {
        // Setup keyboard event listeners
        window.addEventListener("keydown", (event) => {
            switch(event.code) {
                case "KeyW": 
                case "ArrowUp":
                    this._moveForward = true;
                    break;
                case "KeyS":
                case "ArrowDown":
                    this._moveBackward = true;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    this._moveLeft = true;
                    break;
                case "KeyD":
                case "ArrowRight":
                    this._moveRight = true;
                    break;
            }
        });
        
        window.addEventListener("keyup", (event) => {
            switch(event.code) {
                case "KeyW":
                case "ArrowUp":
                    this._moveForward = false;
                    break;
                case "KeyS":
                case "ArrowDown":
                    this._moveBackward = false;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    this._moveLeft = false;
                    break;
                case "KeyD":
                case "ArrowRight":
                    this._moveRight = false;
                    break;
            }
        });
    }

    private setupCameraToggle(): void {
        // Получаем кнопку из DOM
        const button = document.getElementById("cameraToggle");
        if (!button) return;
        
        // Устанавливаем обработчик нажатия
        button.addEventListener("click", () => {
            this.toggleCameraMode();
        });
    }

    private setupModelController(): void {
        // Get the controller elements
        const scaleXInput = document.getElementById("modelScaleX") as HTMLInputElement;
        const scaleYInput = document.getElementById("modelScaleY") as HTMLInputElement;
        const scaleZInput = document.getElementById("modelScaleZ") as HTMLInputElement;
        const positionYInput = document.getElementById("modelPositionY") as HTMLInputElement;
        
        const scaleXValue = document.getElementById("scaleXValue");
        const scaleYValue = document.getElementById("scaleYValue");
        const scaleZValue = document.getElementById("scaleZValue");
        const positionYValue = document.getElementById("positionYValue");
        
        const resetButton = document.getElementById("resetModel");
        const applyToAllButton = document.getElementById("applyToAll");
        const hideButton = document.getElementById("hideControls");
        
        if (!scaleXInput || !scaleYInput || !scaleZInput || !positionYInput) return;
        
        // Set up scale X input
        scaleXInput.addEventListener("input", () => {
            if (!this._mainModelMesh) return;
            
            const value = parseFloat(scaleXInput.value);
            this._mainModelMesh.scaling.x = value;
            
            if (scaleXValue) {
                scaleXValue.textContent = value.toFixed(2);
            }
        });
        
        // Set up scale Y input
        scaleYInput.addEventListener("input", () => {
            if (!this._mainModelMesh) return;
            
            const value = parseFloat(scaleYInput.value);
            this._mainModelMesh.scaling.y = value;
            
            if (scaleYValue) {
                scaleYValue.textContent = value.toFixed(2);
            }
        });
        
        // Set up scale Z input
        scaleZInput.addEventListener("input", () => {
            if (!this._mainModelMesh) return;
            
            const value = parseFloat(scaleZInput.value);
            this._mainModelMesh.scaling.z = value;
            
            if (scaleZValue) {
                scaleZValue.textContent = value.toFixed(2);
            }
        });
        
        // Set up position Y input
        positionYInput.addEventListener("input", () => {
            if (!this._mainModelMesh) return;
            
            const value = parseFloat(positionYInput.value);
            this._mainModelMesh.position.y = value;
            
            if (positionYValue) {
                positionYValue.textContent = value.toFixed(2);
            }
        });
        
        // Set up reset button
        if (resetButton) {
            resetButton.addEventListener("click", () => {
                this.resetModelToDefaults();
            });
        }
        
        // Set up apply to all button
        if (applyToAllButton) {
            applyToAllButton.addEventListener("click", () => {
                this.applyMainModelSettingsToAll();
            });
        }
        
        // Set up hide button
        if (hideButton) {
            hideButton.addEventListener("click", () => {
                const controller = document.getElementById("modelController");
                if (controller) {
                    controller.style.display = "none";
                    
                    // Add a small button to show controls again
                    const showButton = document.createElement("button");
                    showButton.textContent = "Show Model Controls";
                    showButton.style.position = "absolute";
                    showButton.style.bottom = "20px";
                    showButton.style.left = "20px";
                    showButton.style.padding = "5px 10px";
                    showButton.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                    showButton.style.color = "white";
                    showButton.style.border = "1px solid white";
                    showButton.style.borderRadius = "3px";
                    showButton.style.cursor = "pointer";
                    showButton.style.zIndex = "10";
                    
                    showButton.addEventListener("click", () => {
                        if (controller) {
                            controller.style.display = "block";
                            document.body.removeChild(showButton);
                        }
                    });
                    
                    document.body.appendChild(showButton);
                }
            });
        }
    }
    
    private updateModelControlUI(): void {
        if (!this._mainModelMesh) return;
        
        const scaleXInput = document.getElementById("modelScaleX") as HTMLInputElement;
        const scaleYInput = document.getElementById("modelScaleY") as HTMLInputElement;
        const scaleZInput = document.getElementById("modelScaleZ") as HTMLInputElement;
        const positionYInput = document.getElementById("modelPositionY") as HTMLInputElement;
        
        const scaleXValue = document.getElementById("scaleXValue");
        const scaleYValue = document.getElementById("scaleYValue");
        const scaleZValue = document.getElementById("scaleZValue");
        const positionYValue = document.getElementById("positionYValue");
        
        if (scaleXInput && this._mainModelMesh.scaling.x) {
            scaleXInput.value = this._mainModelMesh.scaling.x.toString();
            if (scaleXValue) {
                scaleXValue.textContent = this._mainModelMesh.scaling.x.toFixed(2);
            }
        }
        
        if (scaleYInput && this._mainModelMesh.scaling.y) {
            scaleYInput.value = this._mainModelMesh.scaling.y.toString();
            if (scaleYValue) {
                scaleYValue.textContent = this._mainModelMesh.scaling.y.toFixed(2);
								console.log('test ' + this._mainModelMesh.scaling.y.toFixed(2));
            }
        }
        
        if (scaleZInput && this._mainModelMesh.scaling.z) {
            scaleZInput.value = this._mainModelMesh.scaling.z.toString();
            if (scaleZValue) {
                scaleZValue.textContent = this._mainModelMesh.scaling.z.toFixed(2);
            }
        }
        
        if (positionYInput && this._mainModelMesh.position.y) {
            positionYInput.value = this._mainModelMesh.position.y.toString();
            if (positionYValue) {
                positionYValue.textContent = this._mainModelMesh.position.y.toFixed(2);
            }
        }
    }
    
    private resetModelToDefaults(): void {
        if (!this._mainModelMesh) return;
        
        this._mainModelMesh.scaling = new Vector3(this._defaultScaleX, this._defaultScaleY, this._defaultScaleZ);
        this._mainModelMesh.position.y = this._defaultPositionY;
        
        this.updateModelControlUI();
    }
    
    private applyMainModelSettingsToAll(): void {
        if (!this._mainModelMesh || this._modelParts.length === 0) return;
        
        const scale = this._mainModelMesh.scaling.clone();
        
        this._modelParts.forEach(mesh => {
            if (mesh !== this._mainModelMesh) {
                mesh.scaling = scale.clone();
                
                // Keep the existing X and Z position, but update Y to match
                mesh.position.y = this._mainModelMesh!.position.y;
            }
        });
    }

    public update(): void {
        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this._lastFrameTime) / 1000; // Convert to seconds
        this._lastFrameTime = currentTime;
        
        // Process keyboard movement
        this.processKeyboardMovement(deltaTime);
        
        // Update all entities
        this._entityManager.update(deltaTime);
        
        // Update camera to follow selected character if in follow mode
        if (this._isCameraFollowing && this._selectedCharacter) {
            const characterComponent = this._selectedCharacter.getComponent<CharacterComponent>("character");
            if (characterComponent) {
                this.updateCameraPosition(characterComponent.mesh.position);
            }
        }
    }
    
    private processKeyboardMovement(deltaTime: number): void {
        if (!this._selectedCharacter) return;
        
        // Get the character component
        const characterComponent = this._selectedCharacter.getComponent<CharacterComponent>("character");
        if (!characterComponent) return;
        
        // Skip if character is dead
        if (characterComponent.isDead) return;
        
        // Calculate movement direction
        let moveDirection = Vector3.Zero();
        
        if (this._moveForward) moveDirection.z -= 1; // Forward is negative Z
        if (this._moveBackward) moveDirection.z += 1; // Backward is positive Z
        if (this._moveLeft) moveDirection.x -= 1;
        if (this._moveRight) moveDirection.x += 1;
        
        // If there's any movement input
        if (moveDirection.length() > 0) {
            // Normalize movement vector
            moveDirection.normalize();
            
            // Get character's current position
            const currentPosition = characterComponent.mesh.position;
            
            // Calculate move speed and new position
            const moveSpeed = characterComponent.stats.speed;
            const movement = moveDirection.scale(moveSpeed * deltaTime);
            const newPosition = currentPosition.add(movement);
            
            // Рейкаст для определения высоты поверхности модели
            this.updateCharacterPositionOnTerrain(characterComponent, newPosition);
            
            // Rotate character to face the movement direction
            const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);

            // Apply different rotation depending on character type
            if (characterComponent.race === CharacterRace.BELLATO) {
                // For buster_drone, we need to rotate around y-axis, but with a different orientation
                characterComponent.mesh.rotation.y = targetAngle;
                
                // The drone should tilt slightly in the direction of movement
                const tiltAmount = 0.1;
                characterComponent.mesh.rotation.x = -moveDirection.z * tiltAmount;
                characterComponent.mesh.rotation.z = moveDirection.x * tiltAmount;
            } else {
                // For regular characters
                characterComponent.mesh.rotation.y = targetAngle;
            }
            
            // Вместо прямого вызова анимации ходьбы, используем тот же механизм, что и при щелчке мыши
            // Установим целевую точку движения впереди персонажа
            const targetPosition = currentPosition.add(moveDirection.scale(10));
            characterComponent.moveTo(targetPosition);
            
            // Update camera position to follow the character
            if (this._isCameraFollowing) {
                this.updateCameraPosition(characterComponent.mesh.position);
            }
        } else {
            // Если нет движения, останавливаем персонажа
            characterComponent.stopMovement();
            
            // Не нужно это разкоментировать пускай будет так
            // If no movement, play idle animation
            // if (characterComponent.playAnimation) {
            //     console.log("Returning to IDLE animation");
            //     characterComponent.playAnimation(CharacterAnimationState.IDLE);
            // }
        }
    }

    private updateCharacterPositionOnTerrain(characterComponent: CharacterComponent, newPosition: Vector3): void {
        // Кэшируем текущую позицию, чтобы вернуться к ней в случае проблем
        const currentPosition = characterComponent.mesh.position.clone();
        
        // Создаем луч, направленный вниз от новой XZ позиции
        const rayStart = new Vector3(newPosition.x, 20, newPosition.z); // Начинаем высоко
        const ray = new Ray(rayStart, new Vector3(0, -1, 0), 40); // Увеличиваем длину луча
        
        // Используем predicate, чтобы игнорировать сам персонаж и выбирать только поверхность модели
        const pickInfo = this._scene.pickWithRay(ray, (mesh) => {
            // Пропускаем персонажа и другие динамические объекты
            return mesh.isPickable && 
                   mesh.isVisible && 
                   mesh !== characterComponent.mesh &&
                   !mesh.name.includes("hero") &&
                   !mesh.name.includes("character") &&
                   !mesh.name.includes("busterDrone");
        });
        
        if (pickInfo && pickInfo.hit && pickInfo.pickedPoint) {
            // Определяем высоту поверхности и добавляем смещение
            const terrainHeight = pickInfo.pickedPoint.y;
            
            // Special offset for buster_drone model (it floats a bit higher)
            let heightOffset = this.OBJECT_HEIGHT_OFFSET;
            if (characterComponent.race === CharacterRace.BELLATO) {
                heightOffset = 1.0; // Higher offset for drone model
            }
            
            // Сначала обновляем только x и z координаты
            characterComponent.mesh.position.x = newPosition.x;
            characterComponent.mesh.position.z = newPosition.z;
            
            // Плавно интерполируем высоту для предотвращения резких прыжков
            // Используем меньшую скорость интерполяции для более плавного движения
            characterComponent.mesh.position.y = characterComponent.mesh.position.y * 0.92 + 
                                               (terrainHeight + heightOffset) * 0.08;
        } else {
            // Если луч не попал в модель, просто обновляем X и Z, сохраняя Y
            characterComponent.mesh.position.x = newPosition.x;
            characterComponent.mesh.position.z = newPosition.z;
        }
    }

    private updateCameraPosition(targetPosition: Vector3): void {
        // Если камера не в режиме привязки, не обновляем ее позицию
        if (!this._isCameraFollowing) return;
        
        // Get the camera
        const camera = this._scene.getCameraByName("gameCamera") as ArcRotateCamera;
        if (!camera) return;
        
        // Set the camera target to the character position
        camera.setTarget(targetPosition);
        
        // Optional: smoothly interpolate camera movement for a nicer effect
        camera.position = Vector3.Lerp(
            camera.position,
            new Vector3(
                targetPosition.x, 
                targetPosition.y + 15, // Keep camera 15 units above character
                targetPosition.z - 20  // Position camera in front (negative Z direction)
            ),
            0.05 // Smoothing factor
        );
    }

    private toggleCameraMode(): void {
        // Переключаем режим
        this._isCameraFollowing = !this._isCameraFollowing;
        
        // Получаем камеру
        const camera = this._scene.getCameraByName("gameCamera") as ArcRotateCamera;
        if (!camera) return;
        
        const button = document.getElementById("cameraToggle");
        
        if (this._isCameraFollowing) {
            // Режим привязки к персонажу
            if (button) button.textContent = "Отвязать камеру";
            
            // Если есть выбранный персонаж, привязываемся к нему
            if (this._selectedCharacter) {
                const characterComponent = this._selectedCharacter.getComponent<CharacterComponent>("character");
                if (characterComponent) {
                    this.updateCameraPosition(characterComponent.mesh.position);
                }
            }
            
            // Сбрасываем сохраненную позицию
            this._freeCameraPosition = undefined;
            this._freeCameraTarget = undefined;
        } else {
            // Режим свободной камеры
            if (button) button.textContent = "Привязать камеру";
            
            // Сохраняем текущую позицию и цель камеры
            this._freeCameraPosition = camera.position.clone();
            this._freeCameraTarget = camera.target.clone();
            
            // Увеличиваем дистанцию камеры для лучшего обзора
            camera.radius *= 1.5;
        }
    }
} 