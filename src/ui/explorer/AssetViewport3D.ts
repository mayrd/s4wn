// Module: AssetViewport3D

// Babylon.js 3D viewport for asset preview and control
class AssetViewport3D {
  private static instance: AssetViewport3D | null = null;
  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;
  private activeCamera: BABYLON.ArcRotateCamera;
  private selectedEntity: string = "";
  private animationGroup: BABYLON.AnimationGroup | null = null;

  private constructor() {}

  public static getInstance(engine: BABYLON.Engine): AssetViewport3D {
    if (!AssetViewport3D.instance) {
      AssetViewport3D.instance = new AssetViewport3D();
      AssetViewport3D.instance.init(engine);
    }
    return AssetViewport3D.instance;
  }

  private init(engine: BABYLON.Engine): void {
    this.engine = engine;
    this.scene = new BABYLON.Scene(engine);

    // Setup ArcRotateCamera with default config
    this.activeCamera = new BABYLON.ArcRotateCamera(
      "explorerCamera",
      Math.PI / 4, Math.PI / 3,
      10,
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );
    this.scene.activeCamera = this.activeCamera;

    // Base lighting
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), this.scene);
    hemiLight.specular = BABYLON.Color3.Black();
    hemiLight.groundColor = BABYLON.Color3.Gray();

    // Environment toggles
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
    ground.material = new BABYLON.GridMaterial("grid", this.scene);
    ground.position.y = 0;
  }

  // Future methods: AnimationPlayer integration, texture maps display
}

// Expose module
export { AssetViewport3D };