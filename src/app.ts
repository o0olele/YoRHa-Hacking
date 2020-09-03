import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import { OBJFileLoader } from "@babylonjs/loaders/OBJ";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, FreeCamera, Color4, StandardMaterial, Color3, PointLight, ShadowGenerator, Quaternion, Matrix, SceneLoader, InputBlock, CannonJSPlugin } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, Image, Rectangle, InputText, TextBlock, StackPanel } from "@babylonjs/gui";
import { Environment } from "./environment";
import { Player, EnemyMgr } from "./playerController";
import { PlayerInput } from "./inputController";
import { Web } from "./web";
import { Hud } from "./ui";

declare var RequestFullScreen: () => null;

enum State { START = 0, GAME = 1, LOSE = 2, CUTSCENE = 3 }

class App {
    // General Entire Application
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    //Game State Related
    public assets!: { mesh: Mesh; };
    private _input!: PlayerInput;
    private _environment!: Environment;
    private _player!: Player;
    private _eMgr!: EnemyMgr;

    //Scene - related
    private _state: number = 2;
    private _gamescene!: Scene;
    private _cutScene!: Scene;

    //GameUI - related
    private _ui!: Hud;

    //Web
    private _web!: Web;

    constructor() {
        this._canvas = this._createCanvas();

        // initialize babylon scene and engine
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        // init web
        this._web = new Web();
        this._web.HttpGetID();

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        this._main();
    }

    private _createCanvas(): HTMLCanvasElement {

        //Commented out for development
        document.documentElement.style["overflow"] = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.width = "100%";
        document.documentElement.style.height = "100%";
        document.documentElement.style.margin = "0";
        document.documentElement.style.padding = "0";
        document.body.style.overflow = "hidden";
        document.body.style.width = "100%";
        document.body.style.height = "100%";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        //create the canvas html element and attach it to the webpage
        this._canvas = document.createElement("canvas");
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.id = "gameCanvas";
        document.body.appendChild(this._canvas);

        return this._canvas;
    }

