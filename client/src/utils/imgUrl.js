export function imgUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `/uploads/${path.replace(/^uploads\//, "")}`;
}
