//! S4WN Network Module
//!
//! Phase 3 — Multiplayer: WebSocket client-server networking.
//!
//! ## Design
//!
//! The network module provides:
//! 1. **Message types**: Serializable game actions (GameStateSync, UnitSpawn,
//!    BuildingPlace, PlayerInput, etc.)
//! 2. **NetworkManager**: Stub for WebSocket connection with send/receive.
//!    Full WebSocket integration requires wasm-bindgen + web-sys (browser).
//! 3. **Serialization**: All messages use serde for JSON encoding.
//!
//! ## Architecture
//!
//! ```text
//!  Browser ◄──WebSocket──► Game Server (future)
//!    │                         │
//!  NetworkManager           GameState
//!    │                         │
//!  send(msg) ──────────►  apply(msg)
//!  receive()  ◄────────  broadcast(state)
//! ```
//!
//! ## Message Flow
//! - Client sends PlayerInput messages (move unit, place building, etc.)
//! - Server validates and applies to authoritative GameState
//! - Server broadcasts GameStateSync to all connected clients
//! - Clients interpolate between state snapshots

use serde::{Deserialize, Serialize};

// ── Message Types ────────────────────────────────────────────────────────────

/// All network messages that can be sent/received.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NetworkMessage {
    /// Full game state snapshot (server → client)
    GameStateSync(GameStateSnapshot),
    /// Player places a building (client → server)
    BuildingPlace {
        building_type: u8,
        x: usize,
        y: usize,
        player_id: u32,
    },
    /// Player spawns a unit (client → server)
    UnitSpawn {
        unit_kind: u8,
        x: f32,
        y: f32,
        player_id: u32,
    },
    /// Player moves a unit (client → server)
    UnitMove {
        unit_id: u32,
        target_x: usize,
        target_y: usize,
        player_id: u32,
    },
    /// Player attacks (client → server)
    UnitAttack {
        attacker_id: u32,
        target_id: u32,
        player_id: u32,
    },
    /// Player joins the game (client → server)
    PlayerJoin {
        name: String,
    },
    /// Player leaves the game (client → server or server → client)
    PlayerLeave {
        player_id: u32,
    },
    /// Chat message (bidirectional)
    Chat {
        player_id: u32,
        text: String,
    },
    /// Ping/pong for latency measurement
    Ping {
        timestamp: u64,
    },
    Pong {
        timestamp: u64,
    },
    /// Server assigns player ID on connect
    Welcome {
        player_id: u32,
        tick_rate: u32,
    },
}

/// A snapshot of the game state for synchronization.
/// In a real implementation, this would be a delta-compressed
/// representation. For now, it's a simplified full state.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GameStateSnapshot {
    /// Current server tick
    pub tick: u64,
    /// Player states
    pub players: Vec<PlayerState>,
    /// Building states
    pub buildings: Vec<BuildingState>,
    /// Unit states
    pub units: Vec<UnitState>,
}

/// Player state in a snapshot.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlayerState {
    pub id: u32,
    pub name: String,
    /// Resource amounts (simplified: just 5 key resources)
    pub resources: [u32; 5],
}

/// Building state in a snapshot.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BuildingState {
    pub id: u32,
    pub kind: u8,
    pub x: usize,
    pub y: usize,
    pub construction: f32,
    pub owner_id: u32,
}

/// Unit state in a snapshot.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UnitState {
    pub id: u32,
    pub kind: u8,
    pub x: f32,
    pub y: f32,
    pub hp: u32,
    pub owner_id: u32,
}

// ── Network Manager ─────────────────────────────────────────────────────────

/// Connection state for the network manager.
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Error(String),
}

