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
 * So this samples the environment cubemap directly instead, and it is weighted
 * heavily toward *reflection*. That weighting is the whole trick, and it was
 * arrived at by bisecting the two terms on screen:
 *
 *   - the mirror term alone reads as a diamond: crisp facets, hard bright and
 *     dark neighbours, real scintillation;
 *   - the refracted term alone is low-contrast mush, because approximating
 *     internal bounces scatters directions so widely that adjacent facets land
 *     on similar averages of the environment.
 *
 * Schlick's f0 for diamond is only 0.17, so mixing by raw Fresnel handed that
 * mush 83% of the image — which is exactly what "looks like milk" was. Physics
 * agrees with the fix: a brilliant cut returns most of the light that enters it
 * by total internal reflection off the pavilion, and what finally leaves through
 * the crown behaves far more like a mirror of the surroundings than like a
 * single refracted ray. Refraction's real job here is colour, not brightness —
 * it carries the dispersion that makes a diamond throw fire rather than just
 * glitter.
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
uniform float internalReflection;
uniform float brightness;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

/**
 * Direction light arrives from for one channel: into the stone, bounced off the
 * pavilion, back out. Per-channel IOR is what separates the colours.
 */
vec3 gemDirection( vec3 incident, vec3 normal, float ior ) {
  vec3 dir = refract( incident, normal, 1.0 / ior );

  vec3 pavilionNormal = normalize( normal - dir * pavilion );
  dir = reflect( dir, pavilionNormal );

  vec3 secondNormal = normalize( -normal + dir * pavilion );
  dir = reflect( dir, secondNormal );

  // Keep the exit ray in the outward hemisphere. Left alone, the two bounces
  // above can cancel for a facet square to the camera and send the ray back
  // into whatever sits behind the stone.
  if ( dot( dir, normal ) < 0.0 ) dir = reflect( dir, normal );

  return dir;
}

void main() {
  vec3 normal = normalize( vWorldNormal );
  vec3 incident = normalize( vWorldPosition - cameraPosition );
  // Two-sided: back facets are visible through the front ones.
  if ( ! gl_FrontFacing ) normal = -normal;

  // Dispersion: one refraction per channel. This is the fire.
  vec3 refracted;
  refracted.r = textureCube( envMap, gemDirection( incident, normal, iorRGB.r ) ).r;
  refracted.g = textureCube( envMap, gemDirection( incident, normal, iorRGB.g ) ).g;
  refracted.b = textureCube( envMap, gemDirection( incident, normal, iorRGB.b ) ).b;

  // Mirror of the surroundings. This is the brilliance, and it carries the image.
  vec3 reflected = textureCube( envMap, reflect( incident, normal ) ).rgb;

  float cosTheta = clamp( dot( -incident, normal ), 0.0, 1.0 );
  float f0 = pow( ( iorRGB.g - 1.0 ) / ( iorRGB.g + 1.0 ), 2.0 );
  float fresnel = f0 + ( 1.0 - f0 ) * pow( 1.0 - cosTheta, 5.0 );

  // Floor the reflection weight at `internalReflection` rather than letting raw
  // Fresnel decide. f0 for diamond is 0.17, and a 17% mirror against an 83%
  // scattered refraction averages out to flat milk. Total internal reflection
  // is what actually dominates a brilliant cut, and this is where it enters.
  float mirror = mix( internalReflection, 1.0, fresnel );

  vec3 color = mix( refracted * tint, reflected, mirror ) * envIntensity * brightness;

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
  /**
   * Baseline share of the mirror term, before Fresnel adds more at grazing
   * angles. This is the contrast dial: lower lets the scattered refraction
   * dominate and the stone goes milky.
   */
  internalReflection?: number;
  /** Final gain. */
  brightness?: number;
  /** Body colour. White for diamond. */
  tint?: THREE.ColorRepresentation;
}

export function createGemMaterial(options: GemOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    // Back facets must show through the front ones or the stone looks solid.
    side: THREE.DoubleSide,
    uniforms: {
      envMap: { value: options.envMap },
      envIntensity: { value: options.envIntensity ?? 1 },
      iorRGB: { value: IOR_RGB.clone() },
      tint: { value: new THREE.Color(options.tint ?? 0xffffff) },
      pavilion: { value: options.pavilion ?? 0.45 },
      internalReflection: { value: options.internalReflection ?? 0.78 },
      brightness: { value: options.brightness ?? 1 },
    },
  });
}
