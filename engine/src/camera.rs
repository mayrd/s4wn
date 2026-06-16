//! S4WN Camera Module
//!
//! Isometric camera with pan (mouse drag) and zoom (scroll wheel).
//! Transforms world coordinates to screen coordinates using
//! standard isometric projection.

/// Camera state for isometric rendering
#[derive(Debug, Clone)]
pub struct Camera {
    /// World-space center of the view (tile coordinates)
    pub center_x: f32,
    pub center_y: f32,
    /// Zoom level (1.0 = default, higher = zoomed in)
    pub zoom: f32,
    /// Viewport dimensions in pixels
    pub viewport_width: u32,
    pub viewport_height: u32,
    // Smoothing state for pan
    target_x: f32,
    target_y: f32,
    target_zoom: f32,
}

impl Camera {
    /// Isometric projection constants
    /// cos(30°) ≈ 0.866, sin(30°) = 0.5
    const ISO_COS: f32 = 0.8660254;
    const ISO_SIN: f32 = 0.5;

    /// Create a new camera centered on the given world position
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

        // dx on screen = ISO_COS * (dx_world - dy_world)
        // dy on screen = ISO_SIN  * (dx_world + dy_world)
        // Solving:
        // dx_world = dx_screen * inv_cos + dy_screen * inv_sin
        // dy_world = dy_screen * inv_sin - dx_screen * inv_cos
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

    /// Apply smooth interpolation toward the target (call each frame)
    pub fn update(&mut self, dt: f32) {
        let lerp = (dt * 8.0).min(1.0); // smooth over ~125ms
        self.center_x += (self.target_x - self.center_x) * lerp;
        self.center_y += (self.target_y - self.center_y) * lerp;
        self.zoom += (self.target_zoom - self.zoom) * lerp;
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
}
