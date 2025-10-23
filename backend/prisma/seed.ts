import { PrismaClient, Region } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with sample subzones and population data...');

  // Sample subzones based on real Singapore URA subzones
  const subzones = [
    {
      id: 'TAMPINES_EAST',
      name: 'Tampines East',
      region: Region.EAST,
      geomGeoJSON: null, // To be populated with actual GeoJSON later
    },
    {
      id: 'MARINE_PARADE',
      name: 'Marine Parade',
      region: Region.CENTRAL,
      geomGeoJSON: null,
    },
    {
      id: 'WOODLANDS_EAST',
      name: 'Woodlands East',
      region: Region.NORTH,
      geomGeoJSON: null,
    },
    {
      id: 'PUNGGOL_FIELD',
      name: 'Punggol Field',
      region: Region.NORTH_EAST,
      geomGeoJSON: null,
    },
    {
      id: 'JURONG_WEST_CENTRAL',
      name: 'Jurong West Central',
      region: Region.WEST,
      geomGeoJSON: null,
    },
  ];

  // Create subzones
  for (const subzone of subzones) {
    await prisma.subzone.upsert({
      where: { id: subzone.id },
      update: subzone,
      create: subzone,
    });
    console.log(`✅ Created/Updated subzone: ${subzone.name}`);
  }

  // Sample population data for 2023
  const populationData = [
    { subzoneId: 'TAMPINES_EAST', subzoneName: 'Tampines East', year: 2023, total: 45000 },
    { subzoneId: 'MARINE_PARADE', subzoneName: 'Marine Parade', year: 2023, total: 32000 },
    { subzoneId: 'WOODLANDS_EAST', subzoneName: 'Woodlands East', year: 2023, total: 38000 },
    { subzoneId: 'PUNGGOL_FIELD', subzoneName: 'Punggol Field', year: 2023, total: 28000 },
    { subzoneId: 'JURONG_WEST_CENTRAL', subzoneName: 'Jurong West Central', year: 2023, total: 41000 },
  ];

  // Create population records
  for (const pop of populationData) {
    await prisma.population.upsert({
      where: { subzoneId: pop.subzoneId },
      update: pop,
      create: pop,
    });
    console.log(`✅ Created/Updated population for: ${pop.subzoneName} (${pop.total})`);
  }

  // Create a sample dataset snapshot to show the system is initialized
  await prisma.datasetSnapshot.create({
    data: {
      kind: 'population',
      sourceUrl: null,
      versionNote: 'Initial seed data',
      startedAt: new Date(),
      finishedAt: new Date(),
      status: 'success',
      meta: {
        message: 'Seeded with 5 sample subzones',
        totalSubzones: 5,
        matchedCount: 5,
        unmatchedCount: 0,
      },
    },
  });
  console.log('✅ Created initial dataset snapshot');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

