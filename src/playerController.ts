import { TransformNode, ShadowGenerator, Scene, Mesh, UniversalCamera, ArcRotateCamera, Vector3, Quaternion, Ray, Scalar } from "@babylonjs/core";
import { PlayerInput } from "./inputController";

export class Player extends TransformNode {
    public camera!: UniversalCamera;
    public scene: Scene;
    private _input: PlayerInput | undefined;

    //Player
    public mesh: Mesh; //outer collisionbox of player
    private _direct!: number;
    private _pos!: Vector3;
    private _hp!: number;

    //Camera
    private _camRoot!: TransformNode;
    private _yTilt!: TransformNode;

    //const values
    private static readonly PLAYER_SPEED: number = 0.45;
    private static readonly JUMP_FORCE: number = 0.80;
    private static readonly GRAVITY: number = -2.8;
    private static readonly ORIGINAL_TILT: Vector3 = new Vector3(0.5934119456780721, 0, 0);

    //player movement vars
    private _deltaTime: number = 0;
    private _h!: number;
    private _v!: number;

    private _moveDirection: Vector3 = new Vector3();
    private _inputAmt!: number;

    //gravity, ground detection, jumping
    private _gravity: Vector3 = new Vector3();
    private _lastGroundPos: Vector3 = Vector3.Zero(); // keep track of the last grounded position
    private _grounded!: boolean;

    constructor(assets: { mesh: any; }, scene: Scene, shadowGenerator: ShadowGenerator, input?: PlayerInput) {
        super("player", scene);
        this.scene = scene;
        this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

        shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows

        this._input = input;
        this._pos = this.mesh.position;
    }

    private _caculateAngle(x: number, y: number): number {
        if (x > 0 && y > 0)
            return Math.atan(x / y) * 180 / Math.PI;
        else if (x > 0 && y < 0)
            return 180 + Math.atan(x / y) * 180 / Math.PI;
        else if (x < 0 && y < 0)
            return 180 + Math.atan(x / y) * 180 / Math.PI;
        else if (x < 0 && y > 0)
            return 360 + Math.atan(x / y) * 180 / Math.PI;
        else if (x > 0 && y == 0)
            return 90;
        else if (x < 0 && y == 0)
            return 270;
        else if (x == 0 && y > 0)
            return 0;
        else if (x == 0 && y < 0)
            return 180;
        return 0;
    }

    public getDirect(): number {
        this._h = 0; //x-axis x
        this._v = 0; //z-axis y
        return this._direct;

    }

    public isMove(): boolean {
        return this._input?.horizontalAxis != 0 || this._input.verticalAxis != 0;
    }

    private _updateFromControls(): void {
        this._deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;

        this._moveDirection = Vector3.Zero(); // vector that holds movement information
        this._h = this._input!.horizontal; //x-axis x
        this._v = this._input!.vertical; //z-axis y
        this._direct = this._caculateAngle(-this._h, -this._v);
        console.log(this._direct);

        //--MOVEMENTS BASED ON CAMERA (as it rotates)--
        let fwd = this._camRoot.forward;
        let right = this._camRoot.right;
        let correctedVertical = fwd.scaleInPlace(this._v);
        let correctedHorizontal = right.scaleInPlace(this._h);

        //movement based off of camera's view
        let move = correctedHorizontal.addInPlace(correctedVertical);

        //clear y so that the character doesnt fly up, normalize for next step
        this._moveDirection = new Vector3((move).normalize().x, 0, (move).normalize().z);

        //clamp the input value so that diagonal movement isn't twice as fast
        let inputMag = Math.abs(this._h) + Math.abs(this._v);
        if (inputMag < 0) {
            this._inputAmt = 0;
        } else if (inputMag > 1) {
            this._inputAmt = 1;
        } else {
            this._inputAmt = inputMag;
        }

        //final movement that takes into consideration the inputs
        this._moveDirection = this._moveDirection.scaleInPlace(this._inputAmt * Player.PLAYER_SPEED);

        //Rotations
        let temp = new Vector3();
        temp.x = 2 * this.mesh!.position!.x - this._input!.groundPos!.x;
        temp.z = 2 * this.mesh!.position!.z - this._input!.groundPos!.z;
        temp.y = this.mesh!.position!.y;
        this.mesh.lookAt(temp, Math.PI);
    }

    private _floorRaycast(offsetx: number, offsetz: number, raycastlen: number): Vector3 {
        let raycastFloorPos = new Vector3(this.mesh!.position.x + offsetx, this.mesh!.position.y + 0.5, this.mesh!.position.z + offsetz);
        let ray = new Ray(raycastFloorPos, Vector3.Up().scale(-1), raycastlen);

        let predicate = function (mesh: { isPickable: any; isEnabled: () => any; }) {
            return mesh.isPickable && mesh.isEnabled();
        }
        let pick = this.scene.pickWithRay(ray, predicate);

        if (pick!.hit) {
            return pick!.pickedPoint!;
        } else {
            return Vector3.Zero();
        }
    }