/// Manages the network connection and message queue.
///
/// This is a stub implementation. In the browser, it would use
/// wasm-bindgen to wrap WebSocket. On the server, it would use
/// tokio-tungstenite or similar.
#[derive(Debug, Clone)]
pub struct NetworkManager {
    state: ConnectionState,
    /// Outgoing message queue (to be sent over the wire)
    outgoing: Vec<NetworkMessage>,
    /// Incoming message queue (received from the wire)
    incoming: Vec<NetworkMessage>,
    /// Player ID assigned by the server
    player_id: Option<u32>,
    /// Server tick rate
    tick_rate: u32,
}

impl NetworkManager {
    /// Create a new disconnected network manager.
    pub fn new() -> Self {
        NetworkManager {
            state: ConnectionState::Disconnected,
            outgoing: Vec::new(),
            incoming: Vec::new(),
            player_id: None,
            tick_rate: 10, // default 10 TPS
        }
    }

    /// Get the current connection state.
    pub fn state(&self) -> &ConnectionState {
        &self.state
    }

    /// Check if connected.
    pub fn is_connected(&self) -> bool {
        self.state == ConnectionState::Connected
    }

    /// Connect to a server (stub — in browser would use WebSocket).
    pub fn connect(&mut self, _url: &str) {
        self.state = ConnectionState::Connecting;
        // In a real implementation:
        // let ws = WebSocket::new(url).unwrap();
        // ws.set_onmessage(callback);
        // For now, simulate successful connection
        self.state = ConnectionState::Connected;
    }

    /// Disconnect from the server.
    pub fn disconnect(&mut self) {
        self.state = ConnectionState::Disconnected;
        self.player_id = None;
    }

    /// Send a message to the server.
    pub fn send(&mut self, msg: NetworkMessage) {
        if self.state == ConnectionState::Connected {
            self.outgoing.push(msg);
        }
    }

    /// Receive all pending messages from the server.
    /// Returns and clears the incoming message queue.
    pub fn receive(&mut self) -> Vec<NetworkMessage> {
        std::mem::take(&mut self.incoming)
    }

    /// Get the outgoing message queue (for actual network send).
    /// Returns and clears the outgoing queue.
    pub fn drain_outgoing(&mut self) -> Vec<NetworkMessage> {
        std::mem::take(&mut self.outgoing)
    }

    /// Simulate receiving a message (for testing / local mode).
    pub fn inject_incoming(&mut self, msg: NetworkMessage) {
        self.incoming.push(msg);
    }

    /// Get the assigned player ID.
    pub fn player_id(&self) -> Option<u32> {
        self.player_id
    }

    /// Set the player ID (called on Welcome message).
    pub fn set_player_id(&mut self, id: u32) {
        self.player_id = Some(id);
    }

    /// Get the server tick rate.
    pub fn tick_rate(&self) -> u32 {
        self.tick_rate
    }

    /// Set the server tick rate.
    pub fn set_tick_rate(&mut self, rate: u32) {
        self.tick_rate = rate;
    }

    /// Get the number of pending outgoing messages.
    pub fn outgoing_count(&self) -> usize {
        self.outgoing.len()
    }

    /// Get the number of pending incoming messages.
    pub fn incoming_count(&self) -> usize {
        self.incoming.len()
    }

    /// Process a Welcome message from the server.
    fn handle_welcome(&mut self, player_id: u32, tick_rate: u32) {
        self.player_id = Some(player_id);
        self.tick_rate = tick_rate;
        self.state = ConnectionState::Connected;
    }

    /// Process an incoming message (auto-handle system messages).
    pub fn process_message(&mut self, msg: NetworkMessage) -> bool {
        match &msg {
            NetworkMessage::Welcome { player_id, tick_rate } => {
                self.handle_welcome(*player_id, *tick_rate);
                true // handled, don't add to incoming
            }
            NetworkMessage::Ping { timestamp } => {
                // Auto-respond with Pong
                self.send(NetworkMessage::Pong { timestamp: *timestamp });
                true // handled
            }
            _ => {
                // Regular message — add to incoming queue
                self.incoming.push(msg);
                false
            }
        }
    }
}

impl Default for NetworkManager {
    fn default() -> Self {
        Self::new()
    }
}

