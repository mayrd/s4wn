//! S4WN Network Module
//!
//! Phase 3 — Multiplayer: WebSocket client-server networking.

// ── Message Types ────────────────────────────────────────────────────────────

/// All network messages that can be sent/received.
#[derive(Debug, Clone, PartialEq)]
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
#[derive(Debug, Clone, PartialEq)]
pub struct GameStateSnapshot {
    pub tick: u64,
    pub players: Vec<PlayerState>,
    pub buildings: Vec<BuildingState>,
    pub units: Vec<UnitState>,
}

/// Player state in a snapshot.
#[derive(Debug, Clone, PartialEq)]
pub struct PlayerState {
    pub id: u32,
    pub name: String,
    pub resources: [u32; 5],
}

/// Building state in a snapshot.
#[derive(Debug, Clone, PartialEq)]
pub struct BuildingState {
    pub id: u32,
    pub kind: u8,
    pub x: usize,
    pub y: usize,
    pub construction: f32,
    pub owner_id: u32,
}

/// Unit state in a snapshot.
#[derive(Debug, Clone, PartialEq)]
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
#[derive(Debug, Clone)]
pub struct NetworkManager {
    state: ConnectionState,
    outgoing: Vec<NetworkMessage>,
    incoming: Vec<NetworkMessage>,
    player_id: Option<u32>,
    tick_rate: u32,
}

impl NetworkManager {
    pub fn new() -> Self {
        NetworkManager {
            state: ConnectionState::Disconnected,
            outgoing: Vec::new(),
            incoming: Vec::new(),
            player_id: None,
            tick_rate: 10,
        }
    }

    pub fn state(&self) -> &ConnectionState { &self.state }
    pub fn is_connected(&self) -> bool { self.state == ConnectionState::Connected }

    pub fn connect(&mut self, _url: &str) {
        self.state = ConnectionState::Connecting;
        self.state = ConnectionState::Connected;
    }

    pub fn disconnect(&mut self) {
        self.state = ConnectionState::Disconnected;
        self.player_id = None;
    }

    pub fn send(&mut self, msg: NetworkMessage) {
        if self.state == ConnectionState::Connected {
            self.outgoing.push(msg);
        }
    }

    pub fn receive(&mut self) -> Vec<NetworkMessage> {
        std::mem::take(&mut self.incoming)
    }

    pub fn drain_outgoing(&mut self) -> Vec<NetworkMessage> {
        std::mem::take(&mut self.outgoing)
    }

    pub fn inject_incoming(&mut self, msg: NetworkMessage) {
        self.incoming.push(msg);
    }

    pub fn player_id(&self) -> Option<u32> { self.player_id }

    pub fn set_player_id(&mut self, id: u32) { self.player_id = Some(id); }
    pub fn tick_rate(&self) -> u32 { self.tick_rate }
    pub fn set_tick_rate(&mut self, rate: u32) { self.tick_rate = rate; }
    pub fn outgoing_count(&self) -> usize { self.outgoing.len() }
    pub fn incoming_count(&self) -> usize { self.incoming.len() }

    fn handle_welcome(&mut self, player_id: u32, tick_rate: u32) {
        self.player_id = Some(player_id);
        self.tick_rate = tick_rate;
        self.state = ConnectionState::Connected;
    }

    pub fn process_message(&mut self, msg: NetworkMessage) -> bool {
        match &msg {
            NetworkMessage::Welcome { player_id, tick_rate } => {
                self.handle_welcome(*player_id, *tick_rate);
                true
            }
            NetworkMessage::Ping { timestamp } => {
                self.send(NetworkMessage::Pong { timestamp: *timestamp });
                true
            }
            _ => {
                self.incoming.push(msg);
                false
            }
        }
    }
}

impl Default for NetworkManager {
    fn default() -> Self { Self::new() }
}

// ── Manual JSON Serialization ─────────────────────────────────────────────────