    private _isGrounded(): boolean {
        if (this._floorRaycast(0, 0, 0.6).equals(Vector3.Zero())) {
            return false;
        } else {
            return true;
        }
    }

    private _updateGroundDetection(): void {
        if (!this._isGrounded()) {
            this._gravity = this._gravity.addInPlace(Vector3.Up().scale(this._deltaTime * Player.GRAVITY));
            this._grounded = false;
        }
        //limit the speed of gravity to the negative of the jump power
        if (this._gravity.y < -Player.JUMP_FORCE) {
            this._gravity.y = -Player.JUMP_FORCE;
        }
        this.mesh.position = new Vector3(
            Scalar.Lerp(this.mesh.position.x,this._pos.x,0.02),
            this.mesh.position.y,
            Scalar.Lerp(this.mesh.position.z,this._pos.z,0.02),
        );
        //this.mesh.moveWithCollisions(new Vector3(this._pos.x - this.mesh.position.x, 0, this._pos.z - this.mesh.position.z));
        //this.mesh.moveWithCollisions(this._moveDirection.addInPlace(this._gravity));

        if (this._isGrounded()) {
            this._gravity.y = 0;
            this._grounded = true;
            this._lastGroundPos.copyFrom(this.mesh.position);
        }
    }

    private _beforeRenderUpdate(): void {
        this._updateFromControls();
        this._updateGroundDetection();
    }

    public activatePlayerCamera(): UniversalCamera {
        this.scene.registerBeforeRender(() => {

            this._beforeRenderUpdate();
            this._updateCamera();

        })
        return this.camera;
    }

    public mUpdate(x: number, z: number, hp: number) {
        this._pos.x = x;
        this._pos.z = z;
        this._pos.y = this.mesh.position.y;
        this._hp = hp;

    }

    private _updateCamera(): void {
        let centerPlayer = this.mesh.position.y + 2;
        this._camRoot.position = Vector3.Lerp(this._camRoot.position, new Vector3(this.mesh.position.x, centerPlayer, this.mesh.position.z), 0.4);
    }

    private _setupPlayerCamera() {
        //root camera parent that handles positioning of the camera to follow the player
        this._camRoot = new TransformNode("root");
        this._camRoot.position = new Vector3(0, 0, 0); //initialized at (0,0,0)
        //to face the player from behind (180 degrees)
        this._camRoot.rotation = new Vector3(0, Math.PI, 0);

        //rotations along the x-axis (up/down tilting)
        let yTilt = new TransformNode("ytilt");
        //adjustments to camera view to point down at our player
        yTilt.rotation = Player.ORIGINAL_TILT;
        this._yTilt = yTilt;
        yTilt.parent = this._camRoot;

        //our actual camera that's pointing at our root's position
        this.camera = new UniversalCamera("cam", new Vector3(0, 0, -30), this.scene);
        this.camera.lockedTarget = this._camRoot.position;
        this.camera.fov = 0.47350045992678597;
        this.camera.parent = yTilt;

        this.scene.activeCamera = this.camera;
        return this.camera;
    }
}

export class EnemyMgr {
    public eMap!: Map<number, Enemy>;
    public assets: { mesh: any; };
    public scene: Scene;
    public show: ShadowGenerator;

    constructor(assets: { mesh: any; }, sc: Scene, shadowGenerator: ShadowGenerator) {
        this.eMap = new Map<number, Enemy>();
        this.assets = assets;
        this.scene = sc;
        this.show = shadowGenerator;
    }

    public Add(e: number, x: number, y: number, hp: number) {
        if (this.eMap.has(e)) {
            this.eMap.get(e)?.Update(x, y, hp);
        } else {
            let temp = new Enemy(e, this.assets, this.scene, this.show);
            this.eMap.set(e, temp);
        }
    }

    public Del(e: number) {
        if (this.eMap.has(e)) {
            this.eMap.get(e)?.Destroy()
            this.eMap.delete(e);
        }
    }
}

export class Enemy extends TransformNode {
    public scene: Scene;

    //Player
    public pid!: number;
    public mesh: Mesh; //outer collisionbox of player
    public pos!: Vector3;
    public hp!: number;


    constructor(id: number, assets: { mesh: any; }, scene: Scene, shadowGenerator: ShadowGenerator) {
        super("player" + id, scene);
        this.pid = id;
        this.scene = scene;

        this.mesh = assets.mesh!.clone();
        this.mesh.parent = this;

        shadowGenerator.addShadowCaster(assets.mesh); //the player mesh will cast shadows

        this.scene.registerBeforeRender(() => {

            this.position = this.pos;

        });

        this.pos = this.mesh.position;
    }

    public Destroy() {
        this.scene.removeMesh(this.mesh, true);
    }

    public Update(x: number, y: number, hp: number) {
        this.pos.x = x;
        this.pos.z = y;
        this.hp = hp;
    }
}