// ── Serialization Helpers ────────────────────────────────────────────────────

/// Serialize a message to JSON string.
pub fn serialize(msg: &NetworkMessage) -> Result<String, String> {
    serde_json::to_string(msg).map_err(|e| format!("serialize error: {}", e))
}

/// Deserialize a message from JSON string.
pub fn deserialize(text: &str) -> Result<NetworkMessage, String> {
    serde_json::from_str(text).map_err(|e| format!("deserialize error: {}", e))
}

// ── Client State Interpolation ────────────────────────────────────────────────

/// Client-side state interpolator for smooth rendering between server ticks.
///
/// The server broadcasts `GameStateSnapshot` messages at a fixed tick rate
/// (typically 10 TPS). The renderer runs at 60 FPS. `ClientInterpolator`
/// stores the two most recent snapshots and provides interpolated state
/// for smooth visual transitions between ticks.
#[derive(Debug, Clone)]
pub struct ClientInterpolator {
    /// Previous snapshot (tick N-1)
    previous: Option<GameStateSnapshot>,
    /// Current snapshot (tick N)
    current: Option<GameStateSnapshot>,
    /// Tick duration in seconds (e.g., 0.1 for 10 TPS)
    tick_duration: f64,
    /// Time the current snapshot was received (monotonic seconds)
    current_received_at: Option<f64>,
}

impl ClientInterpolator {
    /// Create a new interpolator with the given tick duration.
    pub fn new(tick_duration: f64) -> Self {
        ClientInterpolator {
            previous: None,
            current: None,
            tick_duration,
            current_received_at: None,
        }
    }

    /// Push a new snapshot received from the server.
    pub fn push_snapshot(&mut self, snapshot: GameStateSnapshot, received_at: f64) {
        self.previous = self.current.take();
        self.current = Some(snapshot);
        self.current_received_at = Some(received_at);
    }

    /// Whether we have enough data to interpolate (two distinct snapshots).
    pub fn can_interpolate(&self) -> bool {
        self.previous.is_some() && self.current.is_some()
    }

    /// Whether we have at least one snapshot (first sync received).
    pub fn has_state(&self) -> bool {
        self.current.is_some()
    }

    /// Compute the interpolation alpha in [0.0, 1.0].
    pub fn interpolation_alpha(&self, now: f64) -> f64 {
        match self.current_received_at {
            Some(t) => {
                let elapsed = now - t;
                (elapsed / self.tick_duration).clamp(0.0, 1.0)
            }
            None => 0.0,
        }
    }

    /// Interpolate a unit's position between previous and current snapshots.
    pub fn interpolate_unit_position(&self, unit_id: u32, alpha: f64) -> Option<(f32, f32)> {
        let prev = self.previous.as_ref()?;
        let curr = self.current.as_ref()?;
        let prev_unit = prev.units.iter().find(|u| u.id == unit_id);
        let curr_unit = curr.units.iter().find(|u| u.id == unit_id);
        match (prev_unit, curr_unit) {
            (Some(p), Some(c)) => {
                Some((p.x + (c.x - p.x) * alpha as f32, p.y + (c.y - p.y) * alpha as f32))
            }
            (None, Some(c)) => Some((c.x, c.y)),
            (Some(p), None) => Some((p.x, p.y)),
            (None, None) => None,
        }
    }

    /// Get the current snapshot.
    pub fn current_snapshot(&self) -> Option<&GameStateSnapshot> {
        self.current.as_ref()
    }

    /// Get the previous snapshot.
    pub fn previous_snapshot(&self) -> Option<&GameStateSnapshot> {
        self.previous.as_ref()
    }