fn json_escape_string(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

pub fn serialize(msg: &NetworkMessage) -> Result<String, String> {
    let s = match msg {
        NetworkMessage::GameStateSync(snapshot) => {
            let mut players = Vec::new();
            for p in &snapshot.players {
                let res = format!("[{},{},{},{},{}]", p.resources[0], p.resources[1], p.resources[2], p.resources[3], p.resources[4]);
                players.push(format!("{{\"id\":{},\"name\":{},\"resources\":{}}}", p.id, json_escape_string(&p.name), res));
            }
            let mut buildings = Vec::new();
            for b in &snapshot.buildings {
                buildings.push(format!("{{\"id\":{},\"kind\":{},\"x\":{},\"y\":{},\"construction\":{},\"owner_id\":{}}}", b.id, b.kind, b.x, b.y, b.construction, b.owner_id));
            }
            let mut units = Vec::new();
            for u in &snapshot.units {
                units.push(format!("{{\"id\":{},\"kind\":{},\"x\":{},\"y\":{},\"hp\":{},\"owner_id\":{}}}", u.id, u.kind, u.x, u.y, u.hp, u.owner_id));
            }
            format!("{{\"GameStateSync\":{{\"tick\":{},\"players\":[{}],\"buildings\":[{}],\"units\":[{}]}}}}", snapshot.tick, players.join(","), buildings.join(","), units.join(","))
        }
        NetworkMessage::BuildingPlace { building_type, x, y, player_id } => {
            format!("{{\"BuildingPlace\":{{\"building_type\":{},\"x\":{},\"y\":{},\"player_id\":{}}}}}", building_type, x, y, player_id)
        }
        NetworkMessage::UnitSpawn { unit_kind, x, y, player_id } => {
            format!("{{\"UnitSpawn\":{{\"unit_kind\":{},\"x\":{},\"y\":{},\"player_id\":{}}}}}", unit_kind, x, y, player_id)
        }
        NetworkMessage::UnitMove { unit_id, target_x, target_y, player_id } => {
            format!("{{\"UnitMove\":{{\"unit_id\":{},\"target_x\":{},\"target_y\":{},\"player_id\":{}}}}}", unit_id, target_x, target_y, player_id)
        }
        NetworkMessage::UnitAttack { attacker_id, target_id, player_id } => {
            format!("{{\"UnitAttack\":{{\"attacker_id\":{},\"target_id\":{},\"player_id\":{}}}}}", attacker_id, target_id, player_id)
        }
        NetworkMessage::PlayerJoin { name } => {
            format!("{{\"PlayerJoin\":{{\"name\":{}}}}}", json_escape_string(name))
        }
        NetworkMessage::PlayerLeave { player_id } => {
            format!("{{\"PlayerLeave\":{{\"player_id\":{}}}}}", player_id)
        }
        NetworkMessage::Chat { player_id, text } => {
            format!("{{\"Chat\":{{\"player_id\":{},\"text\":{}}}}}", player_id, json_escape_string(text))
        }
        NetworkMessage::Ping { timestamp } => {
            format!("{{\"Ping\":{{\"timestamp\":{}}}}}", timestamp)
        }
        NetworkMessage::Pong { timestamp } => {
            format!("{{\"Pong\":{{\"timestamp\":{}}}}}", timestamp)
        }
        NetworkMessage::Welcome { player_id, tick_rate } => {
            format!("{{\"Welcome\":{{\"player_id\":{},\"tick_rate\":{}}}}}", player_id, tick_rate)
        }
    };
    Ok(s)
}

pub fn deserialize(text: &str) -> Result<NetworkMessage, String> {
    let mut p = JsonParser::new(text);
    p.parse_message()
}

struct JsonParser<'a> {
    bytes: &'a [u8],
    pos: usize,
}

