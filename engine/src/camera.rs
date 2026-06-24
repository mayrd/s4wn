//! S4WN Camera Module
//!
//! Phase 4: Isometric camera with pan (mouse drag) and zoom (scroll wheel).
//! Phase 5: Orbital camera — spherical coordinates around a focus point.
//! Transforms world coordinates to screen coordinates using
//! standard isometric projection (legacy) or perspective LookAt (orbital).

/// Camera state for isometric rendering (legacy) and orbital view (Phase 5).
///
/// The orbital camera orbits a world-space focus point. Three spherical
/// coordinates define the view: azimuth (theta), elevation (phi), distance (d).
/// The classic isometric angle is the default (theta=45 deg, phi=35.264 deg, d=20).
#[derive(Debug, Clone)]
pub struct Camera {
    /// World-space center of the view (tile coordinates) — legacy iso center
    pub center_x: f32,
    pub center_y: f32,
    /// Zoom level (1.0 = default, higher = zoomed in) — legacy iso zoom
    pub zoom: f32,
    /// Viewport dimensions in pixels
    pub viewport_width: u32,
    pub viewport_height: u32,
    // Smoothing state for pan
    target_x: f32,
    target_y: f32,
    target_zoom: f32,

    // ── Phase 5: Orbital camera parameters ─────────────────────────────
    /// Horizontal rotation around focus point, degrees (0–360)
    pub azimuth: f32,
    /// Vertical angle above horizon, degrees (10–80); classic iso angle = atan(1/sqrt(2)) ~ 35.264°
    pub elevation: f32,
    /// Distance from focus point, tile units (2–100)
    pub distance: f32,
    // Smoothing targets for orbital params
    target_azimuth: f32,
    target_elevation: f32,
    target_distance: f32,
}

impl Camera {
    /// Isometric projection constants
    /// cos(30°) ≈ 0.866, sin(30°) = 0.5
    const ISO_COS: f32 = 0.8660254;
    const ISO_SIN: f32 = 0.5;

    /// Create a new camera centered on the given world position.
    /// Orbital defaults: azimuth=45°, elevation=35.264° (classic iso angle), distance=20 tiles.
    pub fn new(center_x: f32, center_y: f32, viewport_width: u32, viewport_height: u32) -> Self {
        Camera {
            center_x,
            center_y,
            zoom: 1.0,
            viewport_width,
            viewport_height,
            target_x: center_x,
            target_y: center_y,
            target_zoom: 1.0,
            // Phase 5 orbital defaults
            azimuth: 45.0,
            elevation: 35.264,
            distance: 20.0,
            target_azimuth: 45.0,
            target_elevation: 35.264,
            target_distance: 20.0,
        }
    }

    /// Set camera center (immediate, no smoothing)
    pub fn set_center(&mut self, x: f32, y: f32) {
        self.center_x = x;
        self.center_y = y;
        self.target_x = x;
        self.target_y = y;
    }

    /// Set zoom level (clamped)
    pub fn set_zoom(&mut self, zoom: f32) {
        self.target_zoom = zoom.clamp(0.25, 4.0);
        self.zoom = self.target_zoom;
    }

    /// Pan the camera by a delta in screen pixels.
    /// Converts screen delta to world delta using inverse isometric projection.
    pub fn pan_screen(&mut self, dx: f32, dy: f32) {
        // Inverse isometric: screen dx → world dx, dy
        let inv_cos = 1.0 / (2.0 * Self::ISO_COS);
        let inv_sin = 1.0 / (2.0 * Self::ISO_SIN);

        let scale = base_tile_size() * self.zoom;
        let dsx = dx / scale;
        let dsy = dy / scale;

        let world_dx = dsx * inv_cos + dsy * inv_sin;
        let world_dy = dsy * inv_sin - dsx * inv_cos;

        self.target_x -= world_dx;
        self.target_y -= world_dy;
    }

    /// Zoom by a multiplicative factor (centered on screen center)
    pub fn zoom_by(&mut self, factor: f32) {
        self.target_zoom = (self.target_zoom * factor).clamp(0.25, 4.0);
    }

    /// Apply smooth interpolation toward the target (call each frame).
    /// Also smooths orbital parameters (azimuth, elevation, distance).
    pub fn update(&mut self, dt: f32) {
        let lerp = (dt * 8.0).min(1.0); // smooth over ~125ms
        self.center_x += (self.target_x - self.center_x) * lerp;
        self.center_y += (self.target_y - self.center_y) * lerp;
        self.zoom += (self.target_zoom - self.zoom) * lerp;
        // Orbital smoothing
        self.azimuth += (self.target_azimuth - self.azimuth) * lerp;
        self.elevation += (self.target_elevation - self.elevation) * lerp;
        self.distance += (self.target_distance - self.distance) * lerp;
    }

