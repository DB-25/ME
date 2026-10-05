import { profile } from "@/content";

const SUBJECT = "Hello from your portfolio";

/** A mail draft that opens ready to answer: a subject and three short prompts, so a first note says what a reply needs. */
export function mailtoHref(email: string = profile.email): string {
  const body = [`Hi ${profile.shortName},`, "", "What I am building:", "Stage and team:", "What I need help with first:", ""].join("\r\n");
  return `mailto:${email}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(body)}`;
}
