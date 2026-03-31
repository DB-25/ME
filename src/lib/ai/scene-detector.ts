export interface SceneTag {
  sceneId: string;
  startIndex: number;
  endIndex: number;
}

const SCENE_REGEX = /\[SCENE:([\w-]+)\](.*?)\[\/SCENE\]/g;

/**
 * Strip `[SCENE:xxx]...[/SCENE]` tags from text, leaving only the inner content.
 */
export function stripSceneTags(text: string): string {
  return text.replace(SCENE_REGEX, "$2");
}

/**
 * Extract all scene tags from text with their positions (positions refer to the
 * *stripped* output so the caller can map them to visible characters).
 */
export function extractSceneTags(text: string): SceneTag[] {
  const tags: SceneTag[] = [];
  let match: RegExpExecArray | null;
  let offset = 0;

  // We need a fresh regex instance per call since we use `g` flag
  const re = new RegExp(SCENE_REGEX.source, "g");

  while ((match = re.exec(text)) !== null) {
    const fullMatch = match[0]; // e.g. [SCENE:genie]GENIE[/SCENE]
    const sceneId = match[1]; // e.g. genie
    const innerText = match[2]; // e.g. GENIE

    // In the stripped string the inner text starts at
    // (original match index) minus (characters removed so far)
    const strippedStart = match.index - offset;
    const strippedEnd = strippedStart + innerText.length;

    tags.push({ sceneId, startIndex: strippedStart, endIndex: strippedEnd });

    // Track how many characters we're removing (the tag markup, not the inner text)
    offset += fullMatch.length - innerText.length;
  }

  return tags;
}
