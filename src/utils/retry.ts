import { logger } from "../logger";

export const DEFAULT_RETRIES = 10;
export const DEFAULT_RETRY_DELAY_MS = 2000;

export async function retry<T>(
  fn: () => Promise<T>,
  retries = DEFAULT_RETRIES,
  delay = DEFAULT_RETRY_DELAY_MS,
  label = "TON"
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await logger.warn(`[retry] operation="${label}" retrying in ${delay}ms after error: ${error}`);
    await new Promise((res) => setTimeout(res, delay));
    return retry(fn, retries - 1, delay * 2, label);
  }
}

export async function retryExp<T>(
  fn: () => Promise<T>,
  retries = DEFAULT_RETRIES,
  baseDelay = DEFAULT_RETRY_DELAY_MS,
  label = "TON"
): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;

      const delay = baseDelay * Math.pow(2, attempt);

      await logger.warn(`[retry] operation="${label}" retry #${attempt + 1} in ${delay}ms (${error})`);
      await new Promise((res) => setTimeout(res, delay));

      attempt++;
    }
  }

  throw new Error("Unexpected exit from retry loop");
}