impl<'a> JsonParser<'a> {
    fn new(text: &'a str) -> Self { JsonParser { bytes: text.as_bytes(), pos: 0 } }

    fn skip_ws(&mut self) {
        while self.pos < self.bytes.len() {
            let b = self.bytes[self.pos];
            if b == b' ' || b == b'\n' || b == b'\r' || b == b'\t' { self.pos += 1; } else { break; }
        }
    }

    fn expect(&mut self, c: u8) -> Result<(), String> {
        self.skip_ws();
        if self.pos >= self.bytes.len() { return Err(format!("unexpected EOF, expected '{}'", c as char)); }
        if self.bytes[self.pos] != c { return Err(format!("expected '{}' at {}, got '{}'", c as char, self.pos, self.bytes[self.pos] as char)); }
        self.pos += 1; Ok(())
    }

    fn parse_string_raw(&mut self) -> Result<String, String> {
        self.skip_ws();
        self.expect(b'"')?;
        let mut s = String::new();
        while self.pos < self.bytes.len() {
            let c = self.bytes[self.pos];
            if c == b'"' { self.pos += 1; return Ok(s); }
            if c == b'\\' {
                self.pos += 1;
                if self.pos >= self.bytes.len() { return Err("EOF in escape".into()); }
                match self.bytes[self.pos] {
                    b'"' => s.push('"'), b'\\' => s.push('\\'), b'n' => s.push('\n'),
                    b'r' => s.push('\r'), b't' => s.push('\t'), b'/' => s.push('/'),
                    b'u' => {
                        if self.pos + 5 > self.bytes.len() { return Err("EOF in unicode".into()); }
                        let hex = std::str::from_utf8(&self.bytes[self.pos+1..self.pos+5]).map_err(|_| "bad unicode")?;
                        let code = u32::from_str_radix(hex, 16).map_err(|_| "bad hex")?;
                        s.push(char::from_u32(code).ok_or("bad codepoint")?);
                        self.pos += 4;
                    }
                    e => return Err(format!("bad escape: {}", e as char)),
                }
            } else { s.push(c as char); }
            self.pos += 1;
        }
        Err("unterminated string".into())
    }

    fn parse_u32_val(&mut self) -> Result<u32, String> {
        self.skip_ws(); let start = self.pos;
        while self.pos < self.bytes.len() && self.bytes[self.pos].is_ascii_digit() { self.pos += 1; }
        if start == self.pos { return Err(format!("expected u32 at {}", self.pos)); }
        std::str::from_utf8(&self.bytes[start..self.pos]).unwrap().parse().map_err(|e| format!("u32: {}", e))
    }

    fn parse_u64_val(&mut self) -> Result<u64, String> {
        self.skip_ws(); let start = self.pos;
        while self.pos < self.bytes.len() && self.bytes[self.pos].is_ascii_digit() { self.pos += 1; }
        if start == self.pos { return Err(format!("expected u64 at {}", self.pos)); }
        std::str::from_utf8(&self.bytes[start..self.pos]).unwrap().parse().map_err(|e| format!("u64: {}", e))
    }

    fn parse_f32_val(&mut self) -> Result<f32, String> {
        self.skip_ws(); let start = self.pos;
        while self.pos < self.bytes.len() {
            let c = self.bytes[self.pos];
            if c.is_ascii_digit() || c == b'.' || c == b'-' || c == b'+' || c == b'e' || c == b'E' { self.pos += 1; } else { break; }
        }
        if start == self.pos { return Err(format!("expected f32 at {}", self.pos)); }
        std::str::from_utf8(&self.bytes[start..self.pos]).unwrap().parse().map_err(|e| format!("f32: {}", e))
    }

    fn parse_usize_val(&mut self) -> Result<usize, String> {
        self.skip_ws(); let start = self.pos;
        while self.pos < self.bytes.len() && self.bytes[self.pos].is_ascii_digit() { self.pos += 1; }
        if start == self.pos { return Err(format!("expected usize at {}", self.pos)); }
        std::str::from_utf8(&self.bytes[start..self.pos]).unwrap().parse().map_err(|e| format!("usize: {}", e))
    }

    fn peek(&mut self) -> Option<u8> { self.skip_ws(); if self.pos < self.bytes.len() { Some(self.bytes[self.pos]) } else { None } }

    fn expect_key(&mut self, key: &str) -> Result<(), String> {
        let name = self.parse_string_raw()?;
        if name != key { return Err(format!("expected '{}', got '{}'", key, name)); }
        self.expect(b':')?;
        Ok(())
    }

    fn parse_array<T, F>(&mut self, f: F) -> Result<Vec<T>, String> where F: Fn(&mut Self) -> Result<T, String> {
        self.skip_ws(); self.expect(b'[')?;
        let mut items = Vec::new();
        if self.peek() != Some(b']') {
            items.push(f(self)?);
            while self.peek() == Some(b',') { self.pos += 1; items.push(f(self)?); }
        }
        self.expect(b']')?; Ok(items)
    }

    fn parse_message(&mut self) -> Result<NetworkMessage, String> {
        self.skip_ws(); self.expect(b'{')?;
        let variant = self.parse_string_raw()?;
        self.expect(b':')?; self.skip_ws();
        let r = match variant.as_str() {
            "GameStateSync" => self.parse_gss(),
            "BuildingPlace" => self.parse_bp(),
            "UnitSpawn" => self.parse_us(),
            "UnitMove" => self.parse_um(),
            "UnitAttack" => self.parse_ua(),
            "PlayerJoin" => self.parse_pj(),
            "PlayerLeave" => self.parse_pl(),
            "Chat" => self.parse_chat(),
            "Ping" => self.parse_ping(),
            "Pong" => self.parse_pong(),
            "Welcome" => self.parse_welcome(),
            _ => Err(format!("unknown: {}", variant)),
        }?;
        self.skip_ws(); self.expect(b'}')?; Ok(r)
    }

    fn parse_gss(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("tick")?; let tick = self.parse_u64_val()?;
        self.expect(b',')?; self.expect_key("players")?; let players = self.parse_array(Self::parse_ps)?;
        self.expect(b',')?; self.expect_key("buildings")?; let buildings = self.parse_array(Self::parse_bs)?;
        self.expect(b',')?; self.expect_key("units")?; let units = self.parse_array(Self::parse_usn)?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::GameStateSync(GameStateSnapshot { tick, players, buildings, units }))
    }

