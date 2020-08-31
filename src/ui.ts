import { TextBlock, StackPanel, AdvancedDynamicTexture, Image, Button, Rectangle, Control, Grid, Ellipse } from "@babylonjs/gui";
import { Scene, Sound, ParticleSystem, PostProcess, Effect, SceneSerializer, Vector2, VirtualJoystick } from "@babylonjs/core";
import { Web } from "./web";
import { EnemyMgr, Player } from "./playerController";

export class Hud {
    private _scene: Scene;
    private _web: Web;

    //Game Timer
    public time: number = 999;
    public lastTime: number = 999;
    public clientTime: number = 999;
    public _quit: boolean = false;
    private _playerUI: AdvancedDynamicTexture;
    private _leftText!: Button;

    private _pauseMenu!: Rectangle;
    public isMobile!: boolean;

    public xAddPos = 0;
    public yAddPos = 0;
    public xAddRot = 0;
    public yAddRot = 0;
    private sideJoystickOffset = 50;
    private bottomJoystickOffset = -25;
    public leftPuck_isDown = false;
    public rightPuck_isDown = false

    constructor(scene: Scene, web: Web) {

        this._scene = scene;
        this._web = web;

        const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        this._playerUI = playerUI;

        const leftBtn = Button.CreateImageWithCenterTextButton("leftTimeBtn", "999", "images/timeleft.png");
        leftBtn.width = "150px";
        leftBtn.height = "150px";
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

        //Check if Mobile, add button controls
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this.isMobile = true; // tells inputController to track mobile inputs

            let leftThumbContainer = this._makeThumbArea("leftThumb", 2, "blue", "");
        leftThumbContainer.height = "200px";
        leftThumbContainer.width = "200px";
        leftThumbContainer.isPointerBlocker = true;
        leftThumbContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        leftThumbContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        leftThumbContainer.alpha = 0.4;
        leftThumbContainer.left = this.sideJoystickOffset;
        leftThumbContainer.top = this.bottomJoystickOffset;

        let leftInnerThumbContainer = this._makeThumbArea("leftInnterThumb", 4, "blue", "");
        leftInnerThumbContainer.height = "80px";
        leftInnerThumbContainer.width = "80px";
        leftInnerThumbContainer.isPointerBlocker = true;
        leftInnerThumbContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftInnerThumbContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;


        let leftPuck = this._makeThumbArea("leftPuck", 0, "blue", "blue");
        leftPuck.height = "60px";
        leftPuck.width = "60px";
        leftPuck.isPointerBlocker = true;
        leftPuck.horizontalAlignment =Control.HORIZONTAL_ALIGNMENT_CENTER;
        leftPuck.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;


        leftThumbContainer.onPointerDownObservable.add( (coordinates) => {
            leftPuck.isVisible = true;
            leftPuck.left = coordinates.x - (leftThumbContainer._currentMeasure.width * .5) - this.sideJoystickOffset;
            leftPuck.top = (playerUI.getSize().height - coordinates.y - (leftThumbContainer._currentMeasure.height * .5) + this.bottomJoystickOffset ) * -1;
            this.leftPuck_isDown = true;
            leftThumbContainer.alpha = 0.9;
            console.log(leftPuck.left, leftPuck.top);
        });

        leftThumbContainer.onPointerUpObservable.add( (coordinates) => {
            this.xAddPos = 0;
            this.yAddPos = 0;
            this.leftPuck_isDown = false;
            leftPuck.isVisible = false;
            leftThumbContainer.alpha = 0.4;
        });


        leftThumbContainer.onPointerMoveObservable.add( (coordinates) => {
            if (this.leftPuck_isDown) {
                this.xAddPos = coordinates.x - (leftThumbContainer._currentMeasure.width * .5) - this.sideJoystickOffset;
                this.yAddPos = playerUI.getSize().height - coordinates.y - (leftThumbContainer._currentMeasure.height * .5) + this.bottomJoystickOffset;
                leftPuck.left = this.xAddPos;
                leftPuck.top = this.yAddPos * -1;
            }
        });

        playerUI.addControl(leftThumbContainer);
        leftThumbContainer.addControl(leftInnerThumbContainer);
        leftThumbContainer.addControl(leftPuck);
        leftPuck.isVisible = true;
        console.log(leftPuck.left, leftPuck.top);


        let rightThumbContainer = this._makeThumbArea("rightThumb", 2, "red", "");
        rightThumbContainer.height = "200px";
        rightThumbContainer.width = "200px";
        rightThumbContainer.isPointerBlocker = true;
        rightThumbContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        rightThumbContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        rightThumbContainer.alpha = 0.4;
        rightThumbContainer.left = -this.sideJoystickOffset;
        rightThumbContainer.top = this.bottomJoystickOffset;

        let rightInnerThumbContainer = this._makeThumbArea("rightInnterThumb", 4, "red", "");
        rightInnerThumbContainer.height = "80px";
        rightInnerThumbContainer.width = "80px";
        rightInnerThumbContainer.isPointerBlocker = true;
        rightInnerThumbContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        rightInnerThumbContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;


        let rightPuck = this._makeThumbArea("rightPuck", 0, "red", "red");
        rightPuck.height = "60px";
        rightPuck.width = "60px";
        rightPuck.isPointerBlocker = true;
        rightPuck.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        rightPuck.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;


        rightThumbContainer.onPointerDownObservable.add( (coordinates) => {
            rightPuck.isVisible = true;
            rightPuck.left = (playerUI.getSize().width - coordinates.x - (rightThumbContainer._currentMeasure.width * .5) - this.sideJoystickOffset) * -1;
            rightPuck.top = (playerUI.getSize().height - coordinates.y - (rightThumbContainer._currentMeasure.height * .5) + this.bottomJoystickOffset) * -1;
            this.rightPuck_isDown = true;
            rightThumbContainer.alpha = 0.9;
        });

        rightThumbContainer.onPointerUpObservable.add( (coordinates) => {
            this.xAddRot = 0;
            this.yAddRot = 0;
            this.rightPuck_isDown = false;
            rightPuck.isVisible = false;
            rightThumbContainer.alpha = 0.4;
        });


        rightThumbContainer.onPointerMoveObservable.add( (coordinates) => {
            if (this.rightPuck_isDown) {
                this.xAddRot = playerUI.getSize().width - coordinates.x - (rightThumbContainer._currentMeasure.width * .5) - this.sideJoystickOffset;
                this.yAddRot = playerUI.getSize().height - coordinates.y - (rightThumbContainer._currentMeasure.height * .5) + this.bottomJoystickOffset;
                rightPuck.left = this.xAddRot * -1;
                rightPuck.top = this.yAddRot * -1;
            }
        });

        //leftThumbContainer.left = 50;
        playerUI.addControl(rightThumbContainer);
        rightThumbContainer.addControl(rightInnerThumbContainer);
        rightThumbContainer.addControl(rightPuck);
        rightPuck.isVisible = true;

        }

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

    private _makeThumbArea(name:string, thickness:number, color:string, background:string) {
        let rect = new Ellipse();
        rect.name = name;
        rect.thickness = thickness;
        rect.color = color;
        if (background != "")
        rect.background = background;
        rect.paddingLeft = "0px";
        rect.paddingRight = "0px";
        rect.paddingTop = "0px";
        rect.paddingBottom = "0px";

        return rect;
    }

    private _createHPBar(): Rectangle {
        const barContainer = new Rectangle();
        barContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        barContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        barContainer.isVisible = true;
        barContainer.height = "50px";
        barContainer.width = "150px";

        const stack = new StackPanel();
        barContainer.addControl(stack);

        const hpBar = new Rectangle();
        hpBar.background = "white";
        hpBar.height = "50px";
        hpBar.width = "150px";
        stack.addControl(hpBar);

        const hpBarLine = new Rectangle();
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