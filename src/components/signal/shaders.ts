/** GLSL for the SIGNAL field. One draw call, everything on the GPU. */
import { ARC_SHARE, BACKSIDE_KEEP, CITY_SHARE, GLOBE_R } from "./formations/globeView";

const glslFloat = (n: number) => n.toFixed(5);
/** Globe roles by seed (see formations/globe.ts), and the radius the far-side test is measured against. */
const GLOBE_CONSTS = /* glsl */ `
const float GLOBE_R = ${glslFloat(GLOBE_R)};
const float ARC_SHARE = ${glslFloat(ARC_SHARE)};
const float CITY_SHARE = ${glslFloat(CITY_SHARE)};
const float BACKSIDE_KEEP = ${glslFloat(BACKSIDE_KEEP)};
const float ARC_FEATHER = 0.05; // how far past the head the reveal feathers
const float ARC_TIP = 0.16;     // how far behind the head the bright tip trails
`;

/**
 * Lean (phone) pipeline constants: sprite growth that leaves room for the faked bloom skirt, and the
 * hairline minimum in pixels. Bloom, tone curve and vignette are approximated per particle instead of
 * running a postprocessing chain.
 */
const LEAN_SPREAD = "1.7";
const LEAN_HAIRLINE = "2.2";
/** Skirt strength relative to the particle, and the exponent that stands in for linear to sRGB encoding. */
const LEAN_GLOW = "0.35";
const LEAN_TONE = "0.92";
/** Share of white mixed in: the real chain tone-maps accumulated light toward white. */
const LEAN_WASH = "0.3";
const LEAN_LINE_GAIN = "0.7";

const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+10.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 105.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

