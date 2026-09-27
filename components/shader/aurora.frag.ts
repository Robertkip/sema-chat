/**
 * Aurora hero — fragment shader, GLSL ES 1.00.
 *
 * Runs once per pixel per frame. The whole image is a function of three
 * uniforms and nothing else: where the pixel is, what time it is, and where
 * the cursor is. There is no geometry — the scene is a single fullscreen
 * triangle and all the shape comes from maths below.
 */
export const AURORA_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec2  u_resolution;  // canvas size in device pixels
uniform float u_time;        // seconds since start
uniform vec2  u_mouse;       // cursor in 0..1, (0.5,0.5) when untouched

/* ---------------------------------------------------------------------------
   1. Hash → value noise → fbm

   hash() turns a 2D coordinate into a repeatable pseudo-random float. It is
   not "random": the same input always gives the same output, which is what
   makes the animation stable rather than flickering.

   noise() samples that hash at the four corners of the cell a point falls in
   and blends between them. The smoothstep-style curve (f*f*(3-2f)) is what
   stops the result looking like a grid of squares.

   fbm() — fractal Brownian motion — sums several octaves of noise, each at
   double the frequency and half the amplitude. Large shapes come from the
   first octave, fine detail from the last. Four is enough here; more octaves
   cost frame time and stop being visible.
--------------------------------------------------------------------------- */

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p = p * 2.02;   // slightly off 2.0 so octaves do not line up into a grid
    amp *= 0.5;
  }
  return sum;
}

void main() {
  /* -------------------------------------------------------------------------
     2. Coordinates

     gl_FragCoord is in pixels. Dividing by the short edge gives coordinates
     that are centred on 0 and have the same scale on both axes, so the
     pattern does not stretch when the window changes shape.
  ------------------------------------------------------------------------- */
  vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  // The cursor leans the whole flow field. Clamped small on purpose: a strong
  // lean reads as the image sliding about rather than responding.
  vec2 lean = (u_mouse - 0.5) * 0.55;

  /* -------------------------------------------------------------------------
     3. Domain warping

     Rather than colouring by fbm(p) directly, fbm is sampled at a position
     that has itself been displaced by another fbm. That is what turns smooth
     blobs into the folded, curtain-like structure an aurora has. Sampling the
     second noise at a different offset keeps the two axes from correlating.
  ------------------------------------------------------------------------- */
  float t = u_time * 0.06;

  vec2 q = vec2(
    fbm(p * 1.4 + vec2(0.0, t)),
    fbm(p * 1.4 + vec2(3.2, 1.7) - t)
  );

  float f = fbm(p * 1.1 + 1.5 * q + lean);

  /* -------------------------------------------------------------------------
     4. Bands

     A sine across the vertical axis, with the warped noise added to its phase.
     Without the noise term this is flat stripes; with it, the stripes bend
     along the same structure as the colour, which is what makes them read as
     one object rather than an overlay.
  ------------------------------------------------------------------------- */
  float band = sin((p.y * 1.8 + f * 3.0 + u_time * 0.25) * 2.2) * 0.5 + 0.5;

  /* -------------------------------------------------------------------------
     5. Palette

     Deliberately dark. This sits behind a headline, so the design constraint
     is contrast, not brightness — the brightest point stays well under white
     so text above it keeps its ratio.
  ------------------------------------------------------------------------- */
  vec3 deep  = vec3(0.020, 0.026, 0.055);
  vec3 blue  = vec3(0.110, 0.260, 0.640);
  vec3 cyan  = vec3(0.330, 0.640, 0.920);

  vec3 col = mix(deep, blue, smoothstep(0.10, 0.80, f));
  col = mix(col, cyan, pow(band, 2.4) * 0.60);

  // A second, tighter band gives the curtain a bright leading edge — the
  // detail that reads as "aurora" rather than "blue gradient".
  float edge = pow(band, 12.0) * smoothstep(0.35, 0.9, f);
  col += cyan * edge * 0.45;

  // Vignette: darkens the edges, and holds the lower-left down where the
  // headline sits. Biased upward so the brightest curtain stays clear of it.
  float vig = smoothstep(1.70, 0.10, length(p - vec2(0.0, 0.35)));
  col *= mix(0.30, 1.0, vig);

  /* -------------------------------------------------------------------------
     6. Grain

     A per-pixel hash offset by time. Breaks up the banding that 8-bit colour
     produces across a slow gradient — without it the sky shows visible steps.
     Kept very low; grain is a texture, not an effect.
  ------------------------------------------------------------------------- */
  col += (hash(gl_FragCoord.xy + fract(u_time) * 100.0) - 0.5) * 0.028;

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Vertex shader: draws one triangle that covers the screen.
 *
 * A fullscreen triangle rather than two triangles forming a quad — it avoids
 * the diagonal seam where a quad's two triangles meet, and the GPU shades one
 * primitive instead of two.
 */
export const AURORA_VERTEX = /* glsl */ `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
