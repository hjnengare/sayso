import { Metadata } from "next";
import Link from "next/link";
import {
  DEFAULT_SITE_DESCRIPTION,
  generateSEOMetadata,
  SITE_URL,
} from "../../lib/utils/seoMetadata";
import { getServerSupabase } from "../../lib/supabase/server";
import SchemaMarkup from "../../components/SEO/SchemaMarkup";
import {
  generateBreadcrumbSchema,
  generateEventSchema,
} from "../../lib/utils/schemaMarkup";

interface SpecialLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

interface SpecialSchemaRow {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function getSpecialData(id: string): Promise<SpecialSchemaRow | null> {
  const supabase = await getServerSupabase();

  const { data: special, error } = await supabase
    .from("events_and_specials")
    .select("id,title,description,image,location,start_date,end_date")
    .eq("id", id)
    .eq("type", "special")
    .single();

  if (error || !special) return null;
  return special as SpecialSchemaRow;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const special = await getSpecialData(id);

  if (!special) {
    return generateSEOMetadata({
      title: "Special details | Sayso",
      description: DEFAULT_SITE_DESCRIPTION,
      url: `/special/${id}`,
      noindex: true,
      nofollow: true,
    });
  }

  return generateSEOMetadata({
    title: `${special.title} in Cape Town | Sayso`,
    description:
      special.description ||
      `Discover ${special.title} on Sayso, Cape Town's hyper-local reviews and discovery app.`,
    keywords: [special.title, "cape town specials", "sayso specials"],
    image: special.image || undefined,
    url: `/special/${id}`,
    type: "article",
  });
}

export default async function SpecialLayout({
  children,
  params,
}: SpecialLayoutProps) {
  const { id } = await params;
  const special = await getSpecialData(id);

  let schemas: object[] = [];
  let relatedLinks: Array<{ href: string; label: string }> = [];

  if (special) {
    const specialUrl = `${SITE_URL}/special/${id}`;
    const location = special.location || "";
    const citySlug = location ? toSlug(String(location).split(",")[0]) : "";

    const specialSchema = generateEventSchema({
      name: special.title,
      description: special.description || undefined,
      image: special.image || undefined,
      url: specialUrl,
      location: location || undefined,
      startDate: special.start_date || undefined,
      endDate: special.end_date || undefined,
    });

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: `${SITE_URL}/home` },
      { name: "Events & Specials", url: `${SITE_URL}/events-specials` },
      { name: special.title, url: specialUrl },
    ]);

    schemas = [specialSchema, breadcrumbSchema];
    relatedLinks = [
      { href: "/events-specials", label: "More events and specials" },
      ...(citySlug
        ? [{ href: `/${citySlug}`, label: `More specials in ${location}` }]
        : []),
    ];
  }

  return (
    <>
      {schemas.length > 0 && <SchemaMarkup schemas={schemas} />}
      {relatedLinks.length > 0 && (
        <nav aria-label="Related links" className="sr-only">
          <ul>
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {children}
    </>
  );
}