    /// Convert world tile coordinates to screen pixel coordinates
    pub fn world_to_screen(&self, wx: f32, wy: f32, elevation: f32) -> (f32, f32) {
        let tile_size = base_tile_size() * self.zoom;

        // Offset relative to camera center
        let dx = wx - self.center_x;
        let dy = wy - self.center_y;

        // Isometric projection
        let sx = (dx - dy) * Self::ISO_COS * tile_size;
        let sy = (dx + dy) * Self::ISO_SIN * tile_size - elevation * 20.0 * self.zoom;

        // Center on viewport
        let px = sx + self.viewport_width as f32 * 0.5;
        let py = sy + self.viewport_height as f32 * 0.25; // bias toward top for iso feel

        (px, py)
    }

    /// Convert screen pixel coordinates to world tile coordinates.
    /// Returns the world position (ignoring elevation — assumes ground level).
    pub fn screen_to_world(&self, sx: f32, sy: f32) -> (f32, f32) {
        let tile_size = base_tile_size() * self.zoom;

        // Un-center
        let csx = sx - self.viewport_width as f32 * 0.5;
        let csy = sy - self.viewport_height as f32 * 0.25;

        let inv_cos = 1.0 / Self::ISO_COS;
        let inv_sin = 1.0 / Self::ISO_SIN;

        let wx = (csx * inv_cos + csy * inv_sin) / tile_size;
        let wy = (csy * inv_sin - csx * inv_cos) / tile_size;

        (wx + self.center_x, wy + self.center_y)
    }

    /// Get the visible tile range for frustum culling.
    /// Returns (min_x, max_x, min_y, max_y) in tile coordinates.
    pub fn visible_bounds(
        &self,
        map_width: usize,
        map_height: usize,
    ) -> (usize, usize, usize, usize) {
        let tile_size = base_tile_size() * self.zoom;
        let extra = (1.0 / self.zoom).ceil() as usize + 2;

        // Approximate: screen corners → world
        let half_w = self.viewport_width as f32 * 0.5 / tile_size;
        let half_h = self.viewport_height as f32 * 0.5 / tile_size / Self::ISO_SIN;
        let margin = half_w.max(half_h).ceil() as usize + extra;

        let min_x = (self.center_x as isize - margin as isize).max(0) as usize;
        let max_x = (self.center_x as usize + margin).min(map_width - 1);
        let min_y = (self.center_y as isize - margin as isize).max(0) as usize;
        let max_y = (self.center_y as usize + margin).min(map_height - 1);

        (min_x, max_x, min_y, max_y)
    }

    // ── Phase 5: Orbital Camera Methods ────────────────────────────────

    /// Set the azimuth angle (horizontal orbit around focus point), degrees.
    /// Wraps to [0, 360).
    pub fn set_azimuth(&mut self, degrees: f32) {
        self.target_azimuth = degrees % 360.0;
        if self.target_azimuth < 0.0 {
            self.target_azimuth += 360.0;
        }
    }

    /// Set the elevation angle (vertical angle above horizon), degrees.
    /// Clamped to [10, 80] to prevent gimbal lock and underground views.
    pub fn set_elevation(&mut self, degrees: f32) {
        self.target_elevation = degrees.clamp(10.0, 80.0);
    }

    /// Set the distance from the focus point, tile units.
    /// Clamped to [2, 100].
    pub fn set_distance(&mut self, dist: f32) {
        self.target_distance = dist.clamp(2.0, 100.0);
    }

    /// Set the focus point (world-space) around which the camera orbits.
    pub fn set_focus(&mut self, x: f32, y: f32) {
        self.target_x = x;
        self.target_y = y;
    }

    /// Compute the camera eye position in world-space from spherical coordinates.
    /// Formula: eye.x = focus.x + d * cos(phi) * sin(theta)
    ///          eye.y = focus.y + d * sin(phi)
    ///          eye.z = focus.z + d * cos(phi) * cos(theta)
    /// where z corresponds to the out-of-screen axis in our 2D world.
    pub fn eye(&self) -> (f32, f32, f32) {
        let theta = self.azimuth.to_radians();
        let phi = self.elevation.to_radians();
        let d = self.distance;
        let fx = self.center_x;
        let fy = self.center_y;
        (
            fx + d * phi.cos() * theta.sin(),
            fy + d * phi.sin(),
            0.0 + d * phi.cos() * theta.cos(),
        )
    }

