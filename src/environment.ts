import { Scene, Mesh, Vector3, StandardMaterial, Color3, MeshBuilder, PhysicsImpostor, CannonJSPlugin } from "@babylonjs/core";

export class Environment {
    private _scene: Scene;
    private _groundW: number;
    private _groundH: number;

    constructor(scene: Scene) {
        this._scene = scene;

        var gravityVector = new Vector3(0, -9.81, 0);
        var physicsPlugin = new CannonJSPlugin();
        this._scene.enablePhysics(gravityVector, physicsPlugin);

        this._groundW = 10;
        this._groundH = 10;
    }

    public async load() {
        var ground = Mesh.CreateBox("ground", 5, this._scene);
        ground.scaling = new Vector3(this._groundW, .02, this._groundH);

        var groundMaterial = new StandardMaterial('groundMat', this._scene);
        groundMaterial.diffuseColor = Color3.FromInts(191, 183, 159);
        groundMaterial.specularColor = Color3.Black(); // matte

        ground.material = groundMaterial;

        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.9 }, this._scene);
    }

    public SetMap(id: number, size: number, pos: Vector3) {
        console.log(size, pos);
        var obstacle = MeshBuilder.CreateBox("obstacle" + id, { size: size }, this._scene);
        obstacle.position = new Vector3(pos.x / this._groundW, 0, pos.z / this._groundH);
    }
}