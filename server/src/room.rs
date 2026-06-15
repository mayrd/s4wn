//! Game room management.

use crate::game_state::ServerGameState;
use crate::protocol::{PlayerState, RoomInfo};
use std::collections::HashMap;

/// Unique player ID counter.
static mut NEXT_PLAYER_ID: u32 = 1;

/// Generate a new unique player ID.
pub fn next_player_id() -> u32 {
    unsafe {
        let id = NEXT_PLAYER_ID;
        NEXT_PLAYER_ID += 1;
        id
    }
}

/// Generate a short room ID.
pub fn generate_room_id() -> String {
    uuid::Uuid::new_v4().to_string().split('-').next().unwrap().to_string()
}

/// A connected player.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Player {
    pub id: u32,
    pub name: String,
    /// The room this player is in (if any).
    pub room_id: Option<String>,
    /// Resources: [wood, stone, iron, coal, gold]
    pub resources: [u32; 5],
}

impl Player {
    pub fn new(id: u32, name: String) -> Self {
        Player {
            id,
            name,
            room_id: None,
            resources: [100, 50, 0, 0, 0], // starting resources
        }
    }

    #[allow(dead_code)]
    pub fn to_state(&self) -> PlayerState {
        PlayerState {
            id: self.id,
            name: self.name.clone(),
            resources: self.resources,
        }
    }
}

/// Game room state.
#[derive(Debug, Clone, PartialEq)]
#[allow(dead_code)]
pub enum RoomState {
    Lobby,
    InProgress,
    Finished,
}

/// A game room.
#[derive(Debug, Clone)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub host_id: u32,
    pub players: HashMap<u32, Player>,
    pub max_players: u32,
    pub state: RoomState,
    /// Current game tick (only meaningful when InProgress).
    pub tick: u64,
    /// Server-authoritative game state (Some when InProgress).
    pub game_state: Option<ServerGameState>,
}

impl Room {
    pub fn new(id: String, name: String, host: Player, max_players: u32) -> Self {
        let host_id = host.id;
        let mut players = HashMap::new();
        players.insert(host.id, host);
        Room {
            id,
            name,
            host_id,
            players,
            max_players,
            state: RoomState::Lobby,
            tick: 0,
            game_state: None,
        }
    }

    pub fn player_count(&self) -> u32 {
        self.players.len() as u32
    }

    pub fn is_full(&self) -> bool {
        self.players.len() >= self.max_players as usize
    }

    pub fn is_empty(&self) -> bool {
        self.players.is_empty()
    }

    pub fn has_player(&self, player_id: u32) -> bool {
        self.players.contains_key(&player_id)
    }

    pub fn add_player(&mut self, player: Player) -> Result<(), String> {
        if self.is_full() {
            return Err("Room is full".to_string());
        }
        if self.state != RoomState::Lobby {
            return Err("Game already in progress".to_string());
        }
        self.players.insert(player.id, player);
        Ok(())
    }

    pub fn remove_player(&mut self, player_id: u32) -> Option<Player> {
        self.players.remove(&player_id)
    }

    pub fn get_player(&self, player_id: u32) -> Option<&Player> {
        self.players.get(&player_id)
    }

    #[allow(dead_code)]
    pub fn get_player_mut(&mut self, player_id: u32) -> Option<&mut Player> {
        self.players.get_mut(&player_id)
    }

    pub fn is_host(&self, player_id: u32) -> bool {
        self.host_id == player_id
    }

    pub fn start_game(&mut self) -> Result<(), String> {
        if self.state != RoomState::Lobby {
            return Err("Game already started".to_string());
        }
        if self.players.len() < 2 {
            return Err("Need at least 2 players to start".to_string());
        }
        self.state = RoomState::InProgress;
        self.tick = 0;

        // Initialize server-authoritative game state
        let mut gs = ServerGameState::new(64, 64, self.tick);
        for pid in self.players.keys() {
            gs.add_player(*pid);
        }
        self.game_state = Some(gs);

        Ok(())
    }

    pub fn to_info(&self) -> RoomInfo {
        RoomInfo {
            id: self.id.clone(),
            name: self.name.clone(),
            host_name: self
                .players
                .get(&self.host_id)
                .map(|p| p.name.clone())
                .unwrap_or_default(),
            player_count: self.player_count(),
            max_players: self.max_players,
            in_progress: self.state == RoomState::InProgress,
        }
    }

    /// Advance game tick.
    pub fn tick(&mut self) {
        if self.state == RoomState::InProgress {
            self.tick += 1;
            if let Some(ref mut gs) = self.game_state {
                gs.tick();
            }
        }
    }
}

/// Manages all game rooms.
pub struct RoomManager {
    rooms: HashMap<String, Room>,
}

impl RoomManager {
    pub fn new() -> Self {
        RoomManager {
            rooms: HashMap::new(),
        }
    }

    pub fn create_room(
        &mut self,
        name: String,
        host: Player,
        max_players: u32,
    ) -> (String, RoomInfo) {
        let id = generate_room_id();
        let room = Room::new(id.clone(), name, host, max_players);
        let info = room.to_info();
        self.rooms.insert(id.clone(), room);
        (id, info)
    }

    pub fn get_room(&self, room_id: &str) -> Option<&Room> {
        self.rooms.get(room_id)
    }