    /// Returns the look-at target (the focus point on the ground plane).
    pub fn look_at_target(&self) -> (f32, f32, f32) {
        (self.center_x, self.center_y, 0.0)
    }

    /// Convert world tile coordinates to 3D clip-space (perspective projection).
    /// Returns (x, y, z, w) in homogeneous clip coordinates.
    /// This is the Phase 5 replacement for the legacy isometric world_to_screen().
    pub fn world_to_clip(&self, wx: f32, wy: f32, _elevation: f32) -> (f32, f32, f32, f32) {
        let (ex, ey, ez) = self.eye();
        let (tx, ty, tz) = self.look_at_target();

        // LookAt basis vectors
        let fwd = normalize(tx - ex, ty - ey, tz - ez);
        let up = (0.0f32, 1.0f32, 0.0f32);
        let right = normalize(
            fwd.1 * up.2 - fwd.2 * up.1,
            fwd.2 * up.0 - fwd.0 * up.2,
            fwd.0 * up.1 - fwd.1 * up.0,
        );
        let cam_up = (
            right.1 * fwd.2 - right.2 * fwd.1,
            right.2 * fwd.0 - right.0 * fwd.2,
            right.0 * fwd.1 - right.1 * fwd.0,
        );

        // Translate world point to camera space
        let dx = wx - ex;
        let dy = wy - ey;
        let dz = 0.0 - ez;

        let cam_x = right.0 * dx + right.1 * dy + right.2 * dz;
        let cam_y = cam_up.0 * dx + cam_up.1 * dy + cam_up.2 * dz;
        let cam_z = -fwd.0 * dx - fwd.1 * dy - fwd.2 * dz;

        // Perspective projection
        let aspect = self.viewport_width as f32 / self.viewport_height as f32;
        let fov = 45.0f32.to_radians();
        let near = 0.1;
        let far = 500.0;
        let f = 1.0 / (fov * 0.5).tan();
        let range_inv = 1.0 / (near - far);

        let clip_x = cam_x * f / aspect;
        let clip_y = cam_y * f;
        let clip_z = (near + far) * range_inv * cam_z + 2.0 * near * far * range_inv;
        let clip_w = -cam_z;

        (clip_x, clip_y, clip_z, clip_w)
    }

    /// Snap camera to classic isometric view:
    /// azimuth=45°, elevation=35.264° (atan(1/sqrt(2))), distance defaults to 20.
    pub fn snap_to_isometric(&mut self) {
        self.target_azimuth = 45.0;
        self.target_elevation = 35.264;
        self.target_distance = 20.0;
        self.azimuth = self.target_azimuth;
        self.elevation = self.target_elevation;
        self.distance = self.target_distance;
    }
}

/// Normalize a 3D vector to unit length.
fn normalize(x: f32, y: f32, z: f32) -> (f32, f32, f32) {
    let len = (x * x + y * y + z * z).sqrt();
    if len < 1e-10 {
        (0.0, 0.0, 1.0)
    } else {
        (x / len, y / len, z / len)
    }
}

