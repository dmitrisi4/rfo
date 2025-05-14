import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Meshes/meshBuilder";
import "@babylonjs/inspector";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";

import { SceneManager } from "./scenes/SceneManager";
import { GameplayScene } from "./scenes/GameplayScene";

class Game {
    private canvas: HTMLCanvasElement;
    private engine: Engine;

    constructor() {
        // Get the canvas element
        const canvas = document.getElementById("renderCanvas");
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Canvas element not found");
        }
        this.canvas = canvas;
        
        // Configure asset loading
        SceneLoader.ShowLoadingScreen = false;
        
        // Initialize the BabylonJS engine
        this.engine = new Engine(this.canvas, true);
        
        // Initialize scene manager
        const sceneManager = SceneManager.getInstance(this.engine);
        
        // Create and switch to gameplay scene
        const gameplayScene = new GameplayScene(this.engine);
        sceneManager.switchScene(gameplayScene);
        
        // Start render loop
        sceneManager.startRenderLoop();
        
        // Handle browser resize
        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        // Enable inspector in development
        if (process.env.NODE_ENV !== 'production') {
            this.engine.displayLoadingUI();
            setTimeout(() => {
                this.engine.hideLoadingUI();
                gameplayScene.scene.debugLayer.show();
            }, 1000);
        }
    }
}

// Initialize the game when window loads
window.addEventListener("DOMContentLoaded", () => {
    new Game();
}); 