    pub fn get_room_mut(&mut self, room_id: &str) -> Option<&mut Room> {
        self.rooms.get_mut(room_id)
    }

    #[allow(dead_code)]
    pub fn remove_room(&mut self, room_id: &str) -> bool {
        self.rooms.remove(room_id)
    }

    pub fn list_rooms(&self) -> Vec<RoomInfo> {
        self.rooms.values().map(|r| r.to_info()).collect()
    }

    pub fn join_room(
        &mut self,
        room_id: &str,
        player: Player,
    ) -> Result<RoomInfo, String> {
        let room = self
            .rooms
            .get_mut(room_id)
            .ok_or("Room not found")?;
        room.add_player(player)?;
        Ok(room.to_info())
    }

    pub fn leave_room(
        &mut self,
        room_id: &str,
        player_id: u32,
    ) -> Result<Option<RoomInfo>, String> {
        let room = self
            .rooms
            .get_mut(room_id)
            .ok_or("Room not found")?;
        room.remove_player(player_id);

        if room.is_empty() {
            self.rooms.remove(room_id);
            Ok(None)
        } else {
            // If host left, transfer host
            if !room.players.contains_key(&room.host_id) {
                let new_host_id = *room.players.keys().next().unwrap();
                room.host_id = new_host_id;
            }
            Ok(Some(room.to_info()))
        }
    }

    /// Clean up empty rooms.
    pub fn cleanup(&mut self) {
        self.rooms.retain(|_, room| !room.is_empty());
    }
}

impl Default for RoomManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_room() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let (room_id, info) = mgr.create_room("Test Room".to_string(), host, 4);
        assert_eq!(info.name, "Test Room");
        assert_eq!(info.player_count, 1);
        assert_eq!(info.max_players, 4);
        assert!(!info.in_progress);
        assert!(!room_id.is_empty());
    }

    #[test]
    fn test_join_room() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let (room_id, _) = mgr.create_room("Test".to_string(), host, 4);

        let player2 = Player::new(next_player_id(), "Bob".to_string());
        let info = mgr.join_room(&room_id, player2).unwrap();
        assert_eq!(info.player_count, 2);
    }

    #[test]
    fn test_join_full_room() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let (room_id, _) = mgr.create_room("Test".to_string(), host, 2);

        let p2 = Player::new(next_player_id(), "Bob".to_string());
        mgr.join_room(&room_id, p2).unwrap();

        let p3 = Player::new(next_player_id(), "Charlie".to_string());
        assert!(mgr.join_room(&room_id, p3).is_err());
    }

    #[test]
    fn test_leave_room() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let host_id = host.id;
        let (room_id, _) = mgr.create_room("Test".to_string(), host, 4);

        let result = mgr.leave_room(&room_id, host_id).unwrap();
        assert!(result.is_none()); // room removed since empty
    }

    #[test]
    fn test_host_transfer() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let host_id = host.id;
        let (room_id, _) = mgr.create_room("Test".to_string(), host, 4);

        let p2 = Player::new(next_player_id(), "Bob".to_string());
        let p2_id = p2.id;
        mgr.join_room(&room_id, p2).unwrap();

        mgr.leave_room(&room_id, host_id).unwrap();
        let room = mgr.get_room(&room_id).unwrap();
        assert_eq!(room.host_id, p2_id);
    }

    #[test]
    fn test_start_game() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let (room_id, _) = mgr.create_room("Test".to_string(), host, 4);

        let p2 = Player::new(next_player_id(), "Bob".to_string());
        mgr.join_room(&room_id, p2).unwrap();

        let room = mgr.get_room_mut(&room_id).unwrap();
        room.start_game().unwrap();
        assert_eq!(room.state, RoomState::InProgress);
    }

    #[test]
    fn test_start_game_too_few_players() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let (room_id, _) = mgr.create_room("Test".to_string(), host, 4);

        let room = mgr.get_room_mut(&room_id).unwrap();
        assert!(room.start_game().is_err());
    }

    #[test]
    fn test_list_rooms() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        mgr.create_room("Room A".to_string(), host, 4);
        let host2 = Player::new(next_player_id(), "Bob".to_string());
        mgr.create_room("Room B".to_string(), host2, 2);

        let rooms = mgr.list_rooms();
        assert_eq!(rooms.len(), 2);
    }

    #[test]
    fn test_room_tick() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let (room_id, _) = mgr.create_room("Test".to_string(), host, 4);

        let p2 = Player::new(next_player_id(), "Bob".to_string());
        mgr.join_room(&room_id, p2).unwrap();

        let room = mgr.get_room_mut(&room_id).unwrap();
        room.start_game().unwrap();
        assert_eq!(room.tick, 0);
        room.tick();
        assert_eq!(room.tick, 1);
    }

    #[test]
    fn test_cleanup() {
        let mut mgr = RoomManager::new();
        let host = Player::new(next_player_id(), "Alice".to_string());
        let (room_id, _) = mgr.create_room("Test".to_string(), host, 4);

        let host_id = mgr.get_room(&room_id).unwrap().host_id;
        mgr.leave_room(&room_id, host_id).unwrap();
        mgr.cleanup();
        assert!(mgr.list_rooms().is_empty());
    }
}
