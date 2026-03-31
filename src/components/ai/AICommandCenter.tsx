"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { stripSceneTags } from "@/lib/ai/scene-detector";

// ---------------------------------------------------------------------------
// Web Speech API type augmentation
// ---------------------------------------------------------------------------

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AICommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlaceholderMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  "What have you built at Burnes Center?",
  "Tell me about VCT Scout",
  "What's your tech stack?",
  "Why should I hire you?",
] as const;

const PLACEHOLDER_RESPONSES: Record<string, string> = {
  "What have you built at Burnes Center?":
    "At the Burnes Center, I've architected the entire AI for Impact program — 26 AI tools for 20+ government agencies serving 500K+ users. My biggest project is the [SCENE:knowledge-agent]knowledge-agent-for-impact[/SCENE], a reusable RAG platform deployed across 10+ production systems. I also launched [SCENE:genie]GENIE[/SCENE], an AI sandbox used by 44K+ state employees, and built [SCENE:one-l]One-L[/SCENE] which cut legal review time by 83% and won the NASPO Cronin Gold Award.",
  "Tell me about VCT Scout":
    "I built [SCENE:vct]VCT Scout[/SCENE] for the AWS x Riot Games hackathon at re:Invent 2024. It's a GenAI assistant using AWS Bedrock Agents that analyzes 1TB+ of Valorant Champions Tour game logs to help team managers build competitive rosters. We placed 2nd out of 3,300+ teams worldwide and won $8K plus $8K in AWS credits. Honestly one of the most intense and fun builds I've ever done.",
  "What's your tech stack?":
    "My core stack is Python and TypeScript. On the AI side, I work heavily with AWS Bedrock, Claude, LangChain, RAG pipelines, and multi-agent orchestration with Step Functions. Infrastructure is all AWS — CDK for IaC, Lambda, DynamoDB, OpenSearch Serverless, S3, KMS. For frontend I use React and Next.js. I've built with 14+ AI models and am comfortable with PyTorch, TensorFlow, FAISS, and Pinecone for vector search.",
  "Why should I hire you?":
    "I don't just build AI demos — I ship production systems at scale. My RAG platform serves 500K+ users across 20+ government agencies. I've mentored 50+ engineers, won a national procurement award (NASPO Gold), and placed 2nd out of 3,300+ teams at AWS re:Invent. I bridge the gap between research and production, and I do it with real impact — $5.4M+ in federal benefits unlocked through AI tools I helped build. I care about building things that actually matter.",
};

const DEFAULT_RESPONSE =
  "Great question! I'm a Gen AI Engineer and Technical Lead at the Burnes Center for Social Change. I've built 26 AI tools for 20+ government agencies, serving 500K+ users. Ask me about my projects, tech stack, or anything else — I'm an open book.";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 10,
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const pillVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + i * 0.06,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

const messageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let messageIdCounter = 0;
function createId(): string {
  return `msg-${++messageIdCounter}-${Date.now()}`;
}

/**
 * Simulates streaming a response token by token (fallback mode).
 */
function streamResponse(
  text: string,
  onToken: (partial: string) => void,
  onDone: () => void
): () => void {
  let index = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    if (index < text.length) {
      const chunk = Math.min(
        index + 1 + Math.floor(Math.random() * 2),
        text.length
      );
      onToken(text.slice(0, chunk));
      index = chunk;
      setTimeout(tick, 18 + Math.random() * 22);
    } else {
      onDone();
    }
  };

  setTimeout(tick, 300);

  return () => {
    cancelled = true;
  };
}

