// S4WN Tutorial Campaign — "Siedler's Awakening"
// Step-by-step guided tutorial with story, objectives, and enemy AI.

window.S4WN_TUTORIAL = {
  // ── Campaign Story ─────────────────────────────────────────────────────────
  title: "Siedler's Awakening",
  subtitle: "A guided journey through the world of Siedler IV",
  intro: [
    "Welcome, young chieftain! Your tribe has arrived in a fertile valley.",
    "The land is rich with resources — forests, stone, and mountains full of ore.",
    "But darkness stirs in the far corner of the valley. An enemy outpost guards",
    "a Watchtower that overlooks the entire region.",
    "",
    "Your mission: Build a thriving settlement, forge weapons and tools,",
    "raise an army of 50 soldiers, and capture the enemy Watchtower.",
    "",
    "I will guide you every step of the way. Let's begin!"
  ],

  // ── Objectives (sequential) ────────────────────────────────────────────────
  objectives: [
    {
      id: "build_lumberjack",
      title: "🏚️ Build a Woodcutter's Hut (Holzfällerhütte)",
      instruction: "Select a Woodcutter's Hut from the building menu and place it\nnext to a forest. This will produce Wood — the foundation of your economy.",
      tip: "Place it near trees — the closer to forest tiles, the faster the production!",
      trigger: { building: "Woodcutter", min: 1 },
      complete_msg: "Excellent! Your Woodcutter's Hut is producing Wood. Wood is used in almost every building."
    },
    {
      id: "build_forester",
      title: "🌲 Build a Forester's Hut (Förster)",
      instruction: "Now build a Forester's Hut near the Woodcutter. The Forester\nplants new trees so you never run out of Wood.",
      tip: "Foresters plant trees on empty grass tiles around them — give them space!",
      trigger: { building: "Forester", min: 1 },
      complete_msg: "Sustainable forestry! The Forester keeps your Wood supply flowing forever."
    },
    {
      id: "build_sawmill",
      title: "🪚 Build a Sawmill (Sägewerk)",
      instruction: "Build a Sawmill. It converts raw Wood into Planks — a processed\ngood needed for larger buildings.",
      tip: "Keep the Sawmill close to your Woodcutter for efficient transport.",
      trigger: { building: "Sawmill", min: 1 },
      complete_msg: "Planks are now being produced! Most advanced buildings require Planks."
    },
    {
      id: "build_stonecutter",
      title: "🪨 Build a Stonecutter (Steinmetz)",
      instruction: "Place a Stonecutter near rocky terrain. Stone is essential for\nall construction — and you'll need lots of it.",
      tip: "Stone deposits appear as rocky patches on the ground.",
      trigger: { building: "Stonecutter", min: 1 },
      complete_msg: "Stone is flowing in! Together with Wood and Planks, you have the\nbasic building materials."
    },
    {
      id: "build_dwelling",
      title: "🏠 Build a Small Dwelling (Kleines Wohnhaus)",
      instruction: "You need more settlers to work in your buildings.\nBuild a Small Dwelling — it's the most basic housing.",
      tip: "More settlers = more workers = faster production!",
      trigger: { building: "SmallDwelling", min: 1 },
      complete_msg: "New settlers will soon arrive! Now let me explain housing options.",
      extra_info: [
        "🏠 Kleines Wohnhaus — 2 settlers, cheap (5 Wood, 3 Stone)",
        "🏡 Mittleres Wohnhaus — 4 settlers, moderate cost (8 Wood, 6 Stone, 3 Planks)",
        "🏰 Großes Wohnhaus — 8 settlers, expensive but efficient (12 Wood, 10 Stone, 8 Planks)",
        "",
        "Tip: Start with small dwellings. Upgrade to medium/large when you have surplus Planks."
      ]
    },
    {
      id: "territory_intro",
      title: "🗺️ Expand Your Territory",
      instruction: "Your territory (the green-bordered area) limits where you can build.\nThere are two ways to expand it:",
      tip: "Military buildings expand territory instantly. Pioneers expand it gradually.",
      trigger: { message_shown: true },
      complete_msg: "",
      extra_info: [
        "⚔️ Military Buildings: Watchtower (Wachturm) or Castle (Burg) — instantly",
        "    expand your territory border. Place them at the edge for maximum effect!",
        "",
        "🔨 Pioneers (Pioniere): Special settlers recruited from the Settler menu.",
        "    They carry a Tool and walk outside your territory to push border stones",
        "    outward, one tile at a time. Slower but precise."
      ]
    },
    {
      id: "recruit_pioneer",
      title: "🔨 Recruit a Pioneer (Pionier)",
      instruction: "Open the Settler menu and recruit a Pioneer. Pioneers need a Tool —\nmake sure you have Tools in your warehouse! Then send the Pioneer\nto walk outside your territory border to expand it.",
      tip: "Pioneers are recruited like regular settlers but appear with a shovel icon.",
      trigger: { unit: "Pioneer", min: 1 },
      complete_msg: "Great! Your Pioneer will now expand your territory. Watch the green border\ngrow as they work!"
    },
    {
      id: "recruit_geologist",
      title: "⛏️ Recruit a Geologist (Geologe)",
      instruction: "Now recruit a Geologist from the Settler menu. Geologists are\nspecialists who can find ore deposits hidden in mountains.",
      tip: "Send the Geologist toward the mountains — they'll automatically scan for ores!",
      trigger: { unit: "Geologist", min: 1 },
      complete_msg: "When a Geologist finds ore, a marker appears on the mountain. Now you\ncan build Mines there!",
      extra_info: [
        "⛏️ Ores found by Geologists: Iron Ore (for tools/weapons), Coal (fuel),",
        "    Gold (trade/treasure), Sulfur (special goods)", 
        "",
        "🔄 The production chain: Mine extracts ore → Smelter creates Iron Ingots →",
        "    → Toolsmith makes Tools → Weaponsmith makes Weapons",
        "",
        "🍞 But first: your workers need FOOD! Expand your food production."
      ]
    },
    {
      id: "build_food",
      title: "🌾 Build Food Production",
      instruction: "Your workers need food! Build at least:\n• A Farm (Getreidefarm) for Grain → Mill for Flour → Bakery for Bread\n• OR a Fishery (Fischerei) near water for Fish\n• OR a Hunter's Lodge (Jägerhütte) near forest for Meat",
      tip: "A Bakery chain (Farm + Mill + Bakery) produces Bread — the most efficient food!",
      trigger: { buildings: ["Farm", "Fishery", "HuntersLodge"], minTotal: 2 },
      complete_msg: "Your settlers are well-fed! Food keeps workers productive."
    },
    {
      id: "build_mine",
      title: "⛏️ Build a Mine",
      instruction: "Now build a Mine on the ore deposit your Geologist found.\nMines produce Iron Ore, Coal, Gold, and Sulfur.",
      tip: "You can only build a Mine on tiles where a Geologist has discovered ore!",
      trigger: { building: "Mine", min: 1 },
      complete_msg: "Raw ore is flowing! Now process it into useful goods."
    },
    {
      id: "build_smelter_toolsmith",
      title: "🔥 Build Smelter & Toolsmith",
      instruction: "Build a Smelter to convert Iron Ore into Iron Ingots.\nThen build a Toolsmith to craft Tools from Iron Ingots.",
      tip: "Place Smelter and Toolsmith close together — they work as a chain!",
      trigger: { buildings: ["Smelter", "Toolsmith"], minTotal: 2 },
      complete_msg: "Tools are being produced! Pioneers and Geologists need Tools, and\nWeapons require Tools as an ingredient."
    },
    {
      id: "build_weaponsmith",
      title: "⚔️ Build Weaponsmith (Waffenschmied)",
      instruction: "Build a Weaponsmith. It converts Iron Ingots + Tools into Weapons.\nWeapons are needed to train Soldiers!",
      tip: "One Weaponsmith can supply weapons for many soldiers.",
      trigger: { building: "Weaponsmith", min: 1 },
      complete_msg: "Weapons are now being forged! Time to build your army."
    },
    {
      id: "build_barracks",
      title: "🏕️ Build Barracks (Kaserne)",
      instruction: "Build a Barracks. This is where you train your Soldiers.\nStart recruiting — your goal is 50 Soldiers!",
      tip: "Each soldier costs 1 Weapon + 1 Bread (or other food). Keep production running!",
      trigger: { building: "Barracks", min: 1 },
      complete_msg: "The Barracks is ready! Start recruiting Soldiers now.",
      target: { unit: "Swordsman", count: 50 }
    },
  ],

  // ── Victory Condition ──────────────────────────────────────────────────────
  victory: {
    title: "🏆 Victory!",
    condition: "Capture the enemy Watchtower",
    instruction: "March your army to the northeast corner of the map. Defeat the\nenemy soldiers and capture their Watchtower to win!",
    trigger: { enemy_watchtower_captured: true },
    message: [
      "🎉 CONGRATULATIONS, Chieftain!",
      "",
      "You have led your tribe from a humble beginning to a mighty victory!",
      "You mastered:",
      "  ✅ Resource gathering (Wood, Stone)",
      "  ✅ Production chains (Planks, Tools, Weapons)",
      "  ✅ Food production (Bread, Fish, Meat)",
      "  ✅ Territory expansion (Pioneers, Watchtowers)",
      "  ✅ Special settlers (Pioneer, Geologist)",
      "  ✅ Military might (50 Soldiers!)",
      "",
      "The valley is yours. Your name will be remembered in Siedler legend.",
      "",
      "Ready for more? Try a full game on a larger map!"
    ]
  },

  // ── Map Layout Definition ──────────────────────────────────────────────────
  map: {
    size: 64,
    seed: 12345,
    // Player HQ position (center-south)
    hq_x: 32, hq_y: 48,
    // Key resource placements (override procedural generation)
    resources: [
      // Forest cluster south of HQ for wood
      { x: 28, y: 44, terrain: "Forest" },
      { x: 30, y: 43, terrain: "Forest" },
      { x: 32, y: 42, terrain: "Forest" },
      { x: 34, y: 43, terrain: "Forest" },
      { x: 36, y: 44, terrain: "Forest" },
      // Stone deposits near HQ
      { x: 38, y: 46, terrain: "Grass", resource: "Stone" },
      { x: 40, y: 48, terrain: "Grass", resource: "Stone" },
      // Mountains in the north with ore
      { x: 28, y: 20, terrain: "Mountain", resource: "Iron" },
      { x: 30, y: 18, terrain: "Mountain", resource: "Coal" },
      { x: 32, y: 19, terrain: "Mountain", resource: "Gold" },
      { x: 35, y: 21, terrain: "Mountain", resource: "Iron" },
      { x: 37, y: 19, terrain: "Mountain", resource: "Sulfur" },
      // Grassland for farming around center
      { x: 42, y: 40, terrain: "Grass", resource: "Grain" },
      { x: 44, y: 42, terrain: "Grass", resource: "Grain" },
      // Coast/lake for fishing (west)
      { x: 10, y: 20, terrain: "Water" },
      { x: 10, y: 22, terrain: "Water" },
      { x: 12, y: 20, terrain: "Water", resource: "Fish" },
    ],
    // Enemy placement (northeast corner)
    enemy: {
      type: "computer_passive",
      name: "Dark Legion Remnant",
      buildings: [
        { type: "Watchtower", x: 56, y: 8 },
      ],
      units: [
        { type: "Swordsman", x: 54, y: 9 },
        { type: "Swordsman", x: 55, y: 8 },
        { type: "Swordsman", x: 55, y: 10 },
        { type: "Swordsman", x: 56, y: 7 },
        { type: "Swordsman", x: 56, y: 11 },
        { type: "Swordsman", x: 57, y: 8 },
        { type: "Swordsman", x: 57, y: 10 },
        { type: "Swordsman", x: 58, y: 7 },
        { type: "Swordsman", x: 58, y: 9 },
        { type: "Swordsman", x: 58, y: 11 },
        { type: "Swordsman", x: 59, y: 8 },
        { type: "Swordsman", x: 59, y: 10 },
        { type: "Swordsman", x: 60, y: 7 },
        { type: "Swordsman", x: 60, y: 9 },
        { type: "Swordsman", x: 60, y: 11 },
        { type: "Swordsman", x: 54, y: 11 },
        { type: "Swordsman", x: 55, y: 12 },
        { type: "Swordsman", x: 57, y: 12 },
        { type: "Swordsman", x: 59, y: 12 },
        { type: "Swordsman", x: 61, y: 10 },
      ],
    },
  }
};