/// Base tile size in screen pixels at zoom=1.0
pub fn base_tile_size() -> f32 {
    48.0
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_world_to_screen_roundtrip() {
        let cam = Camera::new(10.0, 10.0, 800, 600);
        let (sx, sy) = cam.world_to_screen(10.0, 10.0, 0.0);
        let (wx, wy) = cam.screen_to_world(sx, sy);
        assert!((wx - 10.0).abs() < 0.001, "wx = {}", wx);
        assert!((wy - 10.0).abs() < 0.001, "wy = {}", wy);
    }

    #[test]
    fn test_zoom_clamp() {
        let mut cam = Camera::new(0.0, 0.0, 800, 600);
        cam.set_zoom(0.1);
        assert!(cam.zoom >= 0.25);
        cam.set_zoom(10.0);
        assert!(cam.zoom <= 4.0);
    }

    #[test]
    fn test_pan() {
        let mut cam = Camera::new(5.0, 5.0, 800, 600);
        let (_, _sy) = cam.world_to_screen(5.0, 5.0, 0.0);
        // Pan right by 100px should move center
        cam.pan_screen(-100.0, 0.0);
        cam.update(1.0);
        assert!(cam.target_x > 5.0, "Camera should pan right");
    }

    #[test]
    fn test_visible_bounds() {
        let cam = Camera::new(16.0, 16.0, 800, 600);
        let (min_x, max_x, min_y, max_y) = cam.visible_bounds(32, 32);
        assert!(min_x < max_x);
        assert!(min_y < max_y);
        assert!(max_x < 32);
        assert!(max_y < 32);
    }

    // ── Phase 5: Orbital Camera Tests ──────────────────────────────────

    #[test]
    fn test_orbital_defaults() {
        let cam = Camera::new(10.0, 10.0, 800, 600);
        assert!((cam.azimuth - 45.0).abs() < 0.01);
        assert!((cam.elevation - 35.264).abs() < 0.01);
        assert!((cam.distance - 20.0).abs() < 0.01);
    }

    #[test]
    fn test_set_azimuth_wraps() {
        let mut cam = Camera::new(0.0, 0.0, 800, 600);
        cam.set_azimuth(400.0);
        assert!((cam.target_azimuth - 40.0).abs() < 0.01);
        cam.set_azimuth(-50.0);
        assert!((cam.target_azimuth - 310.0).abs() < 0.01);
    }

    #[test]
    fn test_set_elevation_clamped() {
        let mut cam = Camera::new(0.0, 0.0, 800, 600);
        cam.set_elevation(5.0);
        assert!((cam.target_elevation - 10.0).abs() < 0.01);
        cam.set_elevation(90.0);
        assert!((cam.target_elevation - 80.0).abs() < 0.01);
        cam.set_elevation(45.0);
        assert!((cam.target_elevation - 45.0).abs() < 0.01);
    }

    #[test]
    fn test_set_distance_clamped() {
        let mut cam = Camera::new(0.0, 0.0, 800, 600);
        cam.set_distance(1.0);
        assert!((cam.target_distance - 2.0).abs() < 0.01);
        cam.set_distance(200.0);
        assert!((cam.target_distance - 100.0).abs() < 0.01);
        cam.set_distance(30.0);
        assert!((cam.target_distance - 30.0).abs() < 0.01);
    }

    #[test]
    fn test_eye_classic_iso() {
        let cam = Camera::new(10.0, 10.0, 800, 600);
        let (_ex, ey, ez) = cam.eye();
        assert!(ey > 10.0, "Camera should be above ground, got ey={}", ey);
        assert!(ez > 0.0, "Camera should be behind scene, got ez={}", ez);
    }

    #[test]
    fn test_eye_moves_with_azimuth() {
        let mut cam = Camera::new(10.0, 10.0, 800, 600);
        let (_ex1, _, ez1) = cam.eye();
        cam.set_azimuth(135.0);
        cam.azimuth = cam.target_azimuth;
        let (_ex2, _, ez2) = cam.eye();
        // At az=45: camera behind (positive z); at az=135: camera in front (negative z)
        assert!(ez1 > 0.0, "At az=45, camera should be behind scene (ez={})", ez1);
        assert!(ez2 < 0.0, "At az=135, camera should be in front (ez={})", ez2);
    }

    #[test]
    fn test_eye_elevation_affects_height() {
        let mut cam = Camera::new(10.0, 10.0, 800, 600);
        cam.set_elevation(10.0);
        cam.elevation = cam.target_elevation;
        let (_, ey_low, _) = cam.eye();
        cam.set_elevation(70.0);
        cam.elevation = cam.target_elevation;
        let (_, ey_high, _) = cam.eye();
        assert!(ey_high > ey_low, "Higher elevation should mean higher eye Y");
    }

    #[test]
    fn test_world_to_clip_produces_valid_w() {
        let cam = Camera::new(10.0, 10.0, 800, 600);
        let (_cx, _cy, _cz, cw) = cam.world_to_clip(10.0, 10.0, 0.0);
        assert!(cw > 0.0, "clip w should be positive, got {}", cw);
    }

    #[test]
    fn test_snap_to_isometric() {
        let mut cam = Camera::new(10.0, 10.0, 800, 600);
        cam.set_azimuth(90.0);
        cam.set_elevation(60.0);
        cam.set_distance(50.0);
        cam.azimuth = cam.target_azimuth;
        cam.elevation = cam.target_elevation;
        cam.distance = cam.target_distance;
        cam.snap_to_isometric();
        assert!((cam.azimuth - 45.0).abs() < 0.01);
        assert!((cam.elevation - 35.264).abs() < 0.01);
        assert!((cam.distance - 20.0).abs() < 0.01);
    }

    #[test]
    fn test_orbit_lerp_smoothing() {
        let mut cam = Camera::new(10.0, 10.0, 800, 600);
        cam.set_azimuth(90.0);
        assert!((cam.target_azimuth - 90.0).abs() < 0.01);
        assert!((cam.azimuth - 45.0).abs() < 0.01);
        cam.update(0.016);
        assert!(cam.azimuth > 45.0);
        assert!(cam.azimuth < 90.0);
    }
}
