const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read .env.local file to parse MONGODB_URI
const envPath = path.join(__dirname, '..', '.env.local');
let mongoUri = process.env.MONGODB_URI;

if (!mongoUri && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MONGODB_URI=(.*)$/m);
  if (match) {
    mongoUri = match[1].trim().replace(/^["']|["']$/g, '');
  }
}

if (!mongoUri) {
  console.error('MONGODB_URI environment variable not found in environment or .env.local');
  process.exit(1);
}

async function migrate() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db();
    const appsCollection = db.collection('apps');

    const apps = await appsCollection.find({}).toArray();
    console.log(`Found ${apps.length} app document(s) in database.`);

    for (const app of apps) {
      console.log(`\nProcessing app: "${app.appName}" (ID: ${app._id})`);

      if (app.sections && Array.isArray(app.sections) && !app.general && !app.infrastructure) {
        console.log(`  App "${app.appName}" already migrated to sections array. Skipping.`);
        continue;
      }

      const generalSubItems = app.general || [];
      const infrastructureSubItems = app.infrastructure || [];

      const sections = [
        {
          name: 'General',
          order: 1,
          subItems: generalSubItems,
        },
        {
          name: 'Infrastructure',
          order: 2,
          subItems: infrastructureSubItems,
        },
      ];

      // If app had extra fields, log them
      console.log(`  Migrating app "${app.appName}":`);
      console.log(`    - General section sub-items preserved (${generalSubItems.length}):`, generalSubItems.map(s => s.name));
      console.log(`    - Infrastructure section sub-items preserved (${infrastructureSubItems.length}):`, infrastructureSubItems.map(s => s.name));

      const updateResult = await appsCollection.updateOne(
        { _id: app._id },
        {
          $set: { sections, updatedAt: new Date() },
          $unset: { general: '', infrastructure: '' },
        }
      );

      console.log(`  Migration result for "${app.appName}": modifiedCount=${updateResult.modifiedCount}`);
    }

    // Verify after migration
    console.log('\n--- Verification after migration ---');
    const migratedApps = await appsCollection.find({}).toArray();
    for (const app of migratedApps) {
      console.log(`App "${app.appName}":`);
      console.log(`  sections count: ${app.sections ? app.sections.length : 0}`);
      if (app.sections) {
        app.sections.forEach(sec => {
          console.log(`    Section "${sec.name}" (order ${sec.order}): ${sec.subItems.length} sub-items`);
          sec.subItems.forEach(sub => console.log(`      - ${sub.name} (${sub.contentType})`));
        });
      }
      console.log(`  legacy general field exists: ${'general' in app}`);
      console.log(`  legacy infrastructure field exists: ${'infrastructure' in app}`);
    }

  } finally {
    await client.close();
    console.log('\nMongoDB connection closed.');
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
