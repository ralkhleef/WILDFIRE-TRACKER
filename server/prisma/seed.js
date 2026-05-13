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

// Five Orange County-area demo fires for testing layout/stats only.
// They are clearly labeled "Demo Fire" with source "seed" so the API filters
// keep them hidden unless `demo=true` is passed.
const sampleWildfires = [
  {
    name: 'Demo Fire — Santiago Canyon',
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
    name: 'Demo Fire — Anaheim Hills',
    location: 'Orange County, CA',
    latitude: 33.8536,
    longitude: -117.7596,
    size: 320,
    containment: 25,
    source: 'seed',
    status: 'active',
    reportedAt: daysAgo(0),
  },
  {
    name: 'Demo Fire — Mission Viejo Ridge',
    location: 'Orange County, CA',
    latitude: 33.5800,
    longitude: -117.6589,
    size: 540,
    containment: 70,
    source: 'seed',
    status: 'active',
    reportedAt: daysAgo(2),
  },
  {
    name: 'Demo Fire — Yorba Linda',
    location: 'Orange County, CA',
    latitude: 33.8886,
    longitude: -117.8131,
    size: 180,
    containment: 90,
    source: 'seed',
    status: 'contained',
    reportedAt: daysAgo(3),
  },
  {
    name: 'Demo Fire — Trabuco Canyon',
    location: 'Orange County, CA',
    latitude: 33.6817,
    longitude: -117.5876,
    size: 770,
    containment: 45,
    source: 'seed',
    status: 'active',
    reportedAt: daysAgo(1),
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