    fn parse_ps(&mut self) -> Result<PlayerState, String> {
        self.expect(b'{')?; self.expect_key("id")?; let id = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("name")?; let name = self.parse_string_raw()?;
        self.expect(b',')?; self.expect_key("resources")?;
        self.skip_ws(); self.expect(b'[')?;
        let mut res = [0u32; 5];
        for (i, item) in res.iter_mut().enumerate() { if i > 0 { self.expect(b',')?; } *item = self.parse_u32_val()?; }
        self.expect(b']')?; self.skip_ws(); self.expect(b'}')?;
        Ok(PlayerState { id, name, resources: res })
    }

    fn parse_bs(&mut self) -> Result<BuildingState, String> {
        self.expect(b'{')?; self.expect_key("id")?; let id = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("kind")?; let kind = self.parse_u32_val()? as u8;
        self.expect(b',')?; self.expect_key("x")?; let x = self.parse_usize_val()?;
        self.expect(b',')?; self.expect_key("y")?; let y = self.parse_usize_val()?;
        self.expect(b',')?; self.expect_key("construction")?; let construction = self.parse_f32_val()?;
        self.expect(b',')?; self.expect_key("owner_id")?; let owner_id = self.parse_u32_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(BuildingState { id, kind, x, y, construction, owner_id })
    }

    fn parse_usn(&mut self) -> Result<UnitState, String> {
        self.expect(b'{')?; self.expect_key("id")?; let id = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("kind")?; let kind = self.parse_u32_val()? as u8;
        self.expect(b',')?; self.expect_key("x")?; let x = self.parse_f32_val()?;
        self.expect(b',')?; self.expect_key("y")?; let y = self.parse_f32_val()?;
        self.expect(b',')?; self.expect_key("hp")?; let hp = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("owner_id")?; let owner_id = self.parse_u32_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(UnitState { id, kind, x, y, hp, owner_id })
    }

