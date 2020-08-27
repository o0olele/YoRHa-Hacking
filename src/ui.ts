import { TextBlock, StackPanel, AdvancedDynamicTexture, Image, Button, Rectangle, Control, Grid } from "@babylonjs/gui";
import { Scene, Sound, ParticleSystem, PostProcess, Effect, SceneSerializer } from "@babylonjs/core";
import { Web } from "./web";
import { EnemyMgr, Player } from "./playerController";

export class Hud {
    private _scene: Scene;
    private _web: Web;

    //Game Timer
    public time: number = 999; 
    public lastTime: number = 999;
    public clientTime: number = 999;
    public _quit:boolean = false;
    private _playerUI: AdvancedDynamicTexture;
    private _leftText!: Button;

    private _pauseMenu!: Rectangle;

    constructor(scene: Scene, web: Web) {

        this._scene = scene;
        this._web = web;

        const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        this._playerUI = playerUI;

        const leftBtn = Button.CreateImageWithCenterTextButton("leftTimeBtn", "999", "images/timeleft.png");
        leftBtn.width="150px";
        leftBtn.height="150px";
        leftBtn.textBlock!.paddingLeft = "-50px";
        leftBtn.textBlock!.paddingTop = "-50px";
        leftBtn.textBlock!.fontStyle = "bold";
        leftBtn.textBlock!.fontSize = "32px"
        leftBtn.thickness = 0;
        leftBtn.horizontalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
        leftBtn.verticalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

        const loseBtn = Button.CreateSimpleButton("lose", "LOSE");
        loseBtn.width = 0.2;
        loseBtn.height = "40px";
        loseBtn.color = "white";
        loseBtn.top = "-14px";
        loseBtn.thickness = 0;
        loseBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        loseBtn.onPointerDownObservable.add(() => {
            this._quit = true;
            //this._pauseMenu.isVisible = true;
        });

        this._createPauseMenu();
        this._leftText = leftBtn;

        playerUI.addControl(leftBtn);
        playerUI.addControl(loseBtn);
        playerUI.addControl(this._pauseMenu);
        this._pauseMenu.isVisible = false;

    }

    //---- Pause Menu Popup ----
    private _createPauseMenu(): void {

        const pauseMenu = new Rectangle();
        pauseMenu.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        pauseMenu.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        pauseMenu.height = 1;
        pauseMenu.width = 1;
        pauseMenu.thickness = 0;
        pauseMenu.isVisible = true;
        pauseMenu.background = "gray";
        pauseMenu.cornerRadius = 20;

        //stack panel for the buttons
        const stackPanel = new StackPanel();
        stackPanel.width = .83;
        pauseMenu.addControl(stackPanel);

        const dieText = new TextBlock("youdie", "Died");
        dieText.width = 0.5;
        dieText.fontSize = "48px";
        dieText.color = "white";
        dieText.height = "64px";
        dieText.top = "-100px";
        dieText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        stackPanel.addControl(dieText);

        const resumeBtn = Button.CreateSimpleButton("resume", "Try Again");
        resumeBtn.width = 0.2;
        resumeBtn.height = "44px";
        resumeBtn.color = "white";
        resumeBtn.fontSize = "18px";
        resumeBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        resumeBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        stackPanel.addControl(resumeBtn);

        this._pauseMenu = pauseMenu;

        //when the button is down, make menu invisable and remove control of the menu
        resumeBtn.onPointerDownObservable.add(() => {
            this._pauseMenu.isVisible = false;
            this._web.SendRelifeMsg();
        });

    }

    private _createHPBar():Rectangle {
        const barContainer = new Rectangle();
        barContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        barContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        barContainer.isVisible = true;
        barContainer.height = "50px";
        barContainer.width = "150px";

        const stack = new StackPanel();
        barContainer.addControl(stack);

        const hpBar  = new Rectangle();
        hpBar.background = "white";
        hpBar.height = "50px";
        hpBar.width = "150px";
        stack.addControl(hpBar);

        const hpBarLine  = new Rectangle();
        hpBarLine.background = "white";
        hpBarLine.height = "5px";
        hpBarLine.width = "150px";
        stack.addControl(hpBarLine);

        return barContainer
    }

    public UpdateLeftTime(time: number) {
        if (time == this.lastTime)
            return;
        this.time = time;
        this._leftText!.textBlock!.text = String(time);
    }

    public ShowYouDie() {
        this._pauseMenu.isVisible = true;
    }


}