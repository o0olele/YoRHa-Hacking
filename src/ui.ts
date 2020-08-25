import { TextBlock, StackPanel, AdvancedDynamicTexture, Image, Button, Rectangle, Control, Grid } from "@babylonjs/gui";
import { Scene, Sound, ParticleSystem, PostProcess, Effect, SceneSerializer } from "@babylonjs/core";

export class Hud {
    private _scene: Scene;

    //Game Timer
    public time: number = 999; //keep track to signal end game REAL TIME
    public lastTime: number = 999;
    private _playerUI: AdvancedDynamicTexture;
    private _leftText!: Button;

    private _quit: boolean = false;

    constructor(scene: Scene) {

        this._scene = scene;

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
        });


        playerUI.addControl(leftBtn);
        //playerUI.addControl(leftText);
        playerUI.addControl(loseBtn);


        this._leftText = leftBtn;

    }

    public UpdateLeftTime(time: number) {
        if (time == this.lastTime)
            return;
        this.time = time;
        this._leftText!.textBlock!.text = String(time);
    }


}