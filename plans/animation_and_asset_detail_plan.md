# Animation & Asset Detail System Plan

[Overview]
To achieve the authentic, bustling atmosphere of *The Settlers 4*, the game requires high-fidelity interactions between settlers and their workplaces. Buildings are not just static boxes; they have specific interaction points (doors, work areas, drop-off zones), and workers follow detailed state machines with profession-specific animations.

[Key Mechanics]
- **Building Sockets (Nodes)**: 
  - **Entry/Exit (Door)**: Where the worker spawns or rests.
  - **Input Zone**: Where carriers drop raw materials, and the worker picks them up.
  - **Output Zone**: Where the worker places finished goods for carriers to collect.
  - **Work Node(s)**: Specific coordinates outside or inside the building where the work animation plays (e.g., the stump at a Woodcutter's hut, the anvil at a Weaponsmith).
- **Worker State Machine**: 
  - *Resting* (inside building) -> *Walk to Input* -> *Pickup Animation* -> *Walk to Work Node* -> *Work Animation* (loop) -> *Walk to Output* -> *Drop Animation* -> *Walk to Door*.
- **Asset Requirements**:
  - **Buildings**: Must be modeled with clear visual doors, input/output stacks, and thematic work areas. 3D models (glTF) should include empty nodes/transforms to programmatically define these coordinates.
  - **Settlers**: Base rig requires standard animations (Idle, Walk, Carry). Specialized units require unique loops (Sawing, Hammering, Harvesting, Fishing).

[Implementation Steps]
1. Update `BuildingData` to include local offsets for `doorNode`, `inputNode`, `outputNode`, and `workNode`.
2. Enhance `WorkerAI` with a multi-step production cycle state machine that physically paths the unit between these nodes.
3. Integrate the Babylon.js Animation Group system to transition cleanly between `Walk`, `Carry`, and `Work` animations based on the AI state.
4. Update the generative 3D asset pipeline to ensure building models are exported with standardized node structures.
5. Implement dynamic rendering of resource item meshes physically stacking at the `inputNode` and `outputNode`.

[Success Criteria]
- A Sawyer physically walks out of the Sawmill, picks up a log from the input pile, carries it to the saw blade, plays a sawing animation, and drops a plank at the output pile.
- Animations blend smoothly without popping or sliding.