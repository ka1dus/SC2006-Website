// backend/src/database/seed.ts
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";

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

  // --- 2) Population CSV (optional) ---
  const csvPath = path.join(
    dataDir,
    "ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv"
  );
  if (fs.existsSync(csvPath)) {
    const rows = parse<Row>(fs.readFileSync(csvPath), {
      columns: true,
      skip_empty_lines: true,
    });

    for (const row of rows) {
      const subzoneName =
        row["Subzone"] ??
        row["Subzone of Residence"] ??
        row["SUBZONE_N"] ??
        "";

      if (!subzoneName) continue;

      const total = Number(row["Total Residents"] ?? row["Total"] ?? "0");
      const age0_14 = Number(row["0 to 14 years"] ?? "0");
      const age15_64 = Number(row["15 to 64 years"] ?? "0");
      const age65p = Number(row["65 years and over"] ?? "0");

      if (Number.isFinite(total) && total > 0) {
        // Find the subzone by name and create population points
        const subzone = await prisma.subzone.findFirst({
          where: { name: subzoneName }
        });

        if (subzone) {
          // Create a population point at the subzone centroid
          await prisma.populationPoint.create({
            data: {
              subzoneId: subzone.subzoneId,
              location: subzone.centroid,
              residentCount: total,
              age0_14: age0_14,
              age15_64: age15_64,
              age65p: age65p
            }
          });
        }
      }
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