export const VERTEX = /* glsl */ `
#ifdef LEAN
const float LEAN_SPREAD = ${LEAN_SPREAD};
const float LEAN_HAIRLINE = ${LEAN_HAIRLINE};
#endif
attribute vec3 aB;
attribute vec3 aC;
attribute vec3 aD;
attribute vec4 aRand; // x seed, y size jitter, z heat, w phase
attribute vec4 aSig;  // x u along line, y line (0..1), zw gaussian jitter

uniform float uMorph;
uniform float uOverride;
uniform float uOverrideMix;
uniform float uTime;
uniform float uEnergy;
uniform float uStagger;
uniform float uTurb;
uniform float uDensity; // share of particles drawn (by seed); the rest fade out
uniform float uSpark;   // 0..1 saffron spark rate multiplier
uniform float uSpread;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uPointerRadius; // NDC reach of the cursor's push
uniform float uBurst;         // 0..1 envelope of the copy burst
uniform vec2 uBurstPos;       // burst origin, NDC
uniform float uAspect;
uniform float uScale;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uOffset;
uniform float uFog;
// SIGNAL field: which morph ends are the animated waveform field, and its layout.
uniform float uSigA;
uniform float uSigB;
uniform vec4 uSigDims;   // width, depth, wavelength, signal amplitude
uniform vec4 uSigParam;  // noise amplitude, phase per line
uniform mat3 uSigRot;
// GLOBE: which morph ends are the globe (turned by uGlobeRot from its baked default view), the arc
// reveal, and the city marker intensities (x Bangalore, y Boston). uOvGlobe: a Director-held globe.
uniform mat3 uGlobeRot;
uniform float uGlobeA;
uniform float uGlobeB;
uniform float uOvGlobe;
uniform float uArc;
uniform vec2 uMark;

varying float vHeat;
varying float vSpark;
varying float vDepth;
varying float vNear;
varying float vFade; // density cull and mid-morph dip
varying float vRight; // 0 on the left of the screen, 1 on the far right
varying vec4 vSig; // x: signal weight, y: noise->signal (weighted), z: crest (weighted), w: edge fade (weighted)
varying vec4 vGlobe; // x: city marker weight, y: city (0 Bangalore, 1 Boston), z: arc weight, w: arc position (0 Bangalore, 1 Boston)
varying float vTip; // bright leading tip of the arc while it draws
#ifdef LEAN
varying float vVig; // phones: the postprocessing vignette, evaluated per particle
#endif

${GLOBE_CONSTS}
${SNOISE}

// Per-particle staggered progress. Returns x = eased, y = raw (for turbulence bump).
vec2 stagger(float m, float key){
  float raw = clamp(m * (1. + uStagger) - key * uStagger, 0., 1.);
  return vec2(smoothstep(0., 1., raw), raw);
}

// The animated waveform field. info = (noise->signal weight, crest, edge fade).
vec3 signalPos(vec4 sg, float t, out vec3 info){
  float u = sg.x;
  float v = sg.y;
  float x = (u - 0.5) * uSigDims.x;
  float z = (v - 0.5) * uSigDims.y;
  // Resolve over the middle third.
  float s = smoothstep(0.3, 0.68, u);

  // Noise: three octaves, boiling in time, decorrelated between lines at the fine scale.
  float n = snoise(vec3(x * 1.1, z * 0.6, t * 0.30)) * 0.55
          + snoise(vec3(x * 3.4, z * 2.5, t * 0.62 + 7.)) * 0.30
          + snoise(vec3(x * 9.0, z * 9.0, t * 1.25 + 13.)) * 0.20;

  // Signal: waves travelling left to right, phase-aligned so crests form regular diagonal ridges.
  float k = 6.2831853 / uSigDims.z;
  float ph = k * x - t * 0.85 + v * uSigParam.y;
  float swell = 0.86 + 0.14 * sin(x * 0.35 - t * 0.18 + v * 2.0);
  float wave = sin(ph) + 0.12 * sin(ph * 0.5 + t * 0.2 + v * 4.);
  float crest = smoothstep(0.55, 1., wave);

  float scatter = pow(1. - s, 1.5);
  float h = mix(n * uSigParam.x, wave * uSigDims.w * swell, s);
  vec3 local = vec3(x + sg.z * scatter * 0.08, h + sg.w * scatter * 0.12, z);

  float edge = smoothstep(0.08, 0.3, u) * smoothstep(0.94, 0.72, u);
  float depthFade = pow(max(sin(3.14159265 * v), 0.), 0.55);
  info = vec3(s, crest * s, edge * depthFade);
  return uSigRot * local;
}

void main(){
  float seed = aRand.x;
  // Into / out of the signal field the morph sweeps left to right along the lines.
  float keyM = mix(seed, aSig.x, 0.8 * max(uSigA, uSigB));
  vec2 pm = stagger(uMorph, keyM);
  vec2 po = stagger(uOverride, seed);
  vec2 pc = stagger(uOverrideMix, seed);
  float sigW = mix(uSigA, uSigB, pm.x) * (1. - po.x);

  vec3 pa = position;
  vec3 pb = aB;
  vec3 infoA = vec3(0.);
  vec3 infoB = vec3(0.);
  if (uSigA > 0.5) pa = signalPos(aSig, uTime, infoA);
  else if (uGlobeA > 0.5) pa = uGlobeRot * pa;
  if (uSigB > 0.5) pb = signalPos(aSig, uTime, infoB);
  else if (uGlobeB > 0.5) pb = uGlobeRot * pb;
  vec3 info = mix(infoA * uSigA, infoB * uSigB, pm.x) * (1. - po.x);

  vec3 base = mix(pa, pb, pm.x);
  vec3 over = mix(aC, aD, pc.x);
  vec3 p = mix(base, over, po.x);

  // Globe roles: arc and city markers by seed, far side hidden for whatever view the story is in.
  float gBase = mix(uGlobeA, uGlobeB, pm.x) * (1. - po.x);
  float gw = gBase + uOvGlobe * po.x;
  float isArc = 1. - step(ARC_SHARE, aRand.x);
  float isCity = (1. - isArc) * (1. - step(ARC_SHARE + CITY_SHARE, aRand.x));
  float globeShow = 1.;
  float tip = 0.;
  float cityW = 0.;
  float cityId = step(0.5, aRand.w);
  if (gw > 0.001) {
    float front = smoothstep(-0.3, 0.1, p.z / GLOBE_R);
    float limb = smoothstep(1., 1.06, length(p.xy) / GLOBE_R);
    float vis = max(front, limb);
    float role = isArc + isCity;
    // Surface and atmosphere keep a thin share of the far side so the globe reads solid; markers and the arc do not.
    globeShow = mix(max(vis, step(aRand.w, BACKSIDE_KEEP)), vis, role);
    // The arc draws from Bangalore (aRand.w = 0) to Boston (1), with a feathered edge and a brighter tip.
    float head = uArc * (1. + ARC_FEATHER);
    float drawn = 1. - smoothstep(head - ARC_FEATHER, head, aRand.w);
    globeShow *= mix(1., drawn, isArc * gBase);
    tip = isArc * gBase * drawn * (1. - smoothstep(head - ARC_TIP, head - 0.02, aRand.w)) * (1. - smoothstep(0.85, 1., uArc));
    cityW = isCity * mix(mix(uMark.x, uMark.y, cityId), 1., uOvGlobe * po.x);
    globeShow = mix(1., globeShow, gw);
  }

  p *= uSpread;

  // Turbulence peaks mid-journey for each particle.
  float bump = max(sin(3.14159265 * pm.y), max(sin(3.14159265 * po.y), sin(3.14159265 * pc.y)));
  bump = bump * bump * bump; // a short burst, not a long boil
  float amp = uTurb * (0.95 * bump + 0.25 * uEnergy);
  // Particles in flight dim a little so converging points do not flash, and density-culled ones fade out.
  float keep = clamp((uDensity - aRand.x) * 8., 0., 1.) * globeShow;
  vFade = keep * (1. - 0.5 * bump);
  if (keep <= 0.) {
    gl_Position = vec4(2., 2., 2., 1.);
    gl_PointSize = 0.;
    return;
  }
  if (amp > 0.001) {
    vec3 q = p * 0.85 + vec3(uTime * 0.18);
    vec3 curl = vec3(snoise(q), snoise(q + 31.4), snoise(q + 71.7));
    p += curl * amp;
  }

  // Constant breathing drift (hairlines must stay hairlines, so it fades out on the signal field).
  float t = uTime;
  float ph = aRand.w * 6.2831853;
  p += uTurb * 0.022 * (1. - 0.95 * sigW) * vec3(sin(t * 0.55 + ph), sin(t * 0.43 + ph * 2.3), cos(t * 0.37 + ph * 1.7));
  p += uOffset;

  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vec4 clip = projectionMatrix * mv;

  // Pointer: push away from the cursor in screen space (spring back as it leaves). On the signal
  // field the cursor also sends a soft ripple through the lines.
  float near = 0.;
  if (uPointerStrength > 0.001) {
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uPointer) * vec2(uAspect, 1.);
    float dist = length(d);
    float f = 1. - smoothstep(0., uPointerRadius, dist);
    near = f;
    vec2 dir = d / max(dist, 0.0001);
    float strength = uPointerStrength * (1. - 0.45 * sigW);
    vec2 push = dir * f * f * strength;
    push.y += sigW * f * f * sin(dist * 24. - uTime * 3.2) * uPointerStrength * 0.1;
    clip.xy += vec2(push.x / uAspect, push.y) * clip.w;
  }
  // Burst: everything is thrown outward from the origin (with a little swirl) and falls back as the envelope decays.
  if (uBurst > 0.001) {
    vec2 bd = (clip.xy / clip.w - uBurstPos) * vec2(uAspect, 1.);
    float bdist = length(bd);
    vec2 bdir = bd / max(bdist, 0.0001);
    float falloff = exp(-bdist * 1.3);
    vec2 swirl = vec2(-bdir.y, bdir.x) * (aRand.w - 0.5) * 0.9;
    vec2 kick = (bdir + swirl) * uBurst * (0.3 + 0.7 * aRand.x) * (0.12 + 0.5 * falloff);
    clip.xy += vec2(kick.x / uAspect, kick.y) * clip.w;
    near = max(near, uBurst * (0.35 + 0.65 * falloff));
  }
  gl_Position = clip;
#ifdef LEAN
  vec2 ndcV = clip.xy / max(clip.w, 0.0001);
  vVig = smoothstep(0.8, 0.2237, length(ndcV) * 0.5 * 0.98);
#endif
  vRight = smoothstep(0., 0.95, clip.x / max(clip.w, 0.0001));

  float dist = -mv.z;
  float spark = mix(step(1. - 0.012 * uSpark, aRand.z), step(0.9994, aRand.z), sigW);
  float px = uSize * aRand.y * (1. + spark * 0.25 + cityW * 0.6 + tip * 0.5) * uPixelRatio * uScale / max(dist, 0.1);
#ifdef LEAN
  // The sprite is LEAN_SPREAD wider than the particle so the fragment shader has room for a bloom skirt.
  px *= LEAN_SPREAD;
  gl_PointSize = max(px, mix(0., LEAN_HAIRLINE, sigW) * uPixelRatio);
#else
  gl_PointSize = max(px, mix(0., 1.05, sigW) * uPixelRatio);
#endif

  vHeat = aRand.z;
  vSpark = spark;
  vNear = near;
  vSig = vec4(sigW, info);
  vGlobe = vec4(cityW * (0.85 + 0.15 * sin(uTime * 1.6 + ph)), cityId, isArc * gw, aRand.w);
  vTip = tip;
  vDepth = clamp(1.25 - (dist - 5.5) * uFog, 0.1, 1.25);
}
`;

