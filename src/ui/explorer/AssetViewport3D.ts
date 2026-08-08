// Module: AssetViewport3D
 
 // Babylon.js 3D viewport for asset preview and control
 import { Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, Engine } from '@babylonjs/core';
 
 class AssetViewport3D {
   private static instance: AssetViewport3D | null = null;
   private scene!: Scene;
   private activeCamera!: ArcRotateCamera;
 
   private constructor() {}
 
   public static getInstance(engine: Engine): AssetViewport3D {
     if (!AssetViewport3D.instance) {
       AssetViewport3D.instance = new AssetViewport3D();
       AssetViewport3D.instance.init(engine);
     }
     return AssetViewport3D.instance;
   }
 
   private init(engine: Engine): void {
     this.scene = new Scene(engine);
 
     // Setup ArcRotateCamera with default config
     this.activeCamera = new ArcRotateCamera(
       "explorerCamera",
       Math.PI / 4, Math.PI / 3,
       10,
       new Vector3(0, 1, 0),
       this.scene
     );
     this.scene.activeCamera = this.activeCamera;
 
     // Base lighting
     const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
     hemiLight.specular = Color3.Black();
     hemiLight.groundColor = Color3.Gray();
 
     // Environment toggles
     const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
     ground.material = new StandardMaterial("grid", this.scene);
     ground.position.y = 0;
   }
 
   // Future methods: AnimationPlayer integration, texture maps display
 }
 
 // Expose module
 export { AssetViewport3D };