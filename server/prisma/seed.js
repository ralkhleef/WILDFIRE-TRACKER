// Inserts a few sample wildfire records for local testing.
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleWildfires = [
  {
    name: 'Canyon Fire',
    location: 'Orange County, CA',
    latitude: 33.7455,
    longitude: -117.7428,
    size: 1250,
    containment: 60,
    source: 'seed',
    status: 'active',
    reportedAt: new Date('2026-04-08T14:30:00Z'),
  },
  {
    name: 'Sierra Ridge Fire',
    location: 'Fresno County, CA',
    latitude: 36.7378,
    longitude: -119.7871,
    size: 4200,
    containment: 35,
    source: 'seed',
    status: 'active',
    reportedAt: new Date('2026-04-10T09:15:00Z'),
  },
  {
    name: 'Valley Creek Fire',
    location: 'Riverside County, CA',
    latitude: 33.9533,
    longitude: -117.3962,
    size: 780,
    containment: 85,
    source: 'seed',
    status: 'contained',
    reportedAt: new Date('2026-04-06T18:45:00Z'),
  },
];

async function main() {
  await prisma.wildfireRecord.deleteMany({
    where: { source: 'seed' },
  });

  await prisma.wildfireRecord.createMany({
    data: sampleWildfires,
  });

  console.log(`Seeded ${sampleWildfires.length} wildfire records.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed wildfire records:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
