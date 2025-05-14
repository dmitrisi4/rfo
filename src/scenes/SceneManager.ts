import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";

// Base class for all scenes
export abstract class GameScene {
    protected _scene: Scene;

    constructor(engine: Engine) {
        this._scene = new Scene(engine);
    }

    public get scene(): Scene {
        return this._scene;
    }

    public abstract initialize(): void;
    public abstract update(): void;
}

// Scene manager to handle different game scenes
export class SceneManager {
    private static _instance: SceneManager;
    private _engine: Engine;
    private _currentScene?: GameScene;

    private constructor(engine: Engine) {
        this._engine = engine;
    }

    public static getInstance(engine?: Engine): SceneManager {
        if (!SceneManager._instance) {
            if (!engine) {
                throw new Error("Engine must be provided when creating SceneManager instance");
            }
            SceneManager._instance = new SceneManager(engine);
        }
        return SceneManager._instance;
    }

    public startRenderLoop(): void {
        this._engine.runRenderLoop(() => {
            if (this._currentScene) {
                this._currentScene.update();
                this._currentScene.scene.render();
            }
        });
    }

    public switchScene(newScene: GameScene): void {
        if (this._currentScene) {
            this._currentScene.scene.dispose();
        }
        
        this._currentScene = newScene;
        this._currentScene.initialize();
    }

    public get currentScene(): GameScene | undefined {
        return this._currentScene;
    }
} 