    fn parse_bp(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("building_type")?; let building_type = self.parse_u32_val()? as u8;
        self.expect(b',')?; self.expect_key("x")?; let x = self.parse_usize_val()?;
        self.expect(b',')?; self.expect_key("y")?; let y = self.parse_usize_val()?;
        self.expect(b',')?; self.expect_key("player_id")?; let player_id = self.parse_u32_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::BuildingPlace { building_type, x, y, player_id })
    }

    fn parse_us(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("unit_kind")?; let unit_kind = self.parse_u32_val()? as u8;
        self.expect(b',')?; self.expect_key("x")?; let x = self.parse_f32_val()?;
        self.expect(b',')?; self.expect_key("y")?; let y = self.parse_f32_val()?;
        self.expect(b',')?; self.expect_key("player_id")?; let player_id = self.parse_u32_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::UnitSpawn { unit_kind, x, y, player_id })
    }

    fn parse_um(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("unit_id")?; let unit_id = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("target_x")?; let target_x = self.parse_usize_val()?;
        self.expect(b',')?; self.expect_key("target_y")?; let target_y = self.parse_usize_val()?;
        self.expect(b',')?; self.expect_key("player_id")?; let player_id = self.parse_u32_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::UnitMove { unit_id, target_x, target_y, player_id })
    }

    fn parse_ua(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("attacker_id")?; let attacker_id = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("target_id")?; let target_id = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("player_id")?; let player_id = self.parse_u32_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::UnitAttack { attacker_id, target_id, player_id })
    }

    fn parse_pj(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("name")?; let name = self.parse_string_raw()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::PlayerJoin { name })
    }

    fn parse_pl(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("player_id")?; let player_id = self.parse_u32_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::PlayerLeave { player_id })
    }

    fn parse_chat(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("player_id")?; let player_id = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("text")?; let text = self.parse_string_raw()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::Chat { player_id, text })
    }

    fn parse_ping(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("timestamp")?; let timestamp = self.parse_u64_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::Ping { timestamp })
    }

    fn parse_pong(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("timestamp")?; let timestamp = self.parse_u64_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::Pong { timestamp })
    }

    fn parse_welcome(&mut self) -> Result<NetworkMessage, String> {
        self.expect(b'{')?; self.expect_key("player_id")?; let player_id = self.parse_u32_val()?;
        self.expect(b',')?; self.expect_key("tick_rate")?; let tick_rate = self.parse_u32_val()?;
        self.skip_ws(); self.expect(b'}')?;
        Ok(NetworkMessage::Welcome { player_id, tick_rate })
    }
}

// ── Client State Interpolation ────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct ClientInterpolator {
    previous: Option<GameStateSnapshot>,
    current: Option<GameStateSnapshot>,
    tick_duration: f64,
    current_received_at: Option<f64>,
}

impl ClientInterpolator {
    pub fn new(tick_duration: f64) -> Self {
        ClientInterpolator { previous: None, current: None, tick_duration, current_received_at: None }
    }

    pub fn push_snapshot(&mut self, snapshot: GameStateSnapshot, received_at: f64) {
        self.previous = self.current.take();
        self.current = Some(snapshot);
        self.current_received_at = Some(received_at);
    }

    pub fn can_interpolate(&self) -> bool { self.previous.is_some() && self.current.is_some() }
    pub fn has_state(&self) -> bool { self.current.is_some() }

    pub fn interpolation_alpha(&self, now: f64) -> f64 {
        match self.current_received_at {
            Some(t) => ((now - t) / self.tick_duration).clamp(0.0, 1.0),
            None => 0.0,
        }
    }

    pub fn interpolate_unit_position(&self, unit_id: u32, alpha: f64) -> Option<(f32, f32)> {
        let prev = self.previous.as_ref()?;
        let curr = self.current.as_ref()?;
        let prev_unit = prev.units.iter().find(|u| u.id == unit_id);
        let curr_unit = curr.units.iter().find(|u| u.id == unit_id);
        match (prev_unit, curr_unit) {
            (Some(p), Some(c)) => Some((p.x + (c.x - p.x) * alpha as f32, p.y + (c.y - p.y) * alpha as f32)),
            (None, Some(c)) => Some((c.x, c.y)),
            (Some(p), None) => Some((p.x, p.y)),
            (None, None) => None,
        }
    }

    pub fn current_snapshot(&self) -> Option<&GameStateSnapshot> { self.current.as_ref() }
    pub fn previous_snapshot(&self) -> Option<&GameStateSnapshot> { self.previous.as_ref() }

