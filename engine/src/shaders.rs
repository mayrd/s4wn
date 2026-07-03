//! S4WN Engine WebGL2 Shaders
//!
//! Contains all the vertex and fragment shader string constants and helper macros
//! for the game's rendering pipeline (terrain, models, shadows, clouds, overlay, celestial bodies).

/// Shared day_light GLSL — `u_day_phase` uniform variant (model, sun_moon)
macro_rules! day_light_glsl_u {
    () => { "    float day_light_raw = 0.5 + 0.5 * sin((u_day_phase - 0.25) * 6.2831853);\n    float day_light = day_light_raw * day_light_raw * (3.0 - 2.0 * day_light_raw);\n" }
}
/// Shared day_light GLSL — `v_day_phase` varying variant (terrain, clouds)
macro_rules! day_light_glsl_v {
    () => { "    float day_light_raw = 0.5 + 0.5 * sin((v_day_phase - 0.25) * 6.2831853);\n    float day_light = day_light_raw * day_light_raw * (3.0 - 2.0 * day_light_raw);\n" }
}

pub const VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;
in vec3 a_position;
in vec3 a_color;
in float a_elevation;
in float a_has_resource;
in float a_slope;
in float a_edge_dist;
in float a_visibility;
in vec2 a_uv;
in float a_terrain_id;
in vec3 a_normal;
in vec4 a_splat;
in float a_ao;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_camera_center;
uniform float u_zoom;
uniform float u_day_phase;
uniform mat4 u_vp;
uniform int u_use_vp;
uniform float u_water_time;
out vec3 v_color;
out float v_elevation;
out float v_has_resource;
out float v_day_phase;
out float v_slope;
out float v_edge_dist;
out float v_visibility;
out vec2 v_uv;
out float v_terrain_id;
out vec3 v_normal;
out vec4 v_splat;
out float v_ao;
out vec2 v_world_xz;
void main() {
float x = a_position.x;
float y = a_position.y;
float elev = a_elevation;
elev += sin(u_time * 0.5 + x * 0.3 + y * 0.3) * 0.02;
if (a_terrain_id > 2.5 && a_terrain_id < 4.5) {
float wave1 = sin(u_water_time * 1.8 + x * 1.2 + y * 0.8) * 0.06;
float wave2 = sin(u_water_time * 2.4 + x * 0.5 - y * 1.1) * 0.04;
float wave3 = sin(u_water_time * 0.7 + (x + y) * 1.5) * 0.03;
float water_anim = wave1 + wave2 + wave3;
if (a_terrain_id > 3.5) {
water_anim *= 0.7;
}
elev += water_anim;
}
if (u_use_vp == 1) {
float world_y = elev * 0.5;
gl_Position = u_vp * vec4(x, world_y, y, 1.0);
} else {
float iso_x = (x - y) * 0.866;
float iso_y = (x + y) * 0.5 - elev * 0.3;
iso_x -= u_camera_center.x;
iso_y -= u_camera_center.y;
iso_x *= u_zoom;
iso_y *= u_zoom;
vec2 clip = (vec2(iso_x, iso_y) / u_resolution) * 2.0;
clip.y = -clip.y;
gl_Position = vec4(clip, 0.0, 1.0);
}
v_color = a_color;
v_elevation = elev;
v_has_resource = a_has_resource;
v_day_phase = u_day_phase;
v_slope = a_slope;
v_edge_dist = a_edge_dist;
v_uv = a_uv;
v_terrain_id = a_terrain_id;
v_visibility = a_visibility;
v_normal = a_normal;
v_splat = a_splat;
v_world_xz = a_position.xz;
v_ao = a_ao;
}
"#;

