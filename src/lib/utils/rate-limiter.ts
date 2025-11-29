// Rate limiter simples em memória
// Em produção, use Redis para ambientes distribuídos

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configurações
const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 100; // 100 requisições por minuto
const LOGIN_MAX_ATTEMPTS = 5; // 5 tentativas de login
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// Limpar entradas antigas periodicamente
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (now - entry.firstRequest > WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  });
}, 60000); // Limpar a cada minuto

export function checkRateLimit(
  identifier: string,
  maxRequests: number = MAX_REQUESTS,
  windowMs: number = WINDOW_MS
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = `rate:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.firstRequest > windowMs) {
    // Nova janela de tempo
    rateLimitStore.set(key, { count: 1, firstRequest: now });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    // Limite excedido
    const resetIn = windowMs - (now - entry.firstRequest);
    return { allowed: false, remaining: 0, resetIn };
  }

  // Incrementar contador
  entry.count++;
  const remaining = maxRequests - entry.count;
  const resetIn = windowMs - (now - entry.firstRequest);

  return { allowed: true, remaining, resetIn };
}

export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  return checkRateLimit(
    `login:${identifier}`,
    LOGIN_MAX_ATTEMPTS,
    LOGIN_WINDOW_MS
  );
}

export function resetLoginRateLimit(identifier: string): void {
  rateLimitStore.delete(`login:${identifier}`);
}

