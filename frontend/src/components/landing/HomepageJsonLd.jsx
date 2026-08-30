import { TIERS } from "@/data/marketing";

/**
 * Homepage structured data — SoftwareApplication + Organization, real fields
 * only: confirmed domain, shipped copy (PLX_COPY_SLOTS.json meta.home.*),
 * and the actual TIERS price range. No aggregateRating/review — there is no
 * public review-site presence yet, and inventing one would be exactly the
 * fabricated-proof pattern the brand grounding forbids (Site Standard:
 * structuredData).
 */
export default function HomepageJsonLd() {
  const prices = TIERS.map((t) => t.price);
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Praxium Suite",
    url: "https://www.praxiumlaw.com",
    description:
      "Replace eight tools with one firm OS. Save $86k/year. Matters, phones, records, AI CoCounsel — 30-day free trial, no card required.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: TIERS.length,
    },
    provider: {
      "@type": "Organization",
      name: "Praxium Suite",
      url: "https://www.praxiumlaw.com",
    },
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}
