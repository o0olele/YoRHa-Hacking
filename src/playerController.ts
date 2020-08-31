import { TransformNode, ShadowGenerator, Scene, Mesh, UniversalCamera, ArcRotateCamera, Vector3, Quaternion, Ray, Scalar, StandardMaterial, Color3, MeshBuilder, Matrix, PointLight, PhysicsImpostor, CannonJSPlugin } from "@babylonjs/core";
import { PlayerInput } from "./inputController";

export class Player extends TransformNode {
    public camera!: UniversalCamera;
    public scene: Scene;
    private _input: PlayerInput | undefined;

    //Player
    public mesh: Mesh; //outer collisionbox of player
    private _direct!: number;
    private _pos!: Vector3;
    private _shotDirect!: number;
    private _hp!: number;

    private _lastLookat: Vector3 = new Vector3(0, 0, 0);

    //Camera
    private _camRoot!: TransformNode;
    private _yTilt!: TransformNode;

    //const values
    private static readonly PLAYER_SPEED: number = 0.45;
    private static readonly JUMP_FORCE: number = 0.80;
    private static readonly GRAVITY: number = -2.8;
    private static readonly ORIGINAL_TILT: Vector3 = new Vector3(0.5934119456780721, 0, 0);

    //player movement vars
    private _h!: number;
    private _v!: number;

    //gravity, ground detection, jumping
    private _gravity: Vector3 = new Vector3();
    private _lastGroundPos: Vector3 = Vector3.Zero(); // keep track of the last grounded position
    private _grounded!: boolean;

    constructor(assets: { mesh: any; }, scene: Scene, input?: PlayerInput) {
        super("player", scene);
        this.scene = scene;
        this._setupPlayerCamera();

        this.mesh = assets.mesh;
        this.mesh.parent = this;

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

    public getShotDirect(): number {
        return this._shotDirect;
    }

    public isMove(): boolean {
        return this._input?.horizontalAxis != 0 || this._input.verticalAxis != 0;
    }

    public isShot(): boolean {
        return this._input!.isShot;
    }

    private _updateFromControls(): void {
        this._h = this._input!.horizontal; //x-axis x
        this._v = this._input!.vertical; //z-axis y
        this._direct = this._caculateAngle(-this._h, -this._v);

        //Rotations
        if (this._input?._ui.rightPuck_isDown) {
            this.mesh.lookAt(new Vector3(
                this.mesh!.position!.x+this._input.groundPos.x,
                0,
                this.mesh!.position!.z+this._input.groundPos.z
            ), Math.PI);

            this._shotDirect = this._caculateAngle(-this._input.groundPos.x, -this._input.groundPos.z);
        } else {
            let temp = new Vector3();
            temp.x = 2 * this.mesh!.position!.x - this._input!.groundPos!.x;
            temp.z = 2 * this.mesh!.position!.z - this._input!.groundPos!.z;
            temp.y = this.mesh!.position!.y;
            this.mesh.lookAt(new Vector3(
                Scalar.Lerp(this._lastLookat.x, temp.x, 0.1),
                temp.y,
                Scalar.Lerp(this._lastLookat.z, temp.z, 0.1)
            ), Math.PI);
            this._lastLookat = temp;

            this._shotDirect = this._caculateAngle(this._input!.groundPos!.x - this.mesh!.position!.x, this._input!.groundPos!.z - this.mesh!.position!.z);
        }
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
        /*if (!this._isGrounded()) {
            this._gravity = this._gravity.addInPlace(Vector3.Up().scale(this._deltaTime * Player.GRAVITY));
            this._grounded = false;
        }
        //limit the speed of gravity to the negative of the jump power
        if (this._gravity.y < -Player.JUMP_FORCE) {
            this._gravity.y = -Player.JUMP_FORCE;
        }*/
        this.mesh.position = new Vector3(
            Scalar.Lerp(this.mesh.position.x, this._pos.x, 0.1),
            0,//this.mesh.position.y,
            Scalar.Lerp(this.mesh.position.z, this._pos.z, 0.1),
        );

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
        let centerPlayer = this.mesh.position.y + 10;
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
        this.camera = new UniversalCamera("cam", new Vector3(0, 0, -100), this.scene);
        this.camera.lockedTarget = this._camRoot.position;
        this.camera.fov = 0.47350045992678597;
        this.camera.parent = yTilt;

        this.scene.activeCamera = this.camera;
        return this.camera;
    }
}

export class EnemyMgr {
    public eMap!: Map<number, Enemy>;
    public bMap!: Map<number, Bullet>;
    public oMap!: Map<number, Obstacle>;
    public assets: { mesh: any; };
    public scene: Scene;

    constructor(assets: { mesh: any; }, sc: Scene) {
        this.eMap = new Map<number, Enemy>();
        this.bMap = new Map<number, Bullet>();
        this.oMap = new Map<number, Obstacle>()
        this.assets = assets;
        this.scene = sc;
    }

    public Add(e: number, x: number, y: number, hp: number, direct: number) {
        if (this.eMap.has(e)) {
            this.eMap.get(e)?.Update(x, y, hp, direct);
        } else {
            let temp = new Enemy(e, this.assets, this.scene);
            temp.UpdateMesh(x, y);
            this.eMap.set(e, temp);
        }
    }

    public Del(e: number) {
        if (this.eMap.has(e)) {
            this.eMap.get(e)?.Destroy()
            this.eMap.delete(e);
        }
    }

