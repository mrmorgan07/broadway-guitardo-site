// Авторизация для Cloudflare Functions — stateless JWT (в памяти сессий нет).
// Контракт совместим с админкой: сервер возвращает { token, csrfToken }, а клиент
// шлёт заголовки x-auth-token (JWT) и x-csrf-token. CSRF-значение зашито в JWT.

import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";

const TTL_SEC = 12 * 60 * 60; // 12 часов

export async function createToken(env: any, login: string) {
  const csrf = crypto.randomUUID().replace(/-/g, "");
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const token = await sign({ login, csrf, exp }, env.JWT_SECRET);
  return { token, csrfToken: csrf, login };
}

export async function getSession(env: any, token?: string) {
  if (!token) return null;
  try {
    return await verify(token, env.JWT_SECRET); // бросает на невалидном/просроченном
  } catch {
    return null;
  }
}

export const comparePassword = (plain: string, hash: string) =>
  bcrypt.compareSync(plain || "", hash);

export const hashPassword = (plain: string) => bcrypt.hashSync(plain, 10);

export const isDefaultPassword = (hash: string) => bcrypt.compareSync("12345", hash);
