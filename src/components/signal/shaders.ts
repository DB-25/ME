/** GLSL for the SIGNAL field. One draw call, everything on the GPU. */

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
attribute vec3 aB;
attribute vec3 aC;
attribute vec3 aD;
attribute vec4 aRand; // x seed, y size jitter, z heat, w phase
attribute vec4 aTint; // portrait colour (rgb) and brightness (a)

uniform float uMorph;
uniform float uOverride;
uniform float uOverrideMix;
uniform float uTime;
uniform float uEnergy;
uniform float uStagger;
uniform float uTurb;
uniform float uSpread;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uAspect;
uniform float uScale;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uOffset;
uniform float uTintA;
uniform float uTintB;

varying vec4 vTint;
varying float vTintW;
varying float vHeat;
varying float vSpark;
varying float vDepth;
varying float vNear;

${SNOISE}

// Per-particle staggered progress. Returns x = eased, y = raw (for turbulence bump).
vec2 stagger(float m, float seed){
  float raw = clamp(m * (1. + uStagger) - seed * uStagger, 0., 1.);
  return vec2(smoothstep(0., 1., raw), raw);
}

void main(){
  float seed = aRand.x;
  vec2 pm = stagger(uMorph, seed);
  vec2 po = stagger(uOverride, seed);
  vec2 pc = stagger(uOverrideMix, seed);

  vec3 base = mix(position, aB, pm.x);
  vec3 over = mix(aC, aD, pc.x);
  vec3 p = mix(base, over, po.x);
  p *= uSpread;

  // Turbulence peaks mid-journey for each particle.
  float bump = max(sin(3.14159265 * pm.y), max(sin(3.14159265 * po.y), sin(3.14159265 * pc.y)));
  float amp = uTurb * (0.95 * bump + 0.35 * uEnergy);
  if (amp > 0.001) {
    vec3 q = p * 0.85 + vec3(uTime * 0.18);
    vec3 curl = vec3(snoise(q), snoise(q + 31.4), snoise(q + 71.7));
    p += curl * amp;
  }

  // Constant breathing drift.
  float t = uTime;
  float ph = aRand.w * 6.2831853;
  p += uTurb * 0.022 * vec3(sin(t * 0.55 + ph), sin(t * 0.43 + ph * 2.3), cos(t * 0.37 + ph * 1.7));
  p += uOffset;

  vec4 mv = modelViewMatrix * vec4(p, 1.);
  vec4 clip = projectionMatrix * mv;

  // Pointer repulsion in screen space: push away from the cursor, spring back as it leaves.
  float near = 0.;
  if (uPointerStrength > 0.001) {
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uPointer) * vec2(uAspect, 1.);
    float dist = length(d);
    float f = 1. - smoothstep(0., 0.42, dist);
    near = f;
    vec2 dir = d / max(dist, 0.0001);
    vec2 push = dir * f * f * uPointerStrength;
    clip.xy += vec2(push.x / uAspect, push.y) * clip.w;
  }
  gl_Position = clip;

  float dist = -mv.z;
  float spark = step(0.988, aRand.z);
  gl_PointSize = uSize * aRand.y * (1. + spark * 0.25) * uPixelRatio * uScale / max(dist, 0.1);

  vTint = aTint;
  vTintW = mix(uTintA, uTintB, pm.x) * (1. - po.x);
  vHeat = aRand.z;
  vSpark = spark;
  vNear = near;
  vDepth = clamp(1.25 - (dist - 5.5) * 0.09, 0.4, 1.25);
}
`;

export const FRAGMENT = /* glsl */ `
uniform float uAlpha;
uniform float uBrightness;
uniform vec3 uHueColor;
uniform float uHueMix;

varying vec4 vTint;
varying float vTintW;
varying float vHeat;
varying float vSpark;
varying float vDepth;
varying float vNear;

const vec3 DEEP = vec3(0.3569, 0.2784, 0.8784);  // #5B47E0
const vec3 UV = vec3(0.5451, 0.4824, 1.0);       // #8B7BFF
const vec3 HOT = vec3(0.7882, 0.7451, 1.0);      // #C9BEFF
const vec3 SAFFRON = vec3(1.0, 0.6627, 0.3020);  // #FFA94D

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.;
  if (d > 1.) discard;
  float core = exp(-d * d * 10.);
  float halo = exp(-d * d * 3.) * 0.45;
  float a = (core + halo) * uAlpha * uBrightness * vDepth;
  a *= 1. + vNear * 0.6;

  float heat = clamp(smoothstep(0.6, 1., vHeat) * 0.55 + core * 0.4 + vNear * 0.3, 0., 1.);
  vec3 col = heat < 0.5 ? mix(DEEP, UV, heat * 2.) : mix(UV, HOT, (heat - 0.5) * 2.);
  col = mix(col, SAFFRON, vSpark * (1. - uHueMix));
  col = mix(col, vTint.rgb, vTintW);
  a *= mix(1., vTint.a, vTintW);
  vec3 tint = uHueColor * (0.55 + 0.6 * core);
  col = mix(col, tint, uHueMix * 0.85);
  a *= 1. + vSpark * 0.8;

  gl_FragColor = vec4(col, a);
}
`;