    pub fn reset(&mut self) { self.previous = None; self.current = None; self.current_received_at = None; }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialize_building_place() {
        let msg = NetworkMessage::BuildingPlace { building_type: 10, x: 5, y: 3, player_id: 1 };
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
                assert_eq!(building_type, 10); assert_eq!(x, 5); assert_eq!(y, 3); assert_eq!(player_id, 1);
            }
            _ => panic!("Wrong message type"),
        }
    }

    #[test]
    fn test_serialize_unit_spawn() {
        let msg = NetworkMessage::UnitSpawn { unit_kind: 0, x: 5.5, y: 3.5, player_id: 1 };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_unit_move() {
        let msg = NetworkMessage::UnitMove { unit_id: 42, target_x: 10, target_y: 20, player_id: 1 };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_unit_attack() {
        let msg = NetworkMessage::UnitAttack { attacker_id: 1, target_id: 2, player_id: 1 };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_player_join() {
        let msg = NetworkMessage::PlayerJoin { name: "Alice".to_string() };
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
        let msg = NetworkMessage::Chat { player_id: 1, text: "Hello world!".to_string() };
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
        let msg = NetworkMessage::Welcome { player_id: 1, tick_rate: 10 };
        let json = serialize(&msg).unwrap();
        let deserialized = deserialize(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_serialize_game_state_snapshot() {
        let snapshot = GameStateSnapshot {
            tick: 100,
            players: vec![PlayerState { id: 1, name: "Alice".to_string(), resources: [100, 50, 30, 20, 10] }],
            buildings: vec![BuildingState { id: 1, kind: 10, x: 5, y: 3, construction: 1.0, owner_id: 1 }],
            units: vec![UnitState { id: 1, kind: 0, x: 5.5, y: 3.5, hp: 50, owner_id: 1 }],
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

    #[test]
    fn test_deserialize_unknown_variant() {
        let json = r#"{"UnknownVariant":{"field":1}}"#;
        let result = deserialize(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_roundtrip_all_variants() {
        let messages = vec![
            NetworkMessage::BuildingPlace { building_type: 5, x: 10, y: 20, player_id: 2 },
            NetworkMessage::UnitSpawn { unit_kind: 3, x: 1.5, y: 2.5, player_id: 0 },
            NetworkMessage::UnitMove { unit_id: 99, target_x: 15, target_y: 25, player_id: 1 },
            NetworkMessage::UnitAttack { attacker_id: 10, target_id: 20, player_id: 0 },
            NetworkMessage::PlayerJoin { name: "Test".to_string() },
            NetworkMessage::PlayerLeave { player_id: 5 },
            NetworkMessage::Chat { player_id: 1, text: "Hi".to_string() },
            NetworkMessage::Ping { timestamp: 999 },
            NetworkMessage::Pong { timestamp: 888 },
            NetworkMessage::Welcome { player_id: 0, tick_rate: 10 },
        ];
        for msg in messages {
            let json = serialize(&msg).unwrap();
            let roundtrip = deserialize(&json).unwrap();
            assert_eq!(msg, roundtrip);
        }
    }

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
        assert_eq!(mgr.outgoing_count(), 0);
    }

    #[test]
    fn test_network_manager_receive() {
        let mut mgr = NetworkManager::new();
        mgr.inject_incoming(NetworkMessage::Chat { player_id: 1, text: "test".to_string() });
        let msgs = mgr.receive();
        assert_eq!(msgs.len(), 1);
        assert_eq!(mgr.incoming_count(), 0);
    }

    #[test]
    fn test_network_manager_drain_outgoing() {
        let mut mgr = NetworkManager::new();
        mgr.connect("ws://localhost:8080");
        mgr.send(NetworkMessage::Ping { timestamp: 123 });
        let outgoing = mgr.drain_outgoing();
        assert_eq!(outgoing.len(), 1);
        assert_eq!(mgr.outgoing_count(), 0);
    }

    #[test]
    fn test_network_manager_process_welcome() {
        let mut mgr = NetworkManager::new();
        let handled = mgr.process_message(NetworkMessage::Welcome { player_id: 42, tick_rate: 20 });
        assert!(handled);
        assert_eq!(mgr.player_id(), Some(42));
        assert_eq!(mgr.tick_rate(), 20);
        assert_eq!(mgr.state(), &ConnectionState::Connected);
    }

    #[test]
    fn test_network_manager_process_ping() {
        let mut mgr = NetworkManager::new();
        mgr.connect("ws://localhost:8080");
        let handled = mgr.process_message(NetworkMessage::Ping { timestamp: 999 });
        assert!(handled);
        let outgoing = mgr.drain_outgoing();
        assert_eq!(outgoing.len(), 1);
        match &outgoing[0] {
            NetworkMessage::Pong { timestamp } => assert_eq!(*timestamp, 999),
            _ => panic!("Expected Pong"),
        }
    }

    #[test]
    fn test_network_manager_process_regular_message() {
        let mut mgr = NetworkManager::new();
        let handled = mgr.process_message(NetworkMessage::PlayerJoin { name: "Eve".to_string() });
        assert!(!handled);
        assert_eq!(mgr.incoming_count(), 1);
    }

    #[test]
    fn test_interpolator_new() {
        let interp = ClientInterpolator::new(0.1);
        assert!(!interp.can_interpolate());
        assert!(!interp.has_state());
    }

    #[test]
    fn test_interpolator_push_and_interpolate() {
        let mut interp = ClientInterpolator::new(0.1);
        let snap1 = GameStateSnapshot {
            tick: 0, players: vec![], buildings: vec![],
            units: vec![UnitState { id: 1, kind: 0, x: 0.0, y: 0.0, hp: 50, owner_id: 0 }],
        };
        let snap2 = GameStateSnapshot {
            tick: 1, players: vec![], buildings: vec![],
            units: vec![UnitState { id: 1, kind: 0, x: 10.0, y: 10.0, hp: 50, owner_id: 0 }],
        };
        interp.push_snapshot(snap1, 0.0);
        assert!(interp.has_state());
        assert!(!interp.can_interpolate());
        interp.push_snapshot(snap2, 0.1);
        assert!(interp.can_interpolate());
        let pos = interp.interpolate_unit_position(1, 0.5).unwrap();
        assert!((pos.0 - 5.0).abs() < 0.01);
        assert!((pos.1 - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_interpolator_reset() {
        let mut interp = ClientInterpolator::new(0.1);
        let snap = GameStateSnapshot { tick: 0, players: vec![], buildings: vec![], units: vec![] };
        interp.push_snapshot(snap.clone(), 0.0);
        interp.push_snapshot(snap, 0.1);
        assert!(interp.can_interpolate());
        interp.reset();
        assert!(!interp.can_interpolate());
        assert!(!interp.has_state());
    }

    // Helper for interpolator tests
    fn test_snap(tick: u64, units: Vec<(u32, f32, f32)>) -> GameStateSnapshot {
        GameStateSnapshot {
            tick,
            players: vec![],
            buildings: vec![],
            units: units
                .into_iter()
                .map(|(id, x, y)| UnitState { id, kind: 0, x, y, hp: 100, owner_id: 0 })
                .collect(),
        }
    }

    #[test]
    fn test_network_manager_inject_and_receive() {
        let mut mgr = NetworkManager::new();
        let msg = NetworkMessage::Chat { player_id: 1, text: "test".to_string() };
        mgr.inject_incoming(msg.clone());
        assert_eq!(mgr.incoming_count(), 1);
        let received = mgr.receive();
        assert_eq!(received.len(), 1);
        assert_eq!(received[0], msg);
        assert_eq!(mgr.incoming_count(), 0);
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
    fn test_interpolator_snapshot_access() {
        let mut interp = ClientInterpolator::new(0.1);
        interp.push_snapshot(test_snap(0, vec![(1, 0.0, 0.0)]), 0.0);
        interp.push_snapshot(test_snap(1, vec![(2, 10.0, 0.0)]), 0.1);
        assert_eq!(interp.previous_snapshot().unwrap().tick, 0);
        assert_eq!(interp.current_snapshot().unwrap().tick, 1);
    }
}
