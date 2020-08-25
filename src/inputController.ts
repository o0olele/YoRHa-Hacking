import { Scene, ActionManager, ExecuteCodeAction, Scalar, PointerEventTypes, Vector3 } from "@babylonjs/core";

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

    constructor(scene: Scene) {
        scene.actionManager = new ActionManager(scene);

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

        scene.onPointerObservable.add((eventData) => {

        }, PointerEventTypes.POINTERMOVE);
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

        scene.onBeforeRenderObservable.add(() => {
            this._updateFromKeyboard();
        });
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
        if (this.inputMap["ArrowUp"] || this.inputMap["w"]) {
            this.vertical = Scalar.Lerp(this.vertical, 1, 0.2);
            this.verticalAxis = 1;

        } else if (this.inputMap["ArrowDown"] || this.inputMap["s"]) {
            this.vertical = Scalar.Lerp(this.vertical, -1, 0.2);
            this.verticalAxis = -1;
        } else {
            this.vertical = 0;
            this.verticalAxis = 0;
        }

        if (this.inputMap["ArrowLeft"] || this.inputMap["a"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, -1, 0.2);
            this.horizontalAxis = -1;

        } else if (this.inputMap["ArrowRight"] || this.inputMap["d"]) {
            this.horizontal = Scalar.Lerp(this.horizontal, 1, 0.2);
            this.horizontalAxis = 1;
        }
        else {
            this.horizontal = 0;
            this.horizontalAxis = 0;
        }
    }
}