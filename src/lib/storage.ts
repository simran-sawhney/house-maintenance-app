/**
 * Shared storage constants. Kept in a plain (no "use client"/"use server")
 * module so the value is a real string on both the client (upload) and the
 * server (signed-URL generation). Importing it from a "use client" module into
 * server code would turn it into a client *reference*, not the string.
 */
export const SHOPPING_BUCKET = "shopping-images";
