/**
 * Thin <img> wrapper standardizing loading/decoding hints across the app —
 * the Vite/static-CDN equivalent of next/image's `priority` prop (this repo
 * has no Next.js image pipeline to lean on). `priority` marks an image that
 * paints in the very first viewport (header/nav marks): it gets eager
 * loading, synchronous decode, and a high fetch-priority hint. Everything
 * else defaults to native lazy-loading + async decode so off-screen images
 * never compete with the first paint.
 */
export default function OptimizedImage({ src, alt = "", priority = false, className = "", ...rest }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={className}
      {...rest}
    />
  );
}