    private async _main(): Promise<void> {
        await this._goToStart();

        // Register a render loop to repeatedly render the scene
        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                    this._scene.render();
                    break;
                case State.CUTSCENE:
                    this._scene.render();
                    break;
                case State.GAME:
                    this._scene.render();
                    if (this._web.IsGameEnd())
                        this._goToLose();
                    if (this._web.GetDie()) {
                        this._ui.ShowYouDie();
                        this._web.ResetDie();
                    }
                    break;
                case State.LOSE:
                    this._scene.render();
                    break;
                default: break;
            }
        });

        //resize if the screen is resized/rotated
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

    private async _goToStart() {
        this._engine.displayLoadingUI();

        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(137 / 255, 124 / 255, 108 / 255, 0.8);
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        //create a fullscreen ui for all of our GUI elements
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        guiMenu.idealHeight = 720; //fit our fullscreen ui to this height

        const imageRect = new Rectangle("titleContainer");
        imageRect.width = 0.8;
        imageRect.thickness = 0;
        guiMenu.addControl(imageRect);

        const startbg = new Image("startbg", "images/logo.png");
        startbg.top = "-100px";
        startbg.autoScale = true;
        imageRect.addControl(startbg);

        const buttonRect = new Rectangle("buttonContainer");
        buttonRect.width = 0.8;
        buttonRect.thickness = 0;
        guiMenu.addControl(buttonRect);

        //create a simple button
        const startBtn = Button.CreateSimpleButton("start", "PLAY");
        startBtn.width = 0.3;
        startBtn.height = "40px";
        startBtn.color = "white";
        startBtn.top = "-200px";
        startBtn.thickness = 1;
        startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        buttonRect.addControl(startBtn);

        const title = new InputText("name", "yorha");
        title.width = 0.3;
        title.height = "40px";
        title.color = "white";
        title.top = "-250px";
        title.focusedBackground = startBtn.background;
        title.background = startBtn.background;
        title.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        buttonRect.addControl(title);

        const changeBtn = Button.CreateImageOnlyButton("refresh", "images/refresh.png");
        changeBtn.image!.scaleX = 0.5;
        changeBtn.image!.scaleY = 0.5;
        changeBtn.width = "40px";
        changeBtn.height = "40px";
        changeBtn.color = "white";
        changeBtn.left = "12%";
        changeBtn.top = "-250px";
        changeBtn.thickness = 0;
        changeBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        buttonRect.addControl(changeBtn);

        //this handles interactions with the start button attached to the scene
        startBtn.onPointerDownObservable.add(() => {
            this._goToCutScene();
            scene.detachControl(); //observables disabled
        });

        let isMobile = false;
        //--MOBILE--
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            isMobile = true;
            //popup for mobile to rotate screen
            if (window.orientation != 90 && window.orientation != -90) {
                const rect1 = new Rectangle();
                rect1.height = 1;
                rect1.width = 1;
                rect1.verticalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
                rect1.horizontalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
                rect1.background = "white";
                guiMenu.addControl(rect1);

                const rect = new Rectangle();
                rect.height = 1;
                rect.width = 0.8;
                rect.top = "-100px";
                rect.verticalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
                rect.horizontalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
                rect.color = "whites";
                guiMenu.addControl(rect);

                const stackPanel = new StackPanel();
                stackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
                rect.addControl(stackPanel);

                //image
                const image = new Image("rotate", "./images/rotate.png")
                image.autoScale = false;
                image.width = 0.6;
                image.height = 0.2;
                image.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
                image.rotation = Math.PI / 2;
                rect.addControl(image);

                //alert message
                const alert = new TextBlock("alert", "For the best experience, please rotate your device");
                alert.fontSize = "16px";
                alert.color = "black";
                alert.resizeToFit = true;
                alert.textWrapping = true;
                stackPanel.addControl(alert);

                onorientationchange = () => {
                    switch (window.orientation) {
                        case -90:
                        case 90:
                            guiMenu.removeControl(rect);
                            guiMenu.removeControl(rect1);

                            startBtn.isHitTestVisible = true;
                            this._engine.enterFullscreen(true);
                            break;
                        default:
                            guiMenu.addControl(rect);
                            guiMenu.addControl(rect1);
                    };
                }
            }
        }

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();
        //lastly set the current state to the start state and set the scene to the start scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;
    }

    private async _goToCutScene(): Promise<void> {
        this._engine.displayLoadingUI();

        //--SETUP SCENE--
        //dont detect any inputs from this ui while the game is loading
        this._scene.detachControl();
        this._cutScene = new Scene(this._engine);
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), this._cutScene);
        camera.setTarget(Vector3.Zero());
        this._cutScene.clearColor = new Color4(0, 0, 0, 1);

        //--GUI--
        const cutScene = AdvancedDynamicTexture.CreateFullscreenUI("cutscene");

        //--PROGRESS DIALOGUE--
        const next = Button.CreateSimpleButton("next", "NEXT");
        next.color = "white";
        next.thickness = 0;
        next.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        next.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        next.width = "64px";
        next.height = "64px";
        next.top = "-3%";
        next.left = "-12%";
        cutScene.addControl(next);

        next.onPointerUpObservable.add(() => {
            this._web.HttpGetRoom();
            this._goToGame();
        })

        //--WHEN SCENE IS FINISHED LOADING--
        await this._cutScene.whenReadyAsync();
        this._engine.hideLoadingUI();
        this._scene.dispose();
        this._state = State.CUTSCENE;
        this._scene = this._cutScene;

        //--START LOADING AND SETTING UP THE GAME DURING THIS SCENE--
        var finishedLoading = false;
        await this._setUpGame().then(res => {
            finishedLoading = true;
        });
    }

    private async _setUpGame() {
        let scene = new Scene(this._engine);
        this._gamescene = scene;

        //--CREATE ENVIRONMENT--
        const environment = new Environment(scene);
        this._environment = environment;
        await this._environment.load(); //environment
        await this._loadCharacterAssets(scene);
    }

    private async _loadCharacterAssets(scene: Scene) {

        async function loadCharacter() {

            //collision mesh
            const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
            outer.isVisible = false;
            outer.isPickable = false;
            outer.checkCollisions = true;

            //move origin of box collider to the bottom of the mesh (to match player mesh)
            outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))
            //for collisions
            outer.ellipsoid = new Vector3(1, 1.5, 1);
            outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

            outer.rotationQuaternion = new Quaternion(0, 1, 0, 0); // rotate the player mesh 180 since we want to see the back of the player

            //--IMPORTING MESH--
            return SceneLoader.ImportMeshAsync(null, "./models/", "nier.obj", scene).then((result) => {
                const root = result.meshes[0];
                result.meshes.forEach(element => {
                    element.parent = outer
                    element.isPickable = false;
                    element.getChildMeshes().forEach(m => {
                        m.isPickable = false;
                    })
                });

                //return the mesh and animations
                return {
                    mesh: outer as Mesh,
                    animationGroups: result.animationGroups
                }
            });
        }

        return loadCharacter().then(assets => {
            this.assets = assets;
        })

    }

    private async _initializeGameAsync(scene: Scene): Promise<void> {
        //temporary light to light the entire scene
        var light0 = new HemisphericLight("HemiLight", new Vector3(0, 1, 0), scene);

        //Create the player
        this._player = new Player(this.assets, scene, this._input);
        const camera = this._player.activatePlayerCamera();

        this._eMgr = new EnemyMgr(this.assets, scene);

        this._web.UpdateP(this._eMgr, this._player, this._environment);

        scene.registerBeforeRender(() => {
            this._ui.UpdateLeftTime(this._web.GetLeftTime());
        });
    }

    private async _goToGame() {
        //--SETUP SCENE--
        this._scene.detachControl();
        let scene = this._gamescene;
        scene.clearColor = new Color4(64 / 255, 62 / 255, 51 / 255, 1); // a color that fit the overall color scheme better

        //--GUI--
        const ui = new Hud(scene, this._web);
        this._ui = ui;

        scene.detachControl();

        //--INPUT--
        this._input = new PlayerInput(scene, this._ui); //detect keyboard/mobile inputs

        //primitive character and setting
        await this._initializeGameAsync(scene);

        //--WHEN SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        scene.getMeshByName("outer")!.position = new Vector3(0, 3, 0);
        //get rid of start scene, switch to gamescene and change states
        this._scene.dispose();
        this._state = State.GAME;
        this._scene = scene;
        this._engine.hideLoadingUI();
        //the game is ready, attach control back
        this._scene.attachControl();
    }

    private async _goToLose(): Promise<void> {
        this._engine.displayLoadingUI();

        //--SCENE SETUP--
        this._scene.detachControl();
        let scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        //--GUI--
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const mainBtn = Button.CreateSimpleButton("mainmenu", "MAIN MENU");
        mainBtn.width = 0.2;
        mainBtn.height = "40px";
        mainBtn.color = "white";
        guiMenu.addControl(mainBtn);

        const overText = new TextBlock("gameover", "Game Over");
        overText.width = 0.5;
        overText.fontSize = "48px";
        overText.color = "white";
        overText.height = "64px";
        overText.top = "-120px";
        overText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiMenu.addControl(overText);
        //this handles interactions with the start button attached to the scene
        mainBtn.onPointerUpObservable.add(() => {
            this._goToStart();
            this._web.CloseWS();
        });

        //--SCENE FINISHED LOADING--
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI(); //when the scene is ready, hide loading
        //lastly set the current state to the lose state and set the scene to the lose scene
        this._scene.dispose();
        this._scene = scene;
        this._state = State.LOSE;
        this._web.ResetGameState();
    }
}
new App();