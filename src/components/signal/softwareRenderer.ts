/** Chrome's software GL (SwiftShader), Mesa's llvmpipe and softpipe, Windows' basic renderer, and the like. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

export function isSoftwareRendererName(name: string): boolean {
  return SOFTWARE_RENDERER.test(name);
}
