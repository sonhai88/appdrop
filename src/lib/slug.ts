import { customAlphabet } from "nanoid";

// URL-safe alphabet without easily-confused characters (no 0/O, 1/l/I).
const alphabet = "23456789abcdefghijkmnpqrstuvwxyz";
const generate = customAlphabet(alphabet, 8);

export function newSlug(): string {
  return generate();
}