pub const FRAGMENT_SHADER: &str = concat!(
r#"#version 300 es
precision highp float;
in vec3 v_color;
in float v_elevation;
in float v_has_resource;
in float v_day_phase;
in float v_slope;
in float v_edge_dist;
in float v_visibility;
in vec2 v_uv;
in float v_terrain_id;
in vec3 v_normal;
in vec4 v_splat;
in float v_ao;
in vec2 v_world_xz;
uniform highp sampler2DArray u_terrain_textures;
uniform int u_use_textures;
uniform vec3 u_fog_color;
uniform vec3 u_light_direction;
uniform float u_water_time;
uniform sampler2D u_water_normal;
uniform float u_water_normal_ready;
uniform float u_lightning;
uniform sampler2D u_reflection_tex;
uniform int u_reflection_pass;
uniform float u_reflection_horizon_y;
uniform vec2 u_resolution;
uniform vec3 u_sun_dir;
uniform float u_god_ray_strength;
out vec4 out_color;
float cloud_shadow(float wpos_x, float wpos_z) {
    const float GRID = 6.0;
    const float OFFSET = -3.0;
    float cx = floor((wpos_x - OFFSET) / GRID) * GRID + OFFSET;
    float cz = floor((wpos_z - OFFSET) / GRID) * GRID + OFFSET;
    float h = fract(sin(cx * 127.1 + cz * 311.7 + 74.7) * 43758.547);
    if (h < 0.4) return 1.0;
    float h2 = fract(sin(cx * 269.5 + cz * 183.3 + 67.2) * 28374.123);
    float h3 = fract(sin(cx * 419.2 + cz * 357.8 + 91.3) * 19283.568);
    float cl_x = cx + h2 * GRID * 0.8;
    float cl_z = cz + h3 * GRID * 0.8;
    float cl_size = 2.0 + h * 3.0;
    float dist = length(vec2(wpos_x - cl_x, wpos_z - cl_z));
    return mix(0.72, 1.0, smoothstep(cl_size * 0.6, cl_size, dist));
}
float god_ray_factor(vec2 world_xz, vec3 sun_dir) {
    const int RAY_SAMPLES = 5;
    const float RAY_STEP = 4.0;
    float total = 0.0;
    float weight_sum = 0.0;
    for (int i = 0; i < RAY_SAMPLES; i++) {
        float t = float(i) * RAY_STEP + 2.0;
        vec2 sample_xz = world_xz + sun_dir.xz * t;
        float shadow = cloud_shadow(sample_xz.x, sample_xz.y);
        float weight = 1.0 / (1.0 + t * 0.08);
        total += shadow * weight;
        weight_sum += weight;
    }
    return total / max(weight_sum, 0.001);
}
float heat_shimmer(vec2 world_xz, float time, float day_phase) {
    float n1 = sin(world_xz.x * 4.7 + time * 2.3) * cos(world_xz.y * 3.9 - time * 1.7);
    float n2 = sin(world_xz.x * 6.1 - time * 1.3) * cos(world_xz.y * 2.8 + time * 2.1);
    return (n1 * 0.5 + n2 * 0.3) * day_phase;
}
vec2 heat_mirage_offset(vec2 world_xz, float time) {
    float n1 = sin(world_xz.x * 5.3 + time * 3.1) * cos(world_xz.y * 4.7 - time * 2.4);
    float n2 = cos(world_xz.x * 7.2 - time * 1.9) * sin(world_xz.y * 2.9 + time * 3.5);
    float ox = n1 * 0.004 + n2 * 0.003;
    float oy = cos(world_xz.x * 3.8 + time * 2.7) * sin(world_xz.y * 5.2 - time * 1.6) * 0.004;
    return vec2(ox, oy);
}
void main() {
bool is_desert = (v_terrain_id > 4.5 && v_terrain_id < 5.5);
vec3 base_color;
if (u_use_textures == 1) {
vec2 tex_uv = v_uv;
if (is_desert) {
    tex_uv += heat_mirage_offset(v_world_xz, u_water_time);
}
vec3 tex_grass = texture(u_terrain_textures, vec3(tex_uv, 0.0)).rgb;
vec3 tex_rock = texture(u_terrain_textures, vec3(tex_uv, 2.0)).rgb;
vec3 tex_sand = texture(u_terrain_textures, vec3(tex_uv, 5.0)).rgb;
vec3 tex_snow = texture(u_terrain_textures, vec3(tex_uv, 7.0)).rgb;
float w = dot(v_splat, vec4(1.0));
if (w < 0.001) w = 1.0;
base_color = (tex_grass * v_splat.r + tex_rock * v_splat.g
+ tex_sand * v_splat.b + tex_snow * v_splat.a) / w;
} else {
base_color = v_color;
}
float slope_shade = 1.0 - smoothstep(0.0, 0.4, v_slope) * 0.5;
float elev_shade = 1.0 + v_elevation * 0.1;
float shade = slope_shade * elev_shade;
"#,
day_light_glsl_v!(),
r#"float cs = cloud_shadow(v_world_xz.x, v_world_xz.y);
float warmth = 0.5 + day_light * 0.5;
vec3 n = normalize(v_normal);
vec3 l = normalize(u_light_direction);
float diffuse = max(dot(n, l), 0.0);
float ambient_base = 0.15 + day_light * 0.35 + u_lightning * 0.3;
float light = ambient_base + diffuse * 0.7;
vec3 lit = base_color * shade * light;
bool is_water = (v_terrain_id > 2.5 && v_terrain_id < 4.5);
bool is_deep_water = (v_terrain_id > 3.5);
if (u_reflection_pass == 1 && is_water) discard;
if (is_water) {
vec3 n_w = normalize(v_normal);
vec3 l_w = normalize(u_light_direction);
vec3 view_dir = vec3(0.0, 1.0, 0.0);
if (u_water_normal_ready > 0.5) {
vec2 nm_uv1 = v_uv * 4.0 + vec2(u_water_time * 0.15, u_water_time * 0.1);
vec2 nm_uv2 = v_uv * 4.0 - vec2(u_water_time * 0.12, u_water_time * 0.08) + vec2(0.33, 0.5);
vec3 nm1 = texture(u_water_normal, nm_uv1).rgb * 2.0 - 1.0;
vec3 nm2 = texture(u_water_normal, nm_uv2).rgb * 2.0 - 1.0;
vec3 nm = normalize(nm1 + nm2);
vec3 t = normalize(cross(n_w, vec3(1.0, 0.0, 0.0)));
vec3 b = normalize(cross(n_w, t));
n_w = normalize(n_w + nm.x * t * 0.6 + nm.y * b * 0.6);
view_dir = normalize(vec3(0.0, 1.0, 0.0) - nm.z * n_w * 0.3);
}
vec3 h = normalize(l_w + view_dir);
float spec_sharp = pow(max(dot(n_w, h), 0.0), 128.0);
float spec_broad = pow(max(dot(n_w, h), 0.0), 8.0);
float sun_angle = 1.0 - abs(day_light - 0.5) * 1.8;
sun_angle = clamp(sun_angle, 0.05, 1.0);
float specular_strength = (spec_sharp * 0.7 + spec_broad * 0.3) * (0.4 + day_light * 0.6) * sun_angle;
float fresnel = pow(1.0 - max(dot(n_w, view_dir), 0.0), 3.0);
fresnel = mix(0.04, 1.0, fresnel);
vec3 shallow_color = vec3(0.1, 0.45, 0.55);
vec3 deep_color = vec3(0.02, 0.12, 0.35);
float depth_t = is_deep_water ? 0.7 : 0.3;
depth_t += 0.15 * sin(u_water_time * 1.5 + v_uv.x * 6.28 + v_uv.y * 6.28);
depth_t = clamp(depth_t, 0.0, 1.0);
vec3 water_color = mix(shallow_color, deep_color, depth_t);
vec2 screen_uv = gl_FragCoord.xy / u_resolution;
screen_uv.y = 1.0 - screen_uv.y;
screen_uv.y = min(screen_uv.y, u_reflection_horizon_y);
vec3 reflection = texture(u_reflection_tex, screen_uv).rgb;
vec3 water_surface = water_color * light;
water_surface += vec3(1.0, 0.92, 0.75) * specular_strength * 0.65;
vec2 caustic_uv = v_uv * 8.0 + vec2(u_water_time * 0.12, u_water_time * 0.09);
vec3 caustic_nm = texture(u_water_normal, caustic_uv).rgb * 2.0 - 1.0;
float caustic = length(caustic_nm.xy);
caustic = smoothstep(0.25, 0.7, caustic) * 0.25;
float caustic_light = caustic * day_light * 0.35;
water_surface += vec3(0.9, 0.95, 1.0) * caustic_light;
vec3 reflected = mix(water_surface, reflection, fresnel);
lit = mix(reflected, lit * vec3(0.3, 0.5, 0.6), 0.25);
float alpha_sim = mix(0.85, 1.0, fresnel);
lit *= alpha_sim;
}
if (v_has_resource > 0.5) {
float pulse = 0.8 + 0.2 * sin((v_day_phase - 0.25) * 6.2831853 * 2.0);
vec3 glow = vec3(0.9, 0.85, 0.3) * 0.15 * pulse;
lit = lit + glow;
}
float shadow_factor = mix(1.0, cs, day_light * 0.45);
if (!is_water && v_terrain_id < 2.5) {
    lit *= shadow_factor;
}
if (!is_water && v_terrain_id < 2.5 && u_reflection_pass == 0) { // Shoreline foam
    float water_proximity = v_splat.y * 0.3 + v_splat.z * 0.2 + v_splat.w * 0.5;
    float near_water = smoothstep(0.02, 0.35, water_proximity);
    float foam_noise = sin(v_world_xz.x * 12.7 + v_world_xz.y * 17.3 + u_water_time * 2.5) * 0.5 + 0.5; // Animated foam edge
    float foam = near_water * (0.6 + foam_noise * 0.4) * day_light;
    vec3 foam_color = vec3(0.93, 0.95, 0.91);
    lit = mix(lit, foam_color, foam * 0.55);
}
float edge_dist = v_edge_dist;
float edge_zone = 8.0;
float edge_factor = smoothstep(0.0, edge_zone, edge_dist);
lit = mix(u_fog_color, lit, edge_factor);
float vis = smoothstep(0.15, 0.6, v_visibility);
lit = mix(u_fog_color, lit, vis);
float fog_max_radius = max(u_resolution.x, u_resolution.y);
float fog_screen_dist = length(gl_FragCoord.xy - u_resolution);
float fog_factor = smoothstep(fog_max_radius * 0.35, fog_max_radius * 0.78, fog_screen_dist);
float fog_strength = mix(0.05, 0.35, fog_factor) * day_light;
float elevation_fog_mod = 1.0 - smoothstep(0.0, 0.45, v_elevation) * 0.7;
fog_strength *= elevation_fog_mod;
if (u_reflection_pass == 0) {
    lit = mix(lit, u_fog_color, fog_strength);
}
if (u_reflection_pass == 0 && !is_water && u_god_ray_strength > 0.0) {
    float gr = god_ray_factor(v_world_xz, u_sun_dir);
    float gr_brightness = (1.0 - gr) * u_god_ray_strength * day_light * 0.6;
    vec3 god_ray_color = vec3(1.0, 0.95, 0.8);
    lit += god_ray_color * gr_brightness * cs;
}
if (is_desert) {
    float hs = heat_shimmer(v_world_xz, u_water_time, day_light);
    lit += lit * hs * 0.05;
    lit.r += abs(hs) * 0.01;
}
lit = mix(lit * 0.7, lit, warmth);
if (!is_water) {
lit *= v_ao;
}
float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
lit += (dither - 0.5) / 255.0;
out_color = vec4(lit, 1.0);
}
"#
);