    /// Reset the interpolator (e.g., on disconnect).
    pub fn reset(&mut self) {
        self.previous = None;
        self.current = None;
        self.current_received_at = None;
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Message Serialization ──

    #[test]
    fn test_serialize_building_place() {
        let msg = NetworkMessage::BuildingPlace {
            building_type: 10, // Farm
            x: 5,
            y: 3,
            player_id: 1,
        };
        let json = serialize(&msg).unwrap();
        assert!(json.contains("\"building_type\":10"));
        assert!(json.contains("\"x\":5"));
        assert!(json.contains("\"player_id\":1"));
    }

    #[test]
    fn test_deserialize_building_place() {
        let json = r#"{"BuildingPlace":{"building_type":10,"x":5,"y":3,"player_id":1}}"#;
        let msg = deserialize(json).unwrap();
        match msg {
            NetworkMessage::BuildingPlace { building_type, x, y, player_id } => {
                assert_eq!(building_type, 10);
                assert_eq!(x, 5);
                assert_eq!(y, 3);
                assert_eq!(player_id, 1);
            }
            _ => panic!("Wrong message type"),
        }
    }

    #[test]
    fn test_serialize_unit_spawn() {
        let msg = NetworkMessage::UnitSpawn {
            unit_kind: 0, // Worker
            x: 5.5,
            y: 3.5,
            player_id: 1,
        };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_unit_move() {
        let msg = NetworkMessage::UnitMove {
            unit_id: 42,
            target_x: 10,
            target_y: 20,
            player_id: 1,
        };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_unit_attack() {
        let msg = NetworkMessage::UnitAttack {
            attacker_id: 1,
            target_id: 2,
            player_id: 1,
        };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_player_join() {
        let msg = NetworkMessage::PlayerJoin {
            name: "Alice".to_string(),
        };
        let json = serialize(&msg).unwrap();
        assert!(json.contains("Alice"));
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_player_leave() {
        let msg = NetworkMessage::PlayerLeave { player_id: 1 };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_chat() {
        let msg = NetworkMessage::Chat {
            player_id: 1,
            text: "Hello world!".to_string(),
        };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_ping_pong() {
        let ping = NetworkMessage::Ping { timestamp: 12345 };
        let json = serialize(&ping).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(ping, deserialized);

        let pong = NetworkMessage::Pong { timestamp: 12345 };
        let json2 = serialize(&pong).unwrap();
        let deserialized2 = deserialize(&json2).unwrap();
        assert_eq!(pong, deserialized2);
    }

    #[test]
    fn test_serialize_welcome() {
        let msg = NetworkMessage::Welcome {
            player_id: 42,
            tick_rate: 10,
        };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_game_state_snapshot() {
        let snapshot = GameStateSnapshot {
            tick: 100,
            players: vec![PlayerState {
                id: 1,
                name: "Alice".to_string(),
                resources: [100, 50, 30, 20, 10],
            }],
            buildings: vec![BuildingState {
                id: 1,
                kind: 10,
                x: 5,
                y: 3,
                construction: 1.0,
                owner_id: 1,
            }],
            units: vec![UnitState {
                id: 1,
                kind: 0,
                x: 5.5,
                y: 3.5,
                hp: 50,
                owner_id: 1,
            }],
        };
        let msg = NetworkMessage::GameStateSync(snapshot);
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_deserialize_invalid_json() {
        let result = deserialize("not valid json");
        assert!(result.is_err());
    }

    // ── Network Manager ──

    #[test]
    fn test_network_manager_new() {
        let mgr = NetworkManager::new();
        assert_eq!(mgr.state(), &ConnectionState::Disconnected);
        assert!(!mgr.is_connected());
        assert_eq!(mgr.player_id(), None);
        assert_eq!(mgr.tick_rate(), 10);
    }

    #[test]
    fn test_network_manager_connect() {
        let mut mgr = NetworkManager::new();
        mgr.connect("ws://localhost:8080");
        assert_eq!(mgr.state(), &ConnectionState::Connected);
        assert!(mgr.is_connected());
    }

    #[test]
    fn test_network_manager_disconnect() {
        let mut mgr = NetworkManager::new();
        mgr.connect("ws://localhost:8080");
        mgr.disconnect();
        assert_eq!(mgr.state(), &ConnectionState::Disconnected);
        assert_eq!(mgr.player_id(), None);
    }

    #[test]
    fn test_network_manager_send() {
        let mut mgr = NetworkManager::new();
        mgr.connect("ws://localhost:8080");
        mgr.send(NetworkMessage::PlayerJoin { name: "Bob".to_string() });
        assert_eq!(mgr.outgoing_count(), 1);
    }

    #[test]
    fn test_network_manager_send_when_disconnected() {
        let mut mgr = NetworkManager::new();
        mgr.send(NetworkMessage::PlayerJoin { name: "Bob".to_string() });
        assert_eq!(mgr.outgoing_count(), 0); // dropped
    }

    #[test]
    fn test_network_manager_drain_outgoing() {
        let mut mgr = NetworkManager::new();
        mgr.connect("ws://localhost:8080");
        mgr.send(NetworkMessage::Ping { timestamp: 1 });
        mgr.send(NetworkMessage::Ping { timestamp: 2 });
        assert_eq!(mgr.outgoing_count(), 2);

        let messages = mgr.drain_outgoing();
        assert_eq!(messages.len(), 2);
        assert_eq!(mgr.outgoing_count(), 0);
    }

    #[test]
    fn test_network_manager_inject_and_receive() {
        let mut mgr = NetworkManager::new();
        let msg = NetworkMessage::Chat {
            player_id: 1,
            text: "test".to_string(),
        };
        mgr.inject_incoming(msg.clone());
        assert_eq!(mgr.incoming_count(), 1);

        let received = mgr.receive();
        assert_eq!(received.len(), 1);
        assert_eq!(received[0], msg);
        assert_eq!(mgr.incoming_count(), 0);
    }

    #[test]
    fn test_network_manager_process_welcome() {
        let mut mgr = NetworkManager::new();
        let handled = mgr.process_message(NetworkMessage::Welcome {
            player_id: 7,
            tick_rate: 20,
        });
        assert!(handled);
        assert_eq!(mgr.player_id(), Some(7));
        assert_eq!(mgr.tick_rate(), 20);
        assert_eq!(mgr.state(), &ConnectionState::Connected);
    }

    #[test]
    fn test_network_manager_process_ping() {
        let mut mgr = NetworkManager::new();
        mgr.connect("ws://localhost:8080");
        let handled = mgr.process_message(NetworkMessage::Ping { timestamp: 999 });
        assert!(handled);
        // Should have auto-sent a Pong
        assert_eq!(mgr.outgoing_count(), 1);
        let outgoing = mgr.drain_outgoing();
        assert_eq!(outgoing[0], NetworkMessage::Pong { timestamp: 999 });
    }

    #[test]
    fn test_network_manager_process_regular_message() {
        let mut mgr = NetworkManager::new();
        let msg = NetworkMessage::PlayerJoin { name: "Eve".to_string() };
        let handled = mgr.process_message(msg.clone());
        assert!(!handled); // not auto-handled
        assert_eq!(mgr.incoming_count(), 1);
    }

    #[test]
    fn test_network_manager_set_player_id() {
        let mut mgr = NetworkManager::new();
        mgr.set_player_id(42);
        assert_eq!(mgr.player_id(), Some(42));
    }

    #[test]
    fn test_network_manager_set_tick_rate() {
        let mut mgr = NetworkManager::new();
        mgr.set_tick_rate(20);
        assert_eq!(mgr.tick_rate(), 20);
    }

    // ── Client Interpolator ──

    fn test_snap(tick: u64, units: Vec<(u32, f32, f32)>) -> GameStateSnapshot {
        GameStateSnapshot {
            tick,
            players: vec![],
            buildings: vec![],
            units: units
                .into_iter()
                .map(|(id, x, y)| UnitState {
                    id,
                    kind: 0,
                    x,
                    y,
                    hp: 100,
                    owner_id: 0,
                })
                .collect(),
        }
    }

    #[test]
    fn test_interpolator_initial_state() {
        let interp = ClientInterpolator::new(0.1);
        assert!(!interp.can_interpolate());
        assert!(!interp.has_state());
        assert_eq!(interp.interpolation_alpha(0.0), 0.0);
    }

    #[test]
    fn test_interpolator_first_snapshot() {
        let mut interp = ClientInterpolator::new(0.1);
        interp.push_snapshot(test_snap(0, vec![(1, 0.0, 0.0)]), 0.0);
        assert!(interp.has_state());
        assert!(!interp.can_interpolate());
        assert_eq!(interp.interpolation_alpha(0.05), 0.5);
    }

    #[test]
    fn test_interpolator_two_snapshots() {
        let mut interp = ClientInterpolator::new(0.1);
        interp.push_snapshot(test_snap(0, vec![(1, 0.0, 0.0)]), 0.0);
        interp.push_snapshot(test_snap(1, vec![(1, 10.0, 0.0)]), 0.1);
        assert!(interp.can_interpolate());
        assert_eq!(interp.interpolation_alpha(0.1), 0.0);
        assert!((interp.interpolation_alpha(0.15) - 0.5).abs() < 0.01);
        assert_eq!(interp.interpolation_alpha(0.2), 1.0);
        assert_eq!(interp.interpolation_alpha(0.5), 1.0);
    }

    #[test]
    fn test_interpolate_unit_moving() {
        let mut interp = ClientInterpolator::new(0.1);
        interp.push_snapshot(test_snap(0, vec![(1, 0.0, 0.0)]), 0.0);
        interp.push_snapshot(test_snap(1, vec![(1, 10.0, 20.0)]), 0.1);
        let pos = interp.interpolate_unit_position(1, 0.0).unwrap();
        assert!((pos.0 - 0.0).abs() < 0.01);
        let pos = interp.interpolate_unit_position(1, 0.5).unwrap();
        assert!((pos.0 - 5.0).abs() < 0.01);
        assert!((pos.1 - 10.0).abs() < 0.01);
        let pos = interp.interpolate_unit_position(1, 1.0).unwrap();
        assert!((pos.0 - 10.0).abs() < 0.01);
        assert!((pos.1 - 20.0).abs() < 0.01);
    }

    #[test]
    fn test_interpolate_unit_spawned() {
        let mut interp = ClientInterpolator::new(0.1);
        interp.push_snapshot(test_snap(0, vec![]), 0.0);
        interp.push_snapshot(test_snap(1, vec![(42, 5.0, 5.0)]), 0.1);
        let pos = interp.interpolate_unit_position(42, 0.5).unwrap();
        assert!((pos.0 - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_interpolate_unit_died() {
        let mut interp = ClientInterpolator::new(0.1);
        interp.push_snapshot(test_snap(0, vec![(99, 3.0, 4.0)]), 0.0);
        interp.push_snapshot(test_snap(1, vec![]), 0.1);
        let pos = interp.interpolate_unit_position(99, 0.5).unwrap();
        assert!((pos.0 - 3.0).abs() < 0.01);
    }

    #[test]
    fn test_interpolator_reset() {
        let mut interp = ClientInterpolator::new(0.1);
        interp.push_snapshot(test_snap(0, vec![(1, 0.0, 0.0)]), 0.0);
        assert!(interp.has_state());
        interp.reset();
        assert!(!interp.has_state());
    }

    #[test]
    fn test_interpolator_snapshot_access() {
        let mut interp = ClientInterpolator::new(0.1);
        interp.push_snapshot(test_snap(0, vec![(1, 0.0, 0.0)]), 0.0);
        interp.push_snapshot(test_snap(1, vec![(2, 10.0, 0.0)]), 0.1);
        assert_eq!(interp.previous_snapshot().unwrap().tick, 0);
        assert_eq!(interp.current_snapshot().unwrap().tick, 1);
    }
}
