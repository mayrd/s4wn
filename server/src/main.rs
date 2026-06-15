//! Main WebSocket server with tokio-tungstenite.

use crate::protocol::{deserialize, serialize, NetworkMessage};
use crate::room::{next_player_id, Player, RoomManager};
use log::{info, warn, error, debug};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::tungstenite::Message;
use futures::{SinkExt, StreamExt};

mod protocol;
mod room;
mod game_state;

/// Shared server state.
struct ServerState {
    /// All connected players (player_id → sender channel).
    players: HashMap<u32, broadcast::Sender<String>>,
    /// Room manager.
    rooms: RoomManager,
}

impl ServerState {
    fn new() -> Self {
        ServerState {
            players: HashMap::new(),
            rooms: RoomManager::new(),
        }
    }
}

/// Broadcast a message to all connected players.
fn broadcast_to_all(state: &ServerState, json: &str) {
    for (_, sender) in &state.players {
        let _ = sender.send(json.to_string());
    }
}

/// Broadcast a message to all players in a specific room.
fn broadcast_to_room(state: &ServerState, room_id: &str, json: &str) {
    if let Some(room) = state.rooms.get_room(room_id) {
        for (pid, _) in &room.players {
            if let Some(sender) = state.players.get(pid) {
                let _ = sender.send(json.to_string());
            }
        }
    }
}

/// Broadcast the room list to all connected players.
fn broadcast_room_list(state: &ServerState) {
    let rooms = state.rooms.list_rooms();
    let msg = NetworkMessage::RoomList { rooms };
    if let Ok(json) = serialize(&msg) {
        broadcast_to_all(state, &json);
    }
}