    public AddBullet(e: number, x: number, y: number) {
        if (this.bMap.has(e)) {
            this.bMap.get(e)?.Update(x, y);
        } else {
            let temp = new Bullet(e, x, y, this.scene);
            this.bMap.set(e, temp);
        }
    }

    public DelBullet(e: number) {
        if (this.bMap.has(e)) {
            this.bMap.get(e)?.Destroy();
            this.bMap.delete(e);
        }
    }

    public DelLastBullets(list: number[]) {
        let iterator = this.bMap.keys();
        let r: IteratorResult<number>;
        while (r = iterator.next(), !r.done) {
            if (typeof (list) == null || list.length == 0) {
                this.DelBullet(r.value);
                continue;
            }
            if (list.indexOf(r.value) < 0)
                this.DelBullet(r.value);
        }
    }

    public AddObstacle(id: number, x: number, y: number, size: number) {
        if (this.oMap.has(id))
            return;

        var temp = new Obstacle(id, size, new Vector3(x, 1, y), this.scene);
        this.oMap.set(id, temp);
    }

    public DelObstacle(id: number) {
        if (this.oMap.has(id)) {
            this.oMap.get(id)?.Destroy();
            this.oMap.delete(id);
        }
    }
}

export class Obstacle extends TransformNode {
    public oid: number;
    public scene: Scene;
    public mesh!: Mesh;

    constructor(id: number, size: number, pos: Vector3, scene: Scene) {
        super("obstacle" + id, scene);

        this.oid = id;
        this.scene = scene;

        var gravityVector = new Vector3(0, -9.81, 0);
        var physicsPlugin = new CannonJSPlugin();
        this.scene.enablePhysics(gravityVector, physicsPlugin);

        this.mesh = MeshBuilder.CreateBox("oo" + id, { size: size });
        this.mesh.position = pos;
        this.mesh.physicsImpostor = new PhysicsImpostor(this.mesh, PhysicsImpostor.BoxImpostor, { mass: 1 }, scene);

        this.mesh.parent = this;
    }

    public Destroy() {
        this.scene.removeMesh(this.mesh, true);
        this.mesh.dispose();
    }
}

export class Bullet extends TransformNode {
    public scene: Scene;
    public bid!: number;
    public mesh!: Mesh;
    public pos: Vector3 = Vector3.Zero();

    constructor(id: number, x: number, y: number, scene: Scene) {
        super("bullet" + id, scene);

        this.bid = id;
        this.scene = scene;

        this.mesh = Mesh.CreateSphere("bb" + id, 12, 0.8);
        this.mesh.position = new Vector3(x,0,y);
        this.mesh.parent = this;

        this.scene.registerBeforeRender(() => {
            this.mesh.position = new Vector3(
                Scalar.Lerp(this.mesh.position.x, this.pos.x, 0.2),
                0,//this.mesh.position.y,
                Scalar.Lerp(this.mesh.position.z, this.pos.z, 0.2),
            );
        });
        this.mesh.isVisible = false;
        this.pos = this.mesh.position;
    }

    public Destroy() {
        this.scene.removeMesh(this.mesh, true);
        this.mesh.dispose();
    }

    public Update(x: number, z: number) {
        this.mesh.isVisible = true;

        this.pos.x = x;//Scalar.Lerp(this.lpos.x, x, 0.5);
        this.pos.y = 0;
        this.pos.z = z;//Scalar.Lerp(this.lpos.z, z, 0.5);

        console.log(this.pos, this.mesh.position);
    }
}

export class Enemy extends TransformNode {
    public scene: Scene;

    public pid!: number;
    public mesh: Mesh; //outer collisionbox of player
    public hpMesh!: Mesh;
    public pos: Vector3 = new Vector3(0, 0, 0);
    public hppos: Vector3 = new Vector3(0, 0, 0);
    public hp!: number;
    public direct!: number;
    public quar!: Quaternion;

    constructor(id: number, assets: { mesh: any; }, scene: Scene) {
        super("player" + id, scene);
        this.pid = id;
        this.scene = scene;

        this.mesh = assets.mesh!.clone();
        this.mesh.parent = this;

        this.hpMesh = MeshBuilder.CreateBox("hpbar" + id, { size: 1 });
        this.hpMesh.scaling = new Vector3(1, 0.1, 0.1);
        this.hpMesh.position.y += 2;
        this.hpMesh.parent = this.mesh;

        this.scene.registerBeforeRender(() => {
            this.mesh.position = new Vector3(
                Scalar.Lerp(this.mesh.position.x, this.pos.x, 0.2),
                0,//this.mesh.position.y,
                Scalar.Lerp(this.mesh.position.z, this.pos.z, 0.2),
            );
        });

        this.pos = this.mesh.position;
    }

    public Destroy() {
        this.mesh.dispose();
        this.scene.removeMesh(this.mesh, true);
    }

    public Update(x: number, z: number, hp: number, direct: number) {
        this.pos.x = x;
        this.pos.y = 0;
        this.pos.z = z;

        this.hp = hp;
        this.direct = direct;

        this.hpMesh.scaling.x = this.hp / 100;

        this.mesh.lookAt(new Vector3(
            this.pos.x + 10 * Math.sin(this.direct * Math.PI / 180),
            0,
            this.pos.z + 10 * Math.cos(this.direct * Math.PI / 180)
        ));

    }

    public UpdateMesh(x: number, z: number) {
        this.mesh.position.x = x;
        this.mesh.position.z = z;
    }


}