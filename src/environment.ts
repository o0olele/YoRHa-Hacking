import { Scene, Mesh, Vector3, StandardMaterial, Color3 } from "@babylonjs/core";

export class Environment {
    private _scene: Scene;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public async load() {
        var ground = Mesh.CreateBox("ground", 5, this._scene);
        ground.scaling = new Vector3(10, .02, 10);

        var groundMaterial = new StandardMaterial('groundMat', this._scene);
        groundMaterial.diffuseColor = Color3.FromInts(166, 151, 138);
        groundMaterial.specularColor = Color3.Black(); // matte

        ground.material = groundMaterial;

    }
}