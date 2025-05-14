import { Scene, Mesh, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, TextBlock, StackPanel, Control, Image } from "@babylonjs/gui";
import { CharacterComponent } from "../CharacterComponent";
import { AbilityComponent, Ability } from "../AbilityComponent";
import { Entity } from "../../utils/EntityComponentSystem";

export class HeroUI {
    private _scene: Scene;
    private _advancedTexture: AdvancedDynamicTexture;
    private _statsPanel!: StackPanel;
    private _abilitiesPanel!: StackPanel;
    private _healthBar!: Rectangle;
    private _manaBar!: Rectangle;
    private _statsText!: TextBlock;
    private _abilityIcons: Map<string, Image> = new Map();
    private _currentHero?: Entity;
    
    constructor(scene: Scene) {
        this._scene = scene;
        
        // Create fullscreen UI
        this._advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("heroUI", true, scene);
        
        // Create UI elements
        this.createStatsPanel();
        this.createAbilitiesPanel();
    }
    
    private createStatsPanel(): void {
        // Create main panel for hero stats
        this._statsPanel = new StackPanel();
        this._statsPanel.width = "250px";
        this._statsPanel.height = "120px";
        this._statsPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._statsPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._statsPanel.top = "-10px";
        this._statsPanel.left = "10px";
        this._statsPanel.background = "rgba(0, 0, 0, 0.5)";
        this._advancedTexture.addControl(this._statsPanel);
        
        // Create health bar
        const healthBarContainer = new Rectangle();
        healthBarContainer.width = "230px";
        healthBarContainer.height = "20px";
        healthBarContainer.background = "gray";
        healthBarContainer.color = "black";
        healthBarContainer.thickness = 1;
        healthBarContainer.cornerRadius = 5;
        this._statsPanel.addControl(healthBarContainer);
        
        this._healthBar = new Rectangle();
        this._healthBar.width = "100%";
        this._healthBar.height = "100%";
        this._healthBar.background = "green";
        this._healthBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        healthBarContainer.addControl(this._healthBar);
        
        const healthText = new TextBlock();
        healthText.text = "Health";
        healthText.color = "white";
        healthText.fontSize = 12;
        healthBarContainer.addControl(healthText);
        
        // Create mana bar
        const manaBarContainer = new Rectangle();
        manaBarContainer.width = "230px";
        manaBarContainer.height = "20px";
        manaBarContainer.background = "gray";
        manaBarContainer.color = "black";
        manaBarContainer.thickness = 1;
        manaBarContainer.cornerRadius = 5;
        this._statsPanel.addControl(manaBarContainer);
        
        this._manaBar = new Rectangle();
        this._manaBar.width = "100%";
        this._manaBar.height = "100%";
        this._manaBar.background = "blue";
        this._manaBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        manaBarContainer.addControl(this._manaBar);
        
        const manaText = new TextBlock();
        manaText.text = "Mana";
        manaText.color = "white";
        manaText.fontSize = 12;
        manaBarContainer.addControl(manaText);
        
        // Create stats text
        this._statsText = new TextBlock();
        this._statsText.text = "Stats: ";
        this._statsText.color = "white";
        this._statsText.fontSize = 14;
        this._statsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        this._statsText.paddingLeft = "5px";
        this._statsText.height = "40px";
        this._statsPanel.addControl(this._statsText);
        
        // Hide panel initially
        this._statsPanel.isVisible = false;
    }
    
    private createAbilitiesPanel(): void {
        // Create main panel for abilities
        this._abilitiesPanel = new StackPanel();
        this._abilitiesPanel.width = "250px";
        this._abilitiesPanel.height = "60px";
        this._abilitiesPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        this._abilitiesPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        this._abilitiesPanel.top = "-10px";
        this._abilitiesPanel.isVertical = false; // Horizontal layout
        this._abilitiesPanel.background = "rgba(0, 0, 0, 0.5)";
        this._advancedTexture.addControl(this._abilitiesPanel);
        
        // Create ability slots
        this.createAbilitySlot("Q", "laser_beam");
        this.createAbilitySlot("W", "deploy_turret");
        this.createAbilitySlot("E", "shield_generator");
        
        // Hide panel initially
        this._abilitiesPanel.isVisible = false;
    }
    
    private createAbilitySlot(key: string, abilityId: string): void {
        // Create container for ability icon and key
        const slotContainer = new StackPanel();
        slotContainer.width = "60px";
        slotContainer.height = "60px";
        slotContainer.paddingLeft = "5px";
        slotContainer.paddingRight = "5px";
        this._abilitiesPanel.addControl(slotContainer);
        
        // Create ability icon background
        const iconBg = new Rectangle();
        iconBg.width = "50px";
        iconBg.height = "50px";
        iconBg.background = "gray";
        iconBg.color = "black";
        iconBg.thickness = 1;
        iconBg.cornerRadius = 5;
        slotContainer.addControl(iconBg);
        
        // Create ability icon
        const abilityIcon = new Image();
        abilityIcon.width = "40px";
        abilityIcon.height = "40px";
        // Using a placeholder for now - would be replaced with actual ability icons
        abilityIcon.source = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        iconBg.addControl(abilityIcon);
        
        // Store reference to icon
        this._abilityIcons.set(abilityId, abilityIcon);
        
        // Create key text
        const keyText = new TextBlock();
        keyText.text = key;
        keyText.color = "white";
        keyText.fontSize = 12;
        keyText.height = "10px";
        slotContainer.addControl(keyText);
    }
    
    // Set hero to display
    public setHero(hero: Entity): void {
        this._currentHero = hero;
        
        // Show panels
        this._statsPanel.isVisible = true;
        this._abilitiesPanel.isVisible = true;
        
        // Initialize with current stats
        this.updateUI();
    }
    
    // Clear currently displayed hero
    public clearHero(): void {
        this._currentHero = undefined;
        
        // Hide panels
        this._statsPanel.isVisible = false;
        this._abilitiesPanel.isVisible = false;
    }
    
    // Update UI with current hero stats
    public updateUI(): void {
        if (!this._currentHero) return;
        
        const characterComponent = this._currentHero.getComponent<CharacterComponent>("character");
        if (!characterComponent) return;
        
        const stats = characterComponent.stats;
        
        // Update health bar
        const healthPercent = (stats.health / stats.maxHealth) * 100;
        this._healthBar.width = `${healthPercent}%`;
        
        // Update mana bar
        const manaPercent = (stats.mana / stats.maxMana) * 100;
        this._manaBar.width = `${manaPercent}%`;
        
        // Update stats text
        this._statsText.text = `Atk: ${stats.attack} | Def: ${stats.defense} | Lvl: ${stats.level}`;
        
        // Update ability cooldowns
        const abilityComponent = this._currentHero.getComponent<AbilityComponent>("ability");
        if (abilityComponent) {
            this.updateAbilityCooldowns(abilityComponent);
        }
    }
    
    private updateAbilityCooldowns(abilityComponent: AbilityComponent): void {
        // Check each ability icon
        this._abilityIcons.forEach((icon, abilityId) => {
            const ability = abilityComponent.getAbility(abilityId);
            if (ability) {
                // If ability is on cooldown, show overlay
                if (ability.isOnCooldown) {
                    icon.color = "rgba(0, 0, 0, 0.7)";
                } else {
                    icon.color = "white";
                }
            }
        });
    }
} 