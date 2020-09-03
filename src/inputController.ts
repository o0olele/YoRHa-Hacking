import { Scene, ActionManager, ExecuteCodeAction, Scalar, PointerEventTypes, Vector3 } from "@babylonjs/core";
import { Hud } from "./ui";

export class PlayerInput {
    public inputMap: any;

    //simple movement
    public horizontal: number = 0;
    public vertical: number = 0;
    //tracks whether or not there is movement in that axis
    public horizontalAxis: number = 0;
    public verticalAxis: number = 0;

    public groundPos: Vector3 = new Vector3(0, 0, 0);
    public groundLastPos!: Vector3;

    public isShot:boolean = false;

    public _ui:Hud;

    constructor(scene: Scene, ui: Hud) {
        scene.actionManager = new ActionManager(scene);
        this._ui = ui;

        this.inputMap = {};
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));
        scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnLeftPickTrigger, (evt) => {
            this.inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));

        // scene.onPointerObservable.add((eventData) => {

        // }, PointerEventTypes.POINTERMOVE);
        

        scene.onBeforeRenderObservable.add(() => {
            this._updateFromKeyboard();
        });

        if (!this._ui.isMobile) {
            scene.onPointerObservable.add((pointerInfo) => {
                switch (pointerInfo.type) {
                    case PointerEventTypes.POINTERDOWN:
                        this.isShot = true;
                        break;
                    case PointerEventTypes.POINTERUP:
                        this.isShot = false;
                        break;
                    case PointerEventTypes.POINTERMOVE:
                        this.groundLastPos = this.groundPos;
                        this.groundPos = this._getGroundPosition(scene);
                        break;
                }
            });
            
        }
    }

    private _getGroundPosition(scene: Scene): any {
        // Use a predicate to get position on the ground
        var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh == scene.getMeshByName("ground"); });
        if (pickinfo!.hit) {
            return pickinfo!.pickedPoint;
        }

        return this.groundLastPos;
    }

    private _updateFromKeyboard(): void {
        if (this.inputMap["ArrowUp"] || this.inputMap["w"] || (this._ui.leftPuck_isDown)) {
            if (this._ui.leftPuck_isDown)
                this.vertical = this._ui.yAddPos / 100;
            else
                this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);
            this.verticalAxis = 1;

        } else if (this.inputMap["ArrowDown"] || this.inputMap["s"] || (this._ui.leftPuck_isDown)) {
            if (this._ui.leftPuck_isDown)
                this.vertical = this._ui.yAddPos / 100;
            else
                this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
            this.verticalAxis = -1;
        } else {
            this.vertical = 0;
            this.verticalAxis = 0;
        }

        if (this.inputMap["ArrowLeft"] || this.inputMap["a"] || (this._ui.leftPuck_isDown)) {
            if (this._ui.leftPuck_isDown)
                this.horizontal = this._ui.xAddPos / 100;
            else
                this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);
            this.horizontalAxis = -1;

        } else if (this.inputMap["ArrowRight"] || this.inputMap["d"] || (this._ui.leftPuck_isDown)) {
            if (this._ui.leftPuck_isDown)
                this.horizontal = this._ui.xAddPos / 100;
            else
                this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
            this.horizontalAxis = 1;
        }
        else {
            this.horizontal = 0;
            this.horizontalAxis = 0;
        }

        if (this._ui.isMobile) {
            if (this._ui.rightPuck_isDown) {
                this.isShot = true;
                this.groundPos = new Vector3(-this._ui.xAddRot, 0, this._ui.yAddRot);
            } else {
                this.isShot = false;
            }
        }
        
    }

}