// backend/src/database/seed.ts
import fs from "fs";
import path from "path";

import { parse } from "csv-parse/sync";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SUBZONE_MODEL = "subzone"; // change if your model is named differently

type GeoJSON = {
  type: "FeatureCollection";
  features: Array<{
    properties: Record<string, any>;
    geometry: any;
  }>;
};

type Row = Record<string, string>; // generic CSV rows

async function main() {
  const dataDir = path.join(__dirname, "..", "..", "data");

  // --- 1) Subzone polygons ---
  const gjPath = path.join(dataDir, "MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson");
  const gj = JSON.parse(fs.readFileSync(gjPath, "utf8")) as GeoJSON;

  for (const f of gj.features) {
    // Parse the HTML description to extract subzone data
    const description = f.properties.Description || "";
    const nameMatch = description.match(/<th>SUBZONE_N<\/th>\s*<td>([^<]+)<\/td>/);
    const subzoneCodeMatch = description.match(/<th>SUBZONE_C<\/th>\s*<td>([^<]+)<\/td>/);
    const regionMatch = description.match(/<th>REGION_N<\/th>\s*<td>([^<]+)<\/td>/);
    const planningAreaMatch = description.match(/<th>PLN_AREA_N<\/th>\s*<td>([^<]+)<\/td>/);

    const name = nameMatch ? nameMatch[1].trim() : "";
    const subzoneId = subzoneCodeMatch ? subzoneCodeMatch[1].trim() : "";
    const region = regionMatch ? regionMatch[1].trim() : "Unknown";
    const planningArea = planningAreaMatch ? planningAreaMatch[1].trim() : "";

    if (!name || !subzoneId) continue;

    // Calculate centroid from geometry
    const coordinates = f.geometry.coordinates[0]; // First ring of polygon
    const centroid = {
      type: "Point",
      coordinates: [
        coordinates.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coordinates.length,
        coordinates.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coordinates.length
      ]
    };

    // Default radii for analysis (in meters)
    const radii = [500, 1000, 2000, 5000];

    await prisma.subzone.upsert({
      where: { subzoneId },
      update: { 
        geometryPolygon: f.geometry,
        centroid: centroid,
        radii: radii
      },
      create: { 
        subzoneId,
        name, 
        region,
        geometryPolygon: f.geometry,
        centroid: centroid,
        radii: radii
      },
    });
  }

  function computeCentroidFromPolygon(geo: any): { type: "Point"; coordinates: [number, number] } | null {
  try {
    if (!geo || geo.type !== "Polygon" || !Array.isArray(geo.coordinates?.[0])) return null;
    const ring: [number, number][] = geo.coordinates[0];
    if (ring.length === 0) return null;
    let sx = 0, sy = 0;
    for (const [lng, lat] of ring) { sx += lng; sy += lat; }
    const cx = sx / ring.length;
    const cy = sy / ring.length;
    return { type: "Point", coordinates: [cx, cy] };
  } catch {
    return null;
  }
}
const csvPath = path.join(
  dataDir,
  "ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv"
);

if (fs.existsSync(csvPath)) {
  type Row = Record<string, string>;
  const rows = parse<Row>(fs.readFileSync(csvPath), {
    columns: true,
    skip_empty_lines: true,
  });

  for (const row of rows) {
    // Your file uses:
    //   - "Number" column for the subzone name (e.g., "Ang Mo Kio Town Centre")
    //   - "Total_Total" for total population
    const subzoneName = (row["Number"] ?? "").trim();
    if (!subzoneName) continue;

    const total = Number(row["Total_Total"] ?? "0");
    const age0_14 = Number(row["Total_0_4"] ?? 0) + Number(row["Total_5_9"] ?? 0) + Number(row["Total_10_14"] ?? 0);
    const age15_64 =
      Number(row["Total_15_19"] ?? 0) + Number(row["Total_20_24"] ?? 0) + Number(row["Total_25_29"] ?? 0) +
      Number(row["Total_30_34"] ?? 0) + Number(row["Total_35_39"] ?? 0) + Number(row["Total_40_44"] ?? 0) +
      Number(row["Total_45_49"] ?? 0) + Number(row["Total_50_54"] ?? 0) + Number(row["Total_55_59"] ?? 0) +
      Number(row["Total_60_64"] ?? 0);
    const age65p =
      Number(row["Total_65_69"] ?? 0) + Number(row["Total_70_74"] ?? 0) + Number(row["Total_75_79"] ?? 0) +
      Number(row["Total_80_84"] ?? 0) + Number(row["Total_85_89"] ?? 0) + Number(row["Total_90andOver"] ?? 0);

    if (!Number.isFinite(total) || total <= 0) continue;

    const subzone = await prisma.subzone.findFirst({
      where: { name: subzoneName },
      select: { subzoneId: true, centroid: true, geometryPolygon: true },
    });
    if (!subzone) continue;

    // make a safe value for the JSON column
    const centroid = subzone.centroid as Prisma.JsonValue | null;
    let safeLocation: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;

    if (centroid && typeof centroid === "object") {
      // already JSON-ish (GeoJSON Point)
      safeLocation = centroid as Prisma.InputJsonValue;
    } else {
      // try to compute from polygon
      const point = computeCentroidFromPolygon(subzone.geometryPolygon as any);
      safeLocation = point ? (point as Prisma.InputJsonValue) : Prisma.JsonNull;
    }

    await prisma.populationPoint.create({
      data: {
        subzoneId: subzone.subzoneId,
        // ✅ FIX: provide InputJsonValue OR Prisma.JsonNull (not raw null)
        location: safeLocation,
        residentCount: total,
        age0_14,
        age15_64,
        age65p,
      },
    });
  }
}

  // --- 3) Hawker Centres ---
  const hawkerPath = path.join(dataDir, "HawkerCentresGEOJSON.geojson");
  if (fs.existsSync(hawkerPath)) {
    const hawkerGj = JSON.parse(fs.readFileSync(hawkerPath, "utf8")) as GeoJSON;
    
    for (const f of hawkerGj.features) {
      const name = f.properties.NAME ?? f.properties.name ?? "";
      const centreId = f.properties.CENTRE_ID ?? f.properties.id ?? f.properties.centreId ?? "";
      
      if (!name || !centreId) continue;

      await prisma.hawkerCentre.upsert({
        where: { centreId },
        update: {
          name,
          location: f.geometry,
          capacity: f.properties.CAPACITY ?? f.properties.capacity ?? 50,
          status: f.properties.STATUS ?? f.properties.status ?? "active"
        },
        create: {
          centreId,
          name,
          location: f.geometry,
          capacity: f.properties.CAPACITY ?? f.properties.capacity ?? 50,
          status: f.properties.STATUS ?? f.properties.status ?? "active"
        }
      });
    }
  }

  // --- 4) MRT Stations ---
  const mrtPath = path.join(dataDir, "LTAMRTStationExitGEOJSON.geojson");
  if (fs.existsSync(mrtPath)) {
    const mrtGj = JSON.parse(fs.readFileSync(mrtPath, "utf8")) as GeoJSON;
    
    for (const f of mrtGj.features) {
      const name = f.properties.STATION_NAME ?? f.properties.name ?? "";
      const stationId = f.properties.STATION_CODE ?? f.properties.id ?? f.properties.stationId ?? "";
      
      if (!name || !stationId) continue;

      // Count unique lines for this station
      const lines = f.properties.LINE ?? f.properties.lines ?? [];
      const lineCount = Array.isArray(lines) ? lines.length : 1;

      await prisma.mRTStation.upsert({
        where: { stationId },
        update: {
          name,
          location: f.geometry,
          lineCount
        },
        create: {
          stationId,
          name,
          location: f.geometry,
          lineCount
        }
      });
    }
  }

  // --- 5) Bus Stops ---
  const busPath = path.join(dataDir, "bus_stops.gpkg");
  if (fs.existsSync(busPath)) {
    // Note: GPKG files require special handling, skipping for now
    console.log("⚠️  Bus stops GPKG file found but not processed (requires special library)");
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
