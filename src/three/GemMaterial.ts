/**
 * Gemstone material.
 *
 * `MeshPhysicalMaterial.transmission` is a screen-space effect: it refracts
 * whatever the framebuffer already holds behind the object. Behind these stones
 * is a flat studio backdrop, so every facet refracts the same cream value and
 * the stone renders as uniform milk no matter how the thickness is tuned. That
 * is a structural limit, not a tuning problem — offline renderers get their look
 * by tracing real internal bounces against a full environment.
 *
 * So this samples the environment cubemap directly instead:
 *
 *   - refract the view ray into the stone, once per colour channel at slightly
 *     different IOR, which is where the rainbow "fire" comes from;
 *   - bounce it once off the pavilion, which is what turns light back toward
 *     the viewer and gives a brilliant cut its brilliance;
 *   - mix that against a Fresnel-weighted mirror reflection of the same
 *     environment, which supplies the hard white glints on the crown.
 *
 * Because the sampled direction swings hard as a facet turns, neighbouring
 * facets land on very different parts of the environment — that difference is
 * what the eye reads as a diamond rather than as glass.
 */
import * as THREE from "three";

/**
 * Refractive index of diamond per channel. Diamond's dispersion (0.044) is the
 * spread between red and violet, and it is unusually high — that spread is
 * exactly why diamond throws colour and glass does not.
 */
const IOR_RGB = new THREE.Vector3(2.407, 2.426, 2.451);

const vertexShader = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;
  // The ring is scaled uniformly, so the model matrix rotates normals correctly
  // once renormalised; no separate normal matrix is needed.
  vWorldNormal = normalize( mat3( modelMatrix ) * normal );
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform samplerCube envMap;
uniform float envIntensity;
uniform vec3 iorRGB;
uniform vec3 tint;
uniform float pavilion;
uniform float reflectivity;
uniform float brightness;
uniform float debugMode;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

/**
 * Direction the light arrives from, for one channel: into the stone, one bounce
 * off the far side, then out into the environment.
 */
vec3 gemDirection( vec3 incident, vec3 normal, float ior ) {
  vec3 dir = refract( incident, normal, 1.0 / ior );

  // Two internal bounces, not one. A single bounce leaves the exit direction
  // close to a linear function of the facet normal, so every facet samples a
  // similar patch of environment and the crown reads as flat blocks of tone.
  // The second bounce roughly squares that sensitivity: a degree of facet tilt
  // now swings the sample far across the environment, which is what separates
  // neighbouring facets into distinct flashes.
  vec3 pavilionNormal = normalize( normal - dir * pavilion );
  dir = reflect( dir, pavilionNormal );

  vec3 secondNormal = normalize( -normal + dir * pavilion );
  dir = reflect( dir, secondNormal );

  // Light return. In a real brilliant cut the pavilion is angled so that total
  // internal reflection throws light back out through the crown, toward the
  // viewer — that is why a diamond appears lit from inside rather than simply
  // transparent.
  //
  // The two bounces above do not guarantee it: for a facet square to the camera
  // they very nearly cancel, leaving the ray pointing back along -normal, into
  // whatever sits *behind* the stone. With a studio lit from the front that is
  // the dark side of the room, and the gem renders near black. Folding the ray
  // back into the outward hemisphere is what the pavilion is actually for.
  if ( dot( dir, normal ) < 0.0 ) dir = reflect( dir, normal );

  return dir;
}

void main() {
  vec3 normal = normalize( vWorldNormal );
  vec3 incident = normalize( vWorldPosition - cameraPosition );
  // Two-sided: back facets are visible through the front ones.
  if ( ! gl_FrontFacing ) normal = -normal;

  // Dispersion: one refraction per channel.
  vec3 refracted;
  refracted.r = textureCube( envMap, gemDirection( incident, normal, iorRGB.r ) ).r;
  refracted.g = textureCube( envMap, gemDirection( incident, normal, iorRGB.g ) ).g;
  refracted.b = textureCube( envMap, gemDirection( incident, normal, iorRGB.b ) ).b;

  vec3 reflected = textureCube( envMap, reflect( incident, normal ) ).rgb;

  // Schlick. Diamond's high IOR gives it a strong edge reflection, which is why
  // the girdle and crown facets read as bright outlines.
  float cosTheta = clamp( dot( -incident, normal ), 0.0, 1.0 );
  float f0 = pow( ( iorRGB.g - 1.0 ) / ( iorRGB.g + 1.0 ), 2.0 ) * reflectivity;
  float fresnel = f0 + ( 1.0 - f0 ) * pow( 1.0 - cosTheta, 5.0 );

  vec3 color = mix( refracted * tint, reflected, fresnel ) * envIntensity * brightness;

  // TEMP DEBUG bisect
  if ( debugMode > 0.5 && debugMode < 1.5 ) color = reflected * envIntensity;        // mirror only
  else if ( debugMode > 1.5 && debugMode < 2.5 ) color = refracted * envIntensity;   // refraction only
  else if ( debugMode > 2.5 && debugMode < 3.5 ) color = normal * 0.5 + 0.5;         // world normal
  else if ( debugMode > 3.5 ) color = vec3( gl_FrontFacing ? 1.0 : 0.0, 0.0, gl_FrontFacing ? 0.0 : 1.0 );

  gl_FragColor = vec4( color, 1.0 );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface GemOptions {
  envMap: THREE.CubeTexture;
  /** Overall environment gain. */
  envIntensity?: number;
  /** How far the internal bounce tilts with the ray. Higher scatters more. */
  pavilion?: number;
  /** Scales the Fresnel reflection against the refracted core. */
  reflectivity?: number;
  /** Final gain, for pulling melee back from blowing out. */
  brightness?: number;
  /** Body colour. White for diamond. */
  tint?: THREE.ColorRepresentation;
}

export function createGemMaterial(options: GemOptions): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    // Back facets must show through the front ones or the stone lo