pub const OVERLAY_VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;
in vec2 a_overlay_pos;
in vec3 a_overlay_color;
in float a_overlay_size;
uniform vec2 u_resolution;
uniform vec2 u_camera_center;
uniform float u_zoom;
out vec3 v_overlay_color;
void main() {
float x = a_overlay_pos.x;
float y = a_overlay_pos.y;
float iso_x = (x - y) * 0.866;
float iso_y = (x + y) * 0.5;
iso_x -= u_camera_center.x;
iso_y -= u_camera_center.y;
iso_x *= u_zoom;
iso_y *= u_zoom;
vec2 clip = (vec2(iso_x, iso_y) / u_resolution) * 2.0;
clip.y = -clip.y;
gl_Position = vec4(clip, 0.0, 1.0);
gl_PointSize = a_overlay_size * u_zoom;
v_overlay_color = a_overlay_color;
}
"#;

pub const OVERLAY_FRAGMENT_SHADER: &str = r#"#version 300 es
precision highp float;
in vec3 v_overlay_color;
uniform vec3 u_player_rgb;
out vec4 out_color;
void main() {
vec2 coord = gl_PointCoord - vec2(0.5);
float dist = length(coord);
if (dist > 0.5) discard;
float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
vec3 final_color = v_overlay_color;
if (u_player_rgb != vec3(0.0)) {
final_color = mix(v_overlay_color, u_player_rgb, 0.4);
}
out_color = vec4(final_color, alpha);
}
"#;

