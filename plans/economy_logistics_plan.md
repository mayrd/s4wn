# Economy & Logistics System Plan

[Overview]
The Settlers 4 uses a free-roaming logistics system. There are no flags or roads. Goods are placed outside buildings in stacks. Carriers (idle settlers assigned to carrying duties) automatically identify demands and supplies, compute paths, and transport goods.

[Key Mechanics]
- **Demand/Supply Matching**: Buildings that produce goods register them as 'available'. Buildings that need inputs register 'demand'.
- **Carrier AI**: Idle settlers periodically scan for the closest high-priority demand and match it with the closest available supply.
- **Resource Stacks**: Goods can be stacked up to 8 per tile at Storage Yards, or individually outside producer/consumer buildings.
- **Specialized Transport**: Donkeys handle marketplace trade routes over land; trade ships handle maritime routes.

[Implementation Steps]
1. Define the `ResourceItem` entity (the physical 3D model of a good on the ground).
2. Enhance `EconomyManager` to maintain a bipartite graph of supplies and demands.
3. Update `WorkerAI` (or create `CarrierAI`) to match demands and walk to the supply, pick it up, and walk to the destination.
4. Implement animations for carriers holding items.
5. Create logic for `StorageYard` sorting and stacking limits.

[Success Criteria]
- A carrier successfully takes a log from a Woodcutter to a Sawmill.
- The system scales to 1000+ items without dropping below 60fps.