/// Handle a single WebSocket connection.
async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    state: Arc<Mutex<ServerState>>,
) {
    info!("New connection from {}", addr);

    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("WebSocket handshake failed for {}: {}", addr, e);
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Assign player ID
    let player_id = next_player_id();
    info!("Player {} connected from {}", player_id, addr);

    // Create broadcast channel for this player
    let (tx, mut rx) = broadcast::channel::<String>(256);

    {
        let mut state = state.lock().unwrap();
        state.players.insert(player_id, tx.clone());
    }

    // Send Welcome message
    let welcome = NetworkMessage::Welcome {
        player_id,
        tick_rate: 10,
    };
    if let Ok(json) = serialize(&welcome) {
        let _ = tx.send(json);
    }

    // Spawn task to forward broadcast messages to WebSocket
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Process incoming messages
    while let Some(result) = ws_receiver.next().await {
        match result {
            Ok(Message::Text(text)) => {
                debug!("Player {} sent: {}", player_id, text);
                match deserialize(&text) {
                    Ok(msg) => {
                        handle_message(player_id, msg, &state, &tx).await;
                    }
                    Err(e) => {
                        warn!("Player {} sent invalid message: {}", player_id, e);
                        let err_msg = NetworkMessage::Error {
                            code: 400,
                            message: format!("Invalid message: {}", e),
                        };
                        if let Ok(json) = serialize(&err_msg) {
                            let _ = tx.send(json);
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => {
                info!("Player {} disconnected", player_id);
                break;
            }
            Ok(Message::Ping(_data)) => {
                debug!("Ping from player {}", player_id);
            }
            Ok(_) => {} // Binary, Pong — ignore
            Err(e) => {
                error!("WebSocket error for player {}: {}", player_id, e);
                break;
            }
        }
    }

    // Cleanup on disconnect
    send_task.abort();
    {
        let mut state = state.lock().unwrap();
        state.players.remove(&player_id);

        // Remove from any room
        let room_ids: Vec<String> = state
            .rooms
            .list_rooms()
            .iter()
            .map(|r| r.id.clone())
            .collect();

        for room_id in room_ids {
            if let Some(room) = state.rooms.get_room(&room_id) {
                if room.has_player(player_id) {
                    let _ = state.rooms.leave_room(&room_id, player_id);
                    // Notify remaining players
                    if let Some(updated_room) = state.rooms.get_room(&room_id) {
                        let update = NetworkMessage::RoomUpdate {
                            room: updated_room.to_info(),
                        };
                        if let Ok(json) = serialize(&update) {
                            for pid in updated_room.players.keys() {
                                if let Some(sender) = state.players.get(pid) {
                                    let _ = sender.send(json.clone());
                                }
                            }
                        }
                    }
                }
            }
        }
        state.rooms.cleanup();
    }

    info!("Player {} cleaned up", player_id);
}

/// Handle a validated game action — find player's room, apply, broadcast result.
async fn handle_game_action<F>(
    state: &Arc<Mutex<ServerState>>,
    sender: &broadcast::Sender<String>,
    player_id: u32,
    action: F,
) where
    F: FnOnce(&mut crate::game_state::ServerGameState) -> Result<(), String>,
{
    let room_id = {
        let state = state.lock().unwrap();
        let mut found = None;
        for room in state.rooms.list_rooms() {
            if let Some(r) = state.rooms.get_room(&room.id) {
                if r.has_player(player_id) && r.state == crate::room::RoomState::InProgress {
                    found = Some(room.id.clone());
                    break;
                }
            }
        }
        found
    };

    let room_id = match room_id {
        Some(id) => id,
        None => {
            let err = NetworkMessage::Error {
                code: 404,
                message: "Not in an active game".to_string(),
            };
            if let Ok(json) = serialize(&err) {
                let _ = sender.send(json);
            }
            return;
        }
    };

    let mut state_guard = state.lock().unwrap();
    if let Some(room) = state_guard.rooms.get_room_mut(&room_id) {
        if let Some(ref mut gs) = room.game_state {
            match action(gs) {
                Ok(()) => {
                    let sync = NetworkMessage::GameStateSync(gs.to_snapshot());
                    if let Ok(json) = serialize(&sync) {
                        broadcast_to_room(&state_guard, &room_id, &json);
                    }
                }
                Err(e) => {
                    let err_msg = NetworkMessage::Error {
                        code: 400,
                        message: e,
                    };
                    if let Ok(json) = serialize(&err_msg) {
                        if let Some(sender) = state_guard.players.get(&player_id) {
                            let _ = sender.send(json);
                        }
                    }
                }
            }
        }
    }
}

/// Handle a single network message from a player.
async fn handle_message(
    player_id: u32,
    msg: NetworkMessage,
    state: &Arc<Mutex<ServerState>>,
    sender: &broadcast::Sender<String>,
) {
    match msg {
        NetworkMessage::Ping { timestamp } => {
            let pong = NetworkMessage::Pong { timestamp };
            if let Ok(json) = serialize(&pong) {
                let _ = sender.send(json);
            }
        }

        NetworkMessage::PlayerJoin { name } => {
            info!("Player {} joined as '{}'", player_id, name);
            let chat_msg = NetworkMessage::Chat {
                player_id: 0, // system
                text: format!("{} joined the lobby", name),
            };
            if let Ok(json) = serialize(&chat_msg) {
                let state = state.lock().unwrap();
                broadcast_to_all(&state, &json);
            }
        }

        NetworkMessage::Chat { player_id: pid, text } => {
            info!("Chat from {}: {}", pid, text);
            let chat = NetworkMessage::Chat {
                player_id: pid,
                text,
            };
            if let Ok(json) = serialize(&chat) {
                let state = state.lock().unwrap();
                broadcast_to_all(&state, &json);
            }
        }

        NetworkMessage::RoomList { .. } => {
            let rooms = {
                let state = state.lock().unwrap();
                state.rooms.list_rooms()
            };
            let response = NetworkMessage::RoomList { rooms };
            if let Ok(json) = serialize(&response) {
                let _ = sender.send(json);
            }
        }

        NetworkMessage::RoomCreate { name, max_players } => {
            let player = {
                let state = state.lock().unwrap();
                let mut player_name = format!("Player {}", player_id);
                for room in state.rooms.list_rooms() {
                    if let Some(r) = state.rooms.get_room(&room.id) {
                        if let Some(p) = r.get_player(player_id) {
                            player_name = p.name.clone();
                            break;
                        }
                    }
                }
                Player::new(player_id, player_name)
            };

            let (room_id, info) = {
                let mut state = state.lock().unwrap();
                state.rooms.create_room(name, player, max_players)
            };
            info!("Room {} created by player {}", room_id, player_id);

            // Send room update to creator
            let update = NetworkMessage::RoomUpdate { room: info };
            if let Ok(json) = serialize(&update) {
                let _ = sender.send(json);
            }

            // Broadcast new room list to all
            let state = state.lock().unwrap();
            broadcast_room_list(&state);
        }

        NetworkMessage::RoomJoin { room_id } => {
            let player = {
                let state = state.lock().unwrap();
                let mut player_name = format!("Player {}", player_id);
                for room in state.rooms.list_rooms() {
                    if let Some(r) = state.rooms.get_room(&room.id) {
                        if let Some(p) = r.get_player(player_id) {
                            player_name = p.name.clone();
                            break;
                        }
                    }
                }
                Player::new(player_id, player_name)
            };

            let result = {
                let mut state = state.lock().unwrap();
                state.rooms.join_room(&room_id, player)
            };

            match result {
                Ok(info) => {
                    info!("Player {} joined room {}", player_id, room_id);
                    let update = NetworkMessage::RoomUpdate { room: info };
                    if let Ok(json) = serialize(&update) {
                        let state = state.lock().unwrap();
                        broadcast_to_room(&state, &room_id, &json);
                        broadcast_room_list(&state);
                    }
                }
                Err(e) => {
                    warn!("Player {} failed to join room {}: {}", player_id, room_id, e);
                    let err = NetworkMessage::Error {
                        code: 400,
                        message: e,
                    };
                    if let Ok(json) = serialize(&err) {
                        let _ = sender.send(json);
                    }
                }
            }
        }

        NetworkMessage::RoomLeave => {
            let room_id = {
                let state = state.lock().unwrap();
                let mut found = None;
                for room in state.rooms.list_rooms() {
                    if let Some(r) = state.rooms.get_room(&room.id) {
                        if r.has_player(player_id) {
                            found = Some(room.id.clone());
                            break;
                        }
                    }
                }
                found
            };

            if let Some(room_id) = room_id {
                let result = {
                    let mut state = state.lock().unwrap();
                    state.rooms.leave_room(&room_id, player_id)
                };

                match result {
                    Ok(Some(info)) => {
                        let update = NetworkMessage::RoomUpdate { room: info };
                        if let Ok(json) = serialize(&update) {
                            let state = state.lock().unwrap();
                            broadcast_to_room(&state, &room_id, &json);
                        }
                    }
                    Ok(None) => {
                        info!("Room {} removed (empty)", room_id);
                    }
                    Err(e) => {
                        warn!("Player {} failed to leave room: {}", player_id, e);
                    }
                }
                let state = state.lock().unwrap();
                broadcast_room_list(&state);
            }
        }

        NetworkMessage::GameStart => {
            let room_info = {
                let state = state.lock().unwrap();
                let mut found = None;
                for room in state.rooms.list_rooms() {
                    if let Some(r) = state.rooms.get_room(&room.id) {
                        if r.has_player(player_id) {
                            if !r.is_host(player_id) {
                                let err = NetworkMessage::Error {
                                    code: 403,
                                    message: "Only the host can start the game".to_string(),
                                };
                                if let Ok(json) = serialize(&err) {
                                    let _ = sender.send(json);
                                }
                                return;
                            }
                            found = Some((room.id.clone(), r.player_count()));
                            break;
                        }
                    }
                }
                found
            };

            if let Some((room_id, player_count)) = room_info {
                if player_count < 2 {
                    let err = NetworkMessage::Error {
                        code: 400,
                        message: "Need at least 2 players to start".to_string(),
                    };
                    if let Ok(json) = serialize(&err) {
                        let _ = sender.send(json);
                    }
                    return;
                }

                let mut state = state.lock().unwrap();
                if let Some(room) = state.rooms.get_room_mut(&room_id) {
                    match room.start_game() {
                        Ok(()) => {
                            info!("Game started in room {} by player {}", room_id, player_id);
                            // Broadcast initial game state snapshot
                            if let Some(ref gs) = room.game_state {
                                let sync = NetworkMessage::GameStateSync(gs.to_snapshot());
                                if let Ok(json) = serialize(&sync) {
                                    broadcast_to_room(&state, &room_id, &json);
                                }
                            }
                        }
                        Err(e) => {
                            let err = NetworkMessage::Error {
                                code: 400,
                                message: e,
                            };
                            if let Ok(json) = serialize(&err) {
                                let _ = sender.send(json);
                            }
                        }
                    }
                }
            }
        }

        // Game action messages — validate and apply through server-authoritative game state
        NetworkMessage::BuildingPlace {
            building_type,
            x,
            y,
            player_id,
        } => handle_game_action(
            state, sender, player_id,
            move |gs: &mut crate::game_state::ServerGameState| {
                gs.validate_building_place(player_id, building_type, x, y)?;
                gs.apply_building_place(player_id, building_type, x, y)?;
                Ok(())
            },
        ).await,

        NetworkMessage::UnitSpawn {
            unit_kind,
            x,
            y,
            player_id,
        } => handle_game_action(
            state, sender, player_id,
            move |gs| {
                gs.validate_unit_spawn(player_id, unit_kind, x, y)?;
                gs.apply_unit_spawn(player_id, unit_kind, x, y);
                Ok(())
            },
        ).await,

        NetworkMessage::UnitMove {
            unit_id,
            target_x,
            target_y,
            player_id,
        } => handle_game_action(
            state, sender, player_id,
            move |gs| {
                gs.validate_unit_move(player_id, unit_id, target_x, target_y)?;
                gs.apply_unit_move(unit_id, target_x, target_y);
                Ok(())
            },
        ).await,

        NetworkMessage::UnitAttack {
            attacker_id,
            target_id,
            player_id,
        } => handle_game_action(
            state, sender, player_id,
            move |gs| {
                gs.validate_unit_attack(player_id, attacker_id, target_id)?;
                gs.apply_unit_attack(attacker_id, target_id);
                Ok(())
            },
        ).await,

        _ => {
            debug!("Unhandled message from player {}: {:?}", player_id, msg);
        }
    }
}

/// Run the game server.
pub async fn run(addr: &str) -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();
    let listener = TcpListener::bind(addr).await?;
    info!("S4WN game server listening on {}", addr);

    let state = Arc::new(Mutex::new(ServerState::new()));

    // Spawn the game tick loop — broadcasts GameStateSync every tick for in-progress rooms
    let tick_state = Arc::clone(&state);
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(100));
        loop {
            interval.tick().await;
            let mut state = tick_state.lock().unwrap();

            // Collect room IDs that are in progress
            let in_progress_rooms: Vec<String> = state
                .rooms
                .list_rooms()
                .iter()
                .filter(|r| r.in_progress)
                .map(|r| r.id.clone())
                .collect();

            for room_id in &in_progress_rooms {
                let snapshot_and_pids = {
                    if let Some(room) = state.rooms.get_room_mut(room_id) {
                        room.tick();
                        if let Some(ref gs) = room.game_state {
                            let sync = NetworkMessage::GameStateSync(gs.to_snapshot());
                            if let Ok(json) = serialize(&sync) {
                                let pids: Vec<u32> = room.players.keys().copied().collect();
                                Some((json, pids))
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                };

                if let Some((json, pids)) = snapshot_and_pids {
                    for pid in &pids {
                        if let Some(sender) = state.players.get(pid) {
                            let _ = sender.send(json.clone());
                        }
                    }
                }
            }

            // Cleanup empty rooms periodically (~every 5 seconds / 50 ticks)
            if state.rooms.list_rooms().iter().any(|r| r.player_count == 0) {
                state.rooms.cleanup();
            }
        }
    });

    while let Ok((stream, peer_addr)) = listener.accept().await {
        let state = Arc::clone(&state);
        tokio::spawn(handle_connection(stream, peer_addr, state));
    }

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = std::env::var("S4WN_SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
    run(&addr).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_state_new() {
        let state = ServerState::new();
        assert_eq!(state.players.len(), 0);
        assert_eq!(state.rooms.list_rooms().len(), 0);
    }
}