pub const MODEL_VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;
in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in mat4 a_model;
in vec3 a_offset;
in float a_anim_phase;
uniform mat4 u_vp;
uniform mat4 u_model;
uniform vec3 u_view_pos;
uniform vec3 u_light_dir;
uniform float u_use_instanced;
uniform float u_time;
out vec3 v_normal;
out vec3 v_world_pos;
out vec2 v_uv;
out vec3 v_light_dir;
out vec3 v_view_dir;
void main() {
mat4 model = (u_use_instanced > 0.5) ? a_model : u_model;
vec3 pos = a_position + a_offset;
if (a_anim_phase > 0.0 || a_anim_phase < 0.0) {
float t = u_time * 2.0 + a_anim_phase;
pos.y += sin(t) * 0.04;
pos.x += sin(t * 1.3 + 1.0) * 0.015;
pos.z += cos(t * 0.7 + 2.0) * 0.015;
}
vec4 world_pos = model * vec4(pos, 1.0);
v_world_pos = world_pos.xyz;
v_normal = normalize(mat3(model) * a_normal);
v_uv = a_uv;
v_light_dir = normalize(u_light_dir);
v_view_dir = normalize(u_view_pos - world_pos.xyz);
gl_Position = u_vp * world_pos;
}
"#;

pub const MODEL_FRAGMENT_SHADER: &str = concat!(
r#"#version 300 es
precision highp float;
in vec3 v_normal;
in vec3 v_world_pos;
in vec2 v_uv;
in vec3 v_light_dir;
in vec3 v_view_dir;
uniform vec4 u_model_color;
uniform float u_roughness;
uniform float u_metallic;
uniform highp sampler2DArray u_terrain_textures;
uniform int u_use_textures;
uniform float u_day_phase;
out vec4 out_color;
void main() {
vec3 N = normalize(v_normal);
vec3 L = normalize(v_light_dir);
vec3 V = normalize(v_view_dir);
vec3 H = normalize(L + V);
if (u_use_textures == 1) {
float detail_scale = 12.0;
float detail_strength = 0.18;
vec3 p = v_world_pos * detail_scale + vec3(v_uv.x, v_uv.y, 0.0) * 3.0;
float eps = 0.008;
float h0 = fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
float hx = fract(sin(dot(p + vec3(eps, 0.0, 0.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
float hy = fract(sin(dot(p + vec3(0.0, eps, 0.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
float nx = (hx - h0) / eps;
float ny = (hy - h0) / eps;
vec3 up = vec3(0.0, 1.0, 0.0);
if (abs(dot(N, up)) > 0.999) { up = vec3(1.0, 0.0, 0.0); }
vec3 T = normalize(cross(up, N));
vec3 B = normalize(cross(N, T));
N = normalize(N + detail_strength * (nx * T + ny * B));
}
vec3 base_albedo;
if (u_use_textures == 1) {
vec3 tex_sample = texture(u_terrain_textures, vec3(v_uv, 0.0)).rgb;
base_albedo = tex_sample * u_model_color.rgb;
} else {
base_albedo = u_model_color.rgb;
}
float NdotL = max(dot(N, L), 0.0);
vec3 diffuse = base_albedo * NdotL;
"#,
day_light_glsl_u!(),
r#"float ambient_scale = 0.10 + day_light * 0.40;
float hemi_factor = 0.5 + 0.5 * N.y;
vec3 sky_ambient = vec3(0.6, 0.7, 0.9) * ambient_scale;
vec3 ground_ambient = vec3(0.3, 0.25, 0.2) * ambient_scale;
vec3 ambient = base_albedo * mix(ground_ambient, sky_ambient, hemi_factor);
float NdotH = max(dot(N, H), 0.0);
float spec = pow(NdotH, 2.0 / (u_roughness * u_roughness + 0.001));
vec3 specular = mix(vec3(0.04), base_albedo, u_metallic) * spec * 0.5;
float roof_factor = smoothstep(0.65, 0.85, N.y);
float roof_spec = pow(NdotH, 64.0) * roof_factor;
vec3 roof_specular = vec3(1.0, 0.96, 0.85) * roof_spec * 0.35 * day_light;
float rim = 1.0 - abs(dot(N, V));
rim = pow(rim, 3.0);
vec3 rim_color = mix(vec3(0.1, 0.15, 0.25), vec3(0.4, 0.35, 0.25), day_light) * 0.25;
vec3 final_color = ambient + diffuse + specular + roof_specular + rim_color * rim;
out_color = vec4(final_color, u_model_color.a);
}
"#
);

pub const SHADOW_VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;
in vec2 a_shadow_vert;
uniform mat4 u_vp;
uniform vec3 u_instance_pos;
uniform vec3 u_light_dir;
uniform float u_shadow_size;
uniform float u_shadow_penumbra;
out float v_dist;
out float v_penumbra;
void main() {
vec3 center = vec3(u_instance_pos.x, 0.02, u_instance_pos.z);
center.xz -= u_light_dir.xz * u_instance_pos.y * 0.35;
vec3 corner = center;
corner.x += a_shadow_vert.x * u_shadow_size;
corner.z += a_shadow_vert.y * u_shadow_size;
v_dist = length(a_shadow_vert);
v_penumbra = u_shadow_penumbra;
gl_Position = u_vp * vec4(corner, 1.0);
}
"#;

pub const SHADOW_FRAGMENT_SHADER: &str = r#"#version 300 es
precision highp float;
in float v_dist;
in float v_penumbra;
out vec4 out_color;
float hash(vec2 p) {
return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
float d = v_dist;
float p = v_penumbra;
float core = smoothstep(0.40, 0.15, d);
float mid = smoothstep(0.70, 0.30, d);
float outer = smoothstep(1.00, 0.55, d);
float alpha = core * 0.35;
alpha = mix(alpha, mid * 0.20, p * 0.8);
alpha = mix(alpha, outer * 0.06, p * 0.5);
float dither = (hash(gl_FragCoord.xy) - 0.5) * 0.04 * p;
alpha = clamp(alpha + dither, 0.0, 0.42);
out_color = vec4(0.0, 0.0, 0.0, alpha);
}
"#;

pub const CLOUD_VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;
in vec3 a_cloud_pos;
in vec2 a_cloud_size;
in float a_cloud_alpha;
in vec2 a_corner;
uniform mat4 u_vp;
uniform vec2 u_cam_parallax;
uniform float u_day_phase;
out float v_alpha;
out float v_day_phase;
out vec2 v_quad_coord;
void main() {
vec3 pos = a_cloud_pos;
pos.xz += u_cam_parallax * 0.15;
vec2 corner = a_corner;
pos.xy += corner * a_cloud_size * 0.5;
v_quad_coord = corner;
v_alpha = a_cloud_alpha;
v_day_phase = u_day_phase;
gl_Position = u_vp * vec4(pos, 1.0);
}
"#;

pub const CLOUD_FRAGMENT_SHADER: &str = concat!(
r#"#version 300 es
precision highp float;
in float v_alpha;
in float v_day_phase;
in vec2 v_quad_coord;
out vec4 out_color;
void main() {
float d = length(v_quad_coord);
float shape = smoothstep(1.0, 0.2, d);
"#,
day_light_glsl_v!(),
r#"vec3 day_color = vec3(0.95, 0.95, 0.97);
vec3 night_color = vec3(0.18, 0.20, 0.28);
vec3 cloud_color = mix(night_color, day_color, day_light);
float alpha = shape * v_alpha * 0.45;
out_color = vec4(cloud_color, alpha);
}
"#
);

pub const SUN_MOON_VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;
uniform vec2 u_sun_screen_pos;
uniform float u_sun_radius;
out vec2 v_quad_coord;
void main() {
int vid = gl_VertexID % 6;
vec2 corner;
if (vid == 0) corner = vec2(-1.0, -1.0);
else if (vid == 1) corner = vec2( 1.0, -1.0);
else if (vid == 2) corner = vec2( 1.0, 1.0);
else if (vid == 3) corner = vec2(-1.0, -1.0);
else if (vid == 4) corner = vec2( 1.0, 1.0);
else corner = vec2(-1.0, 1.0);
v_quad_coord = corner;
gl_Position = vec4(u_sun_screen_pos + corner * u_sun_radius, 0.999, 1.0);
}
"#;

pub const SUN_MOON_FRAGMENT_SHADER: &str = concat!(
r#"#version 300 es
precision highp float;
in vec2 v_quad_coord;
uniform float u_day_phase;
uniform int u_is_moon;
out vec4 out_color;
void main() {
float d = length(v_quad_coord);
float disc = smoothstep(1.0, 0.85, d);
"#,
day_light_glsl_u!(),
r#"vec3 color;
float alpha;
if (u_is_moon == 0) {
vec3 sun_bright = vec3(1.0, 0.95, 0.85);
vec3 sun_warm = vec3(1.0, 0.75, 0.4);
float horizon_factor = 1.0 - day_light;
color = mix(sun_bright, sun_warm, horizon_factor * 0.5);
alpha = disc * smoothstep(-0.1, 0.2, day_light);
float glow = exp(-d * d * 2.0) * 0.3 * max(day_light, 0.1);
color += vec3(1.0, 0.9, 0.6) * glow;
} else {
vec3 moon_color = vec3(0.85, 0.88, 0.95);
color = moon_color;
alpha = disc * smoothstep(0.2, -0.05, day_light);
float glow = exp(-d * d * 3.0) * 0.15 * (1.0 - day_light);
color += vec3(0.7, 0.8, 1.0) * glow;
}
alpha = clamp(alpha, 0.0, 1.0);
out_color = vec4(color, alpha);
}
"#
);