export const FRAGMENT = /* glsl */ `
uniform float uAlpha;
uniform float uBrightness;
uniform float uRightDim; // dims the right edge so copy over it stays legible
uniform vec3 uHueColor;
uniform float uHueMix;

varying float vHeat;
varying float vSpark;
varying float vDepth;
varying float vNear;
varying float vRight;
varying float vFade;
varying vec4 vSig;
varying vec4 vGlobe;
varying float vTip;
#ifdef LEAN
varying float vVig;
uniform float uBloom;
const float LEAN_SPREAD = ${LEAN_SPREAD};
const float LEAN_GLOW = ${LEAN_GLOW};
const float LEAN_TONE = ${LEAN_TONE};
const float LEAN_WASH = ${LEAN_WASH};
const float LEAN_LINE_GAIN = ${LEAN_LINE_GAIN};
#endif

const vec3 DEEP = vec3(0.3569, 0.2784, 0.8784);  // #5B47E0
const vec3 UV = vec3(0.5451, 0.4824, 1.0);       // #8B7BFF
const vec3 HOT = vec3(0.7882, 0.7451, 1.0);      // #C9BEFF
const vec3 SAFFRON = vec3(1.0, 0.6627, 0.3020);  // #FFA94D
const vec3 NOISE_VIOLET = vec3(0.36, 0.28, 0.84);

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.;
  if (d > 1.) discard;
  float sigW = vSig.x;
#ifdef LEAN
  float edge = 1. - smoothstep(0.55, 1., d);
  d *= LEAN_SPREAD; // profile below is in the original (unspread) sprite units
#endif
  // Tiny hairline sprites need a flatter profile than the soft glows of the other formations.
  float core = exp(-d * d * mix(10., 3.2, sigW));
  float halo = exp(-d * d * 3.) * 0.45 * (1. - sigW);
  float lit = uAlpha * uBrightness * vDepth;
  float a = (core + halo) * lit;
#ifdef LEAN
  // Faked bloom: a wide soft skirt that scales with the chapter's bloom amount, fading out at the sprite edge.
  a += exp(-d * d * 1.1) * edge * uBloom * LEAN_GLOW * lit;
  a *= vVig;
#endif
  a *= 1. + vNear * 0.6;
  a *= 1. - uRightDim * vRight;
  a *= vFade;

  float heat = clamp(smoothstep(0.6, 1., vHeat) * 0.55 + core * 0.4 + vNear * 0.3, 0., 1.);
  vec3 col = heat < 0.5 ? mix(DEEP, UV, heat * 2.) : mix(UV, HOT, (heat - 0.5) * 2.);

  // Waveform field: deep violet noise, ultraviolet signal, hot core only on crests.
  float s = vSig.y / max(sigW, 0.001);
  float crest = vSig.z / max(sigW, 0.001);
  float fade = vSig.w / max(sigW, 0.001);
  vec3 sigCol = mix(NOISE_VIOLET, UV * 0.92, s);
  sigCol = mix(sigCol, HOT, crest * crest * 0.9);
  col = mix(col, sigCol, sigW);
#ifdef LEAN
  col = mix(col, vec3(0.8, 0.77, 1.), LEAN_WASH);
  a *= 1. + LEAN_LINE_GAIN * sigW;
#endif
  a *= mix(1., fade * mix(0.7, 1., s) * (0.5 + 1.0 * crest), sigW);

  // Globe: the arc warms from saffron at Bangalore to the hot core at Boston; each city marker glows in its own color.
  vec3 arcCol = mix(SAFFRON, HOT, smoothstep(0.1, 0.9, vGlobe.w));
  col = mix(col, arcCol, vGlobe.z * 0.85);
  a *= 1. - vGlobe.z * 0.55 + vTip * 1.6;
  // City markers: many stacked particles, so each is dim; the sum is a soft saffron or ultraviolet glow.
  vec3 cityCol = mix(SAFFRON, UV, vGlobe.y);
  float mk = clamp(vGlobe.x, 0., 1.);
  col = mix(col, cityCol, mk * 0.95);
  a *= 1. - mk * 0.88;

  col = mix(col, SAFFRON, vSpark * (1. - uHueMix));
  vec3 tint = uHueColor * (0.55 + 0.6 * core);
  col = mix(col, tint, uHueMix * 0.85);
  a *= 1. + vSpark * 0.7;

#ifdef LEAN
  a = pow(clamp(a, 0., 1.), LEAN_TONE);
#endif
  gl_FragColor = vec4(col, a);
}
`;
