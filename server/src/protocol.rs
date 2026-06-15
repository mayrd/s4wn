//! S4WN Game Server
//!
//! WebSocket-based multiplayer server with:
//! - Player connection management
//! - Game room (lobby) system
//! - Authoritative game state
//! - Message relay between players in the same room
//!
//! ## Protocol
//! All messages are JSON-encoded `NetworkMessage` values.
//! Clients send actions; server validates and broadcasts state.

use serde::{Deserialize, Serialize};

/// All network messages — must match engine/src/network.rs
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
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
    /// Player leaves the game
    PlayerLeave {
        player_id: u32,
    },
    /// Chat message (bidirectional)
    Chat {
        player_id: u32,
        text: String,
    },
    /// Ping/pong for latency measurement
    Ping { timestamp: u64 },
    Pong { timestamp: u64 },
    /// Server assigns player ID on connect
    Welcome {
        player_id: u32,
        tick_rate: u32,
    },
    /// Room list request / response
    RoomList {
        rooms: Vec<RoomInfo>,
    },
    /// Create a room
    RoomCreate {
        name: String,
        max_players: u32,
    },
    /// Join a room
    RoomJoin {
        room_id: String,
    },
    /// Leave a room
    RoomLeave,
    /// Room state update (server → client)
    RoomUpdate {
        room: RoomInfo,
    },
    /// Start game (host only)
    GameStart,
    /// Error message (server → client)
    Error {
        code: u32,
        message: String,
    },
}

/// A snapshot of the game state for synchronization.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GameStateSnapshot {
    pub tick: u64,
    pub players: Vec<PlayerState>,
    pub buildings: Vec<BuildingState>,
    pub units: Vec<UnitState>,
}

/// Player state in a snapshot.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlayerState {
    pub id: u32,
    pub name: String,
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

/// Room information for lobby.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RoomInfo {
    pub id: String,
    pub name: String,
    pub host_name: String,
    pub player_count: u32,
    pub max_players: u32,
    pub in_progress: bool,
}

/// Serialize a message to JSON string.
pub fn serialize(msg: &NetworkMessage) -> Result<String, String> {
    serde_json::to_string(msg).map_err(|e| format!("serialize error: {}", e))
}

/// Deserialize a message from JSON string.
pub fn deserialize(text: &str) -> Result<NetworkMessage, String> {
    serde_json::from_str(text).map_err(|e| format!("deserialize error: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialize_welcome() {
        let msg = NetworkMessage::Welcome {
            player_id: 1,
            tick_rate: 10,
        };
        let json = serialize(&msg).unwrap();
        assert!(json.contains("\"welcome\""));
        assert!(json.contains("\"player_id\":1"));
    }

    #[test]
    fn test_deserialize_player_join() {
        let json = r#"{"type":"player_join","name":"Alice"}"#;
        let msg = deserialize(json).unwrap();
        match msg {
            NetworkMessage::PlayerJoin { name } => assert_eq!(name, "Alice"),
            _ => panic!("Wrong message type"),
        }
    }

    #[test]
    fn test_serialize_room_info() {
        let info = RoomInfo {
            id: "abc-123".to_string(),
            name: "Test Room".to_string(),
            host_name: "Alice".to_string(),
            player_count: 1,
            max_players: 4,
            in_progress: false,
        };
        let json = serde_json::to_string(&info).unwrap();
        assert!(json.contains("\"name\":\"Test Room\""));
    }

    #[test]
    fn test_roundtrip_chat() {
        let msg = NetworkMessage::Chat {
            player_id: 1,
            text: "Hello!".to_string(),
        };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_error() {
        let msg = NetworkMessage::Error {
            code: 404,
            message: "Room not found".to_string(),
        };
        let json = serialize(&msg).unwrap();
        assert!(json.contains("\"error\""));
        assert!(json.contains("Room not found"));
    }
}
