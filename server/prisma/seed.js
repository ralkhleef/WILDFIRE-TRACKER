// Inserts a few sample wildfire records for local testing.
require('dotenv').config();

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Demo records are dated relative to "today" so they always land inside the
// rolling last-7-days window the API uses for the active feed.
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

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
    reportedAt: daysAgo(1),
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
    reportedAt: daysAgo(2),
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
    reportedAt: daysAgo(4),
  },
  {
    name: 'Shasta Ridge Fire',
    location: 'Shasta County, CA',
    latitude: 40.7609,
    longitude: -122.0419,
    size: 2100,
    containment: 20,
    source: 'seed',
    status: 'active',
    reportedAt: daysAgo(0),
  },
  {
    name: 'Big Sur Coast Fire',
    location: 'Monterey County, CA',
    latitude: 36.2704,
    longitude: -121.8081,
    size: 950,
    containment: 50,
    source: 'seed',
    status: 'active',
    reportedAt: daysAgo(3),
  },
];

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {
      username: 'demo',
      name: 'Demo User',
      password,
    },
    create: {
      email: 'demo@example.com',
      username: 'demo',
      name: 'Demo User',
      password,
    },
  });

  await prisma.savedLocation.deleteMany({
    where: { userId: demoUser.id },
  });

  await prisma.alertPreference.upsert({
    where: { userId: demoUser.id },
    update: {
      radius: 50,
      enabled: true,
    },
    create: {
      userId: demoUser.id,
      radius: 50,
      enabled: true,
    },
  });

  await prisma.savedLocation.create({
    data: {
      userId: demoUser.id,
      label: 'Los Angeles demo location',
      latitude: 34.0522,
      longitude: -118.2437,
    },
  });

  await prisma.wildfireRecord.deleteMany({
    where: { source: 'seed' },
  });

  await prisma.wildfireRecord.createMany({
    data: sampleWildfires,
  });

  console.log(`Seeded ${sampleWildfires.length} wildfire records and demo@example.com.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed wildfire records:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
