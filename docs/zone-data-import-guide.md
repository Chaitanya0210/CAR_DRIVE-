# GroupDrive — Indian Administrative Zone & Geospatial Data Import Guide

---

## 1. Official Authoritative Data Sources for India

To expand beyond the initial seeded zones in Maharashtra (MH) and Madhya Pradesh (MP), use the following official Government of India open datasets:

### A. Local Government Directory (LGD) — Ministry of Panchayati Raj
- **URL**: [https://lgd.gov.in](https://lgd.gov.in)
- **Hierarchy Standard**: Standardized Census / LGD code hierarchy:
  $$\text{State (LGD Level 1)} \longrightarrow \text{District (Level 2)} \longrightarrow \text{Sub-District / Taluka / Tehsil (Level 3)} \longrightarrow \text{Village / Ward (Level 4)}$$
- **Format**: CSV, JSON API, or XML dump.
- **Coverage**: All 28 States, 8 UTs, 788 Districts, 6,750+ Sub-districts (Talukas/Tehsils), and 660,000+ Villages.

### B. Department of Posts (India Post) All-India PIN Code Directory
- **URL**: [https://data.gov.in/resource/all-india-pincode-directory](https://data.gov.in/resource/all-india-pincode-directory)
- **Attributes**: `CircleName`, `RegionName`, `DivisionName`, `OfficeName`, `Pincode`, `OfficeType`, `DeliveryStatus`, `District`, `StateName`, `Latitude`, `Longitude`.
- **Coverage**: ~155,000 postal delivery branches mapped to 19,300 unique 6-digit PIN codes.

### C. Geospatial Boundaries (Bhuvan ISRO & Survey of India)
- **URL**: [https://bhuvan.nrsc.gov.in](https://bhuvan.nrsc.gov.in)
- **Format**: Shapefiles (`.shp`) and GeoJSON (`EPSG:4326 - WGS 84`).
- **Use Case**: PostGIS spatial polygon polygons for taluka delivery boundary matching and centroid calculations.

---

## 2. Recommended Batch ETL & Ingestion Pipeline

Due to the volume (~650,000 records), perform ingestion using PostgreSQL streaming `COPY` or batched transactions in Node.js.

### Step 1: Pre-processing & Sanitization
1. Filter out inactive post offices and non-delivery branches (`DeliveryStatus != 'Non-Delivery'`).
2. Deduplicate PIN codes within each taluka.
3. Compute bounding box and centroid `(ST_Centroid(geom))` for each taluka using PostGIS.
4. Classify rural density based on Census 2011 population brackets:
   - `METRO`: Population $> 4,000,000$ (e.g., Mumbai, Pune Urban)
   - `URBAN`: $100,000 - 4,000,000$ (e.g., Satara City, Indore City)
   - `SEMI_URBAN`: $20,000 - 100,000$ (e.g., Baramati Municipal Area, Depalpur)
   - `RURAL`: $5,000 - 20,000$ (e.g., Baramati rural belt, Dabra taluka)
   - `DEEP_RURAL`: $< 5,000$ (Hamlets, remote wadis)

### Step 2: High-Performance Ingestion Script Pattern
```typescript
import { PrismaClient, ZoneLevel, ZoneDensityClass } from '@prisma/client';
import fs from 'fs';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

export async function importLgdTalukas(csvFilePath: string) {
  const parser = fs.createReadStream(csvFilePath).pipe(parse({ columns: true, skip_empty_lines: true }));
  const batchSize = 1000;
  let batch: any[] = [];

  for await (const row of parser) {
    batch.push({
      id: crypto.randomUUID(),
      parentId: row.district_zone_id,
      name: row.subdistrict_name_english.trim(),
      code: `TAL_${row.subdistrict_code}`,
      level: ZoneLevel.TALUKA,
      densityClass: row.is_rural === 'Y' ? ZoneDensityClass.RURAL : ZoneDensityClass.SEMI_URBAN,
      latitude: parseFloat(row.latitude) || null,
      longitude: parseFloat(row.longitude) || null,
    });

    if (batch.length >= batchSize) {
      await prisma.zone.createMany({
        data: batch,
        skipDuplicates: true,
      });
      batch = [];
    }
  }

  if (batch.length > 0) {
    await prisma.zone.createMany({ data: batch, skipDuplicates: true });
  }
}
```

### Step 3: PostGIS Spatial Index Optimization
Run the following SQL migration on PostgreSQL to optimize geographic radius queries (e.g. finding dealers within 150 km of Baramati):
```sql
-- Ensure PostGIS extension is loaded
CREATE EXTENSION IF NOT EXISTS postgis;

-- Spatial centroid geometry column
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Populate geom from latitude & longitude
UPDATE "Zone"
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

-- Spatial GIST index for lightning-fast radius searches
CREATE INDEX IF NOT EXISTS idx_zone_geom_gist ON "Zone" USING GIST (geom);
```