function getSpeechRecognitionClass(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Extract text content from a v6 UIMessage parts array.
 */
function getMessageText(msg: { parts?: Array<{ type: string; text?: string }>; content?: string }): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
  }
  // Fallback for any legacy format
  if (typeof msg.content === "string") return msg.content;
  return "";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AICommandCenter({ isOpen, onClose }: AICommandCenterProps) {
  // ---- Fallback mode state (used when API is unavailable) ----
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackMessages, setFallbackMessages] = useState<PlaceholderMessage[]>([]);
  const [fallbackStreaming, setFallbackStreaming] = useState(false);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  // ---- AI SDK v6 chat hook ----
  const {
    messages: aiMessages,
    sendMessage,
    status: chatStatus,
    error,
  } = useChat({
    id: "ai-command-center",
    transport: {
      api: "/api/chat",
    } as Parameters<typeof useChat>[0] extends { transport?: infer T } ? T : never,
    onError: (err: Error) => {
      if (err.message.includes("503") || err.message.includes("not configured")) {
        setUseFallback(true);
      }
    },
  });

  // ---- Detect fallback on error ----
  useEffect(() => {
    if (error && !useFallback) {
      const msg = error.message || "";
      if (msg.includes("503") || msg.includes("not configured")) {
        setUseFallback(true);
      }
    }
  }, [error, useFallback]);

  // ---- Input state (managed locally since v6 doesn't provide it) ----
  const [input, setInput] = useState("");
  const isStreaming = useFallback
    ? fallbackStreaming
    : chatStatus === "streaming" || chatStatus === "submitted";

  // ---- Voice input state ----
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check speech support on mount
  useEffect(() => {
    setSpeechSupported(getSpeechRecognitionClass() !== null);
  }, []);

  // ---- Refs ----
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---- Build unified message list for display ----
  const displayMessages: { id: string; role: string; content: string }[] = useFallback
    ? fallbackMessages
    : aiMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: getMessageText(m),
      }));

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Clean up streaming on unmount or close
  useEffect(() => {
    if (!isOpen && cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
      setFallbackStreaming(false);
    }
  }, [isOpen]);

  // ---- Fallback submit ----
  const handleFallbackSubmit = useCallback(
    (text: string) => {
      if (!text.trim() || fallbackStreaming) return;

      const userMsg: PlaceholderMessage = {
        id: createId(),
        role: "user",
        content: text.trim(),
      };
      const assistantId = createId();

      setFallbackMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setFallbackStreaming(true);

      const responseText = PLACEHOLDER_RESPONSES[text.trim()] ?? DEFAULT_RESPONSE;

      cancelStreamRef.current = streamResponse(
        responseText,
        (partial) => {
          setFallbackMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: partial } : m))
          );
        },
        () => {
          setFallbackStreaming(false);
          cancelStreamRef.current = null;
        }
      );
    },
    [fallbackStreaming]
  );

  // ---- Send message (works for both modes) ----
  const handleSend = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      if (useFallback) {
        handleFallbackSubmit(trimmed);
      } else {
        setInput("");
        sendMessage({ text: trimmed });
      }
    },
    [isStreaming, useFallback, handleFallbackSubmit, sendMessage]
  );

  // ---- Form submit ----
  const onFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      handleSend(input);
    },
    [input, handleSend]
  );

  // ---- Enter key handler ----
  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(input);
      }
    },
    [input, handleSend]
  );

  // ---- Suggested prompt click ----
  const handlePromptClick = useCallback(
    (prompt: string) => {
      handleSend(prompt);
    },
    [handleSend]
  );

  // ---- Voice input ----
  const toggleVoiceInput = useCallback(() => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecClass = getSpeechRecognitionClass();
    if (!SpeechRecClass) return;

    const recognition = new SpeechRecClass();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);

      // Auto-submit on final result
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        setIsRecording(false);
        setTimeout(() => handleSend(transcript), 100);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, handleSend]);

  // Clean up voice recognition on close
  useEffect(() => {
    if (!isOpen && recognitionRef.current) {
      recognitionRef.current.abort();
      setIsRecording(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            className={cn(
              "relative z-10 flex flex-col w-full max-w-2xl mx-4",
              "rounded-2xl overflow-hidden"
            )}
            style={{
              maxHeight: "80vh",
              background: "var(--bg-surface)",
              border: "1px solid var(--glass-border)",
            }}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="AI Command Center"
          >
            {/* Header / Input */}
            <form onSubmit={onFormSubmit} className="flex-shrink-0">
              <div
                className="flex items-center gap-3 px-6 py-4"
                style={{ borderBottom: "1px solid var(--bg-border)" }}
              >
                {/* Purple dot indicator */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 12px var(--accent-glow)",
                  }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Ask me anything about Dhruv..."
                  className={cn(
                    "flex-1 bg-transparent text-lg font-medium",
                    "placeholder:text-[var(--text-tertiary)]",
                    "outline-none border-none"
                  )}
                  style={{ color: "var(--text-primary)" }}
                  disabled={isStreaming}
                  aria-label="Ask a question"
                />

                {/* Voice input button */}
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={cn(
                      "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg",
                      "transition-colors duration-200",
                      "hover:bg-[var(--bg-elevated)]"
                    )}
                    style={{
                      color: isRecording ? "var(--accent)" : "var(--text-tertiary)",
                    }}
                    aria-label={isRecording ? "Stop recording" : "Start voice input"}
                  >
                    <Mic
                      size={16}
                      className={isRecording ? "animate-pulse" : ""}
                      style={
                        isRecording
                          ? { filter: "drop-shadow(0 0 6px var(--accent-glow))" }
                          : undefined
                      }
                    />
                  </button>
                )}

                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg",
                    "transition-colors duration-200",
                    "hover:bg-[var(--bg-elevated)]"
                  )}
                  style={{ color: "var(--text-tertiary)" }}
                  aria-label="Close"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Suggested prompts (shown when no messages) */}
            {displayMessages.length === 0 && (
              <div className="flex-shrink-0 px-6 py-4">
                <p
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Suggested
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <motion.button
                      key={prompt}
                      type="button"
                      custom={i}
                      variants={pillVariants}
                      initial="hidden"
                      animate="visible"
                      className={cn(
                        "px-4 py-2 rounded-full text-sm",
                        "transition-colors duration-200 cursor-pointer",
                        "hover:bg-[var(--bg-elevated)]"
                      )}
                      style={{
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-secondary)",
                      }}
                      onClick={() => handlePromptClick(prompt)}
                      disabled={isStreaming}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
              style={{ minHeight: displayMessages.length > 0 ? "200px" : "0" }}
            >
              {displayMessages.map((msg, idx) => {
                const isLast = idx === displayMessages.length - 1;
                const isAssistant = msg.role === "assistant";
                const displayContent = isAssistant
                  ? stripSceneTags(msg.content)
                  : msg.content;

                return (
                  <motion.div
                    key={msg.id}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                      "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "ml-auto rounded-br-md"
                        : "mr-auto rounded-bl-md"
                    )}
                    style={
                      msg.role === "user"
                        ? { background: "var(--accent)", color: "#fff" }
                        : { background: "var(--bg-elevated)", color: "var(--text-primary)" }
                    }
                  >
                    {displayContent}
                    {/* Streaming cursor */}
                    {isAssistant && isStreaming && isLast && displayContent.length > 0 && (
                      <span
                        className="inline-block w-[6px] h-[14px] ml-0.5 align-middle rounded-sm"
                        style={{
                          background: "var(--accent-light)",
                          animation: "cursor-blink 1s step-end infinite",
                        }}
                      />
                    )}
                    {/* Loading dots for empty assistant message */}
                    {isAssistant && isLast && displayContent.length === 0 && isStreaming && (
                      <span className="flex gap-1 py-1">
                        {[0, 1, 2].map((dot) => (
                          <span
                            key={dot}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: "var(--text-tertiary)",
                              animation: `dot-pulse 1.2s ease-in-out ${dot * 0.15}s infinite`,
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer hint */}
            <div
              className="flex-shrink-0 px-6 py-3 text-center"
              style={{
                borderTop: "1px solid var(--bg-border)",
                color: "var(--text-tertiary)",
              }}
            >
              <span className="text-xs">
                {useFallback && (
                  <span
                    className="inline-block mr-3 px-2 py-0.5 rounded text-[10px]"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    offline mode
                  </span>
                )}
                Press{" "}
                <kbd
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                  }}
                >
                  ESC
                </kbd>{" "}
                to close
              </span>
            </div>
          </motion.div>

          {/* Injected animations */}
          <style>{`
            @keyframes cursor-blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
            @keyframes dot-pulse {
              0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
