/**
 * Schema Markup Component
 * Adds JSON-LD structured data for SEO
 */

interface SchemaMarkupProps {
  schemas: object | object[];
}

export default function SchemaMarkup({ schemas }: SchemaMarkupProps) {
  const schemaArray = Array.isArray(schemas) ? schemas : [schemas];
  
  return (
    <>
      {schemaArray.map((schema, index) => (
        <script
          key={index}
          id={`schema-ld-json-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema, null, 2),
          }}
        />
      ))}
    </>
  );
}

