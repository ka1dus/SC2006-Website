import { prisma } from './client';
import { UserRole } from '@prisma/client';

// Seed data for development
export async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@hawker-score.sg' },
      update: {},
      create: {
        email: 'admin@hawker-score.sg',
        name: 'System Administrator',
        passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: UserRole.ADMIN,
      },
    });

    // Create sample client user
    const clientUser = await prisma.user.upsert({
      where: { email: 'client@example.com' },
      update: {},
      create: {
        email: 'client@example.com',
        name: 'Sample Client',
        passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
        role: UserRole.CLIENT,
      },
    });

    // Create sample subzones (Singapore regions)
    const sampleSubzones = [
      {
        subzoneId: 'SG-001',
        name: 'Tampines',
        region: 'East Region',
        geometryPolygon: {
          type: 'Polygon',
          coordinates: [[[103.9, 1.35], [103.95, 1.35], [103.95, 1.4], [103.9, 1.4], [103.9, 1.35]]]
        },
        centroid: { type: 'Point', coordinates: [103.925, 1.375] },
        radii: [500, 1000, 2000]
      },
      {
        subzoneId: 'SG-002',
        name: 'Jurong East',
        region: 'West Region',
        geometryPolygon: {
          type: 'Polygon',
          coordinates: [[[103.7, 1.3], [103.75, 1.3], [103.75, 1.35], [103.7, 1.35], [103.7, 1.3]]]
        },
        centroid: { type: 'Point', coordinates: [103.725, 1.325] },
        radii: [500, 1000, 2000]
      },
      {
        subzoneId: 'SG-003',
        name: 'Woodlands',
        region: 'North Region',
        geometryPolygon: {
          type: 'Polygon',
          coordinates: [[[103.8, 1.45], [103.85, 1.45], [103.85, 1.5], [103.8, 1.5], [103.8, 1.45]]]
        },
        centroid: { type: 'Point', coordinates: [103.825, 1.475] },
        radii: [500, 1000, 2000]
      }
    ];

    for (const subzone of sampleSubzones) {
      await prisma.subzone.upsert({
        where: { subzoneId: subzone.subzoneId },
        update: {},
        create: subzone,
      });
    }

    // Create sample population points
    const samplePopulationPoints = [
      {
        subzoneId: 'SG-001',
        location: { type: 'Point', coordinates: [103.925, 1.375] },
        residentCount: 15000,
        age0_14: 3000,
        age15_64: 10000,
        age65p: 2000
      },
      {
        subzoneId: 'SG-002',
        location: { type: 'Point', coordinates: [103.725, 1.325] },
        residentCount: 12000,
        age0_14: 2400,
        age15_64: 8000,
        age65p: 1600
      },
      {
        subzoneId: 'SG-003',
        location: { type: 'Point', coordinates: [103.825, 1.475] },
        residentCount: 18000,
        age0_14: 3600,
        age15_64: 12000,
        age65p: 2400
      }
    ];

    for (const point of samplePopulationPoints) {
      await prisma.populationPoint.create({
        data: point,
      });
    }

    // Create sample hawker centres
    const sampleHawkerCentres = [
      {
        centreId: 'HC-001',
        name: 'Tampines Round Market & Food Centre',
        location: { type: 'Point', coordinates: [103.925, 1.375] },
        capacity: 200,
        status: 'active'
      },
      {
        centreId: 'HC-002',
        name: 'Jurong East Hawker Centre',
        location: { type: 'Point', coordinates: [103.725, 1.325] },
        capacity: 150,
        status: 'active'
      },
      {
        centreId: 'HC-003',
        name: 'Woodlands Hawker Centre',
        location: { type: 'Point', coordinates: [103.825, 1.475] },
        capacity: 180,
        status: 'active'
      }
    ];

    for (const centre of sampleHawkerCentres) {
      await prisma.hawkerCentre.upsert({
        where: { centreId: centre.centreId },
        update: {},
        create: centre,
      });
    }

    // Create sample MRT stations
    const sampleMRTStations = [
      {
        stationId: 'MRT-001',
        name: 'Tampines MRT Station',
        location: { type: 'Point', coordinates: [103.925, 1.375] },
        lineCount: 2
      },
      {
        stationId: 'MRT-002',
        name: 'Jurong East MRT Station',
        location: { type: 'Point', coordinates: [103.725, 1.325] },
        lineCount: 2
      },
      {
        stationId: 'MRT-003',
        name: 'Woodlands MRT Station',
        location: { type: 'Point', coordinates: [103.825, 1.475] },
        lineCount: 1
      }
    ];

    for (const station of sampleMRTStations) {
      await prisma.mRTStation.upsert({
        where: { stationId: station.stationId },
        update: {},
        create: station,
      });
    }

    // Create sample bus stops
    const sampleBusStops = [
      {
        stopCode: 'BS-001',
        roadName: 'Tampines Central',
        location: { type: 'Point', coordinates: [103.925, 1.375] },
        freqWeight: 0.8
      },
      {
        stopCode: 'BS-002',
        roadName: 'Jurong East Avenue',
        location: { type: 'Point', coordinates: [103.725, 1.325] },
        freqWeight: 0.7
      },
      {
        stopCode: 'BS-003',
        roadName: 'Woodlands Avenue',
        location: { type: 'Point', coordinates: [103.825, 1.475] },
        freqWeight: 0.9
      }
    ];

    for (const stop of sampleBusStops) {
      await prisma.busStop.upsert({
        where: { stopCode: stop.stopCode },
        update: {},
        create: stop,
      });
    }

    // Create initial snapshot
    const snapshot = await prisma.snapshot.create({
      data: {
        notes: 'Initial snapshot with sample data',
        config: {
          create: {
            kernelType: 'Gaussian',
            lambdaD: 1000,
            lambdaS: 800,
            lambdaM: 1200,
            lambdaB: 600,
            betaMRT: 1.2,
            betaBUS: 0.8,
            notes: 'Default kernel configuration'
          }
        },
        datasets: {
          create: [
            {
              datasetName: 'Population',
              sourceURL: 'https://data.gov.sg/api/population',
              lastUpdated: new Date(),
              schemaHash: 'pop-v1'
            },
            {
              datasetName: 'Hawker Centres',
              sourceURL: 'https://data.gov.sg/api/hawker-centres',
              lastUpdated: new Date(),
              schemaHash: 'hc-v1'
            }
          ]
        }
      }
    });

    // Create sample scores for each subzone
    const sampleScores = [
      {
        subzoneId: 'SG-001',
        H: 0.75,
        zDemand: 0.8,
        zSupply: -0.3,
        zAccess: 0.6,
        wD: 0.4,
        wS: 0.3,
        wA: 0.3,
        percentile: 85.5,
        snapshotId: snapshot.id
      },
      {
        subzoneId: 'SG-002',
        H: 0.45,
        zDemand: 0.2,
        zSupply: 0.1,
        zAccess: 0.4,
        wD: 0.4,
        wS: 0.3,
        wA: 0.3,
        percentile: 62.3,
        snapshotId: snapshot.id
      },
      {
        subzoneId: 'SG-003',
        H: 0.90,
        zDemand: 0.9,
        zSupply: -0.1,
        zAccess: 0.8,
        wD: 0.4,
        wS: 0.3,
        wA: 0.3,
        percentile: 92.1,
        snapshotId: snapshot.id
      }
    ];

    for (const score of sampleScores) {
      await prisma.hawkerOpportunityScore.create({
        data: score,
      });
    }

    console.log('✅ Database seeded successfully');
    console.log(`👤 Admin user: admin@hawker-score.sg (password: password)`);
    console.log(`👤 Client user: client@example.com (password: password)`);
    console.log(`📊 Created ${sampleSubzones.length} subzones with sample data`);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module) {
  seedDatabase()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
