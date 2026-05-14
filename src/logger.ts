import axios from "axios";
import { seqConfig } from "./config";

// Define allowed Seq log levels
export type SeqLevel =
  | "Fatal"
  | "Error"
  | "Warning"
  | "Information"
  | "Debug"
  | "Verbose";

// Logging function (fully typed)
async function sendToSeq(
  level: SeqLevel,
  message: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    await axios.post(
      `${seqConfig.url}/api/events/raw?apiKey=${seqConfig.apiKey}`,
      {
        Events: [
          {
            Timestamp: new Date().toISOString(),
            Level: level,
            MessageTemplate: message,
            Properties: properties,
          },
        ],
      }
    );
  } catch (err) {
    console.error("Seq logging failed:", err);
  }
}

const isLocal = process.env.NODE_ENV !== "production";

function toSeqProperties(props?: unknown): Record<string, unknown> {
  if (!props) {
    return {};
  }

  if (props instanceof Error) {
    return {
      name: props.name,
      message: props.message,
      stack: props.stack,
    };
  }

  if (typeof props === "object" && !Array.isArray(props)) {
    return props as Record<string, unknown>;
  }

  return { value: props };
}

function writeLocal(level: SeqLevel, message: string, props?: unknown): void {
  const output = props ? [message, props] : [message];

  if (level === "Error" || level === "Fatal") {
    console.error(...output);
    return;
  }

  if (level === "Warning") {
    console.warn(...output);
    return;
  }

  console.info(...output);
}

function log(level: SeqLevel, message: string, props?: unknown): Promise<void> | void {
  if (isLocal) {
    writeLocal(level, message, props);
    return;
  }

  return sendToSeq(level, message, toSeqProperties(props));
}

// Public logger API
export const logger = {
  info(message: string, props?: unknown) {
    return log("Information", message, props);
  },

  warn(message: string, props?: unknown) {
    return log("Warning", message, props);
  },

  error(message: string, props?: unknown) {
    return log("Error", message, props);
  },

  debug(message: string, props?: unknown) {
    return log("Debug", message, props);
  },

  fatal(message: string, props?: unknown) {
    return log("Fatal", message, props);
  },

  verbose(message: string, props?: unknown) {
    return log("Verbose", message, props);
  },
};
