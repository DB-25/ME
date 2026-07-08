"use client";

// The WORK / case-studies section was rebuilt as `WorkSection`.
// This thin wrapper keeps the existing `page.tsx` import
// (`ProjectsSection`) working while rendering the new editorial section.
// Prefer importing `WorkSection` directly in new code.
export { WorkSection as ProjectsSection } from "./WorkSection";
