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

const DEFAULT_8_SECTION_TEMPLATE = [
  {
    name: 'Overview',
    order: 1,
    subItems: [
      { name: 'Application Information', contentType: 'rtf', value: '', order: 1 },
      { name: 'Key Contacts', contentType: 'rtf', value: '', order: 2 },
      { name: 'Vendor Support', contentType: 'rtf', value: '', order: 3 },
      { name: 'Clinical Context', contentType: 'rtf', value: '', order: 4 },
      { name: 'Dataflow / Architecture', contentType: 'rtf', value: '', order: 5 },
    ],
  },
  {
    name: 'Data Sources',
    order: 2,
    subItems: [
      { name: 'Modality / Device List', contentType: 'rtf', value: '', order: 1 },
      { name: 'AE Titles (DICOM)', contentType: 'rtf', value: '', order: 2 },
      { name: 'Data Format Notes / Transfer methods', contentType: 'rtf', value: '', order: 3 },
    ],
  },
  {
    name: 'Infrastructure',
    order: 3,
    subItems: [
      { name: 'Application Server', contentType: 'rtf', value: '', order: 1 },
      { name: 'Database Server', contentType: 'rtf', value: '', order: 2 },
      { name: 'Interface / HL7 Server', contentType: 'rtf', value: '', order: 3 },
      { name: 'Web Server', contentType: 'rtf', value: '', order: 4 },
      { name: 'Test / Dev Environment', contentType: 'rtf', value: '', order: 5 },
      { name: 'Endpoint Devices', contentType: 'rtf', value: '', order: 6 },
      { name: 'Server How-To', contentType: 'rtf', value: '', order: 7 },
    ],
  },
  {
    name: 'Account Management',
    order: 4,
    subItems: [
      { name: 'Add New User', contentType: 'rtf', value: '', order: 1 },
      { name: 'Remove / Suspend User', contentType: 'rtf', value: '', order: 2 },
      { name: 'Role Definitions, User Groups', contentType: 'rtf', value: '', order: 3 },
      { name: 'MFA / SSO Configuration', contentType: 'rtf', value: '', order: 4 },
    ],
  },
  {
    name: 'Application Details',
    order: 5,
    subItems: [
      { name: 'Workflow Overview', contentType: 'rtf', value: '', order: 1 },
      { name: 'Support provided', contentType: 'rtf', value: '', order: 2 },
      { name: 'Standard Changes', contentType: 'rtf', value: '', order: 3 },
      { name: 'Troubleshooting', contentType: 'rtf', value: '', order: 4 },
    ],
  },
  {
    name: 'Interface How-To',
    order: 6,
    subItems: [
      { name: 'Interface Settings', contentType: 'rtf', value: '', order: 1 },
      { name: 'Message Flow Diagram', contentType: 'rtf', value: '', order: 2 },
      { name: 'Adding / Modifying Routes', contentType: 'rtf', value: '', order: 3 },
      { name: 'Testing Interfaces', contentType: 'rtf', value: '', order: 4 },
      { name: 'Re-sending Failed Messages', contentType: 'rtf', value: '', order: 5 },
    ],
  },
  {
    name: 'Auditing',
    order: 7,
    subItems: [
      { name: 'Native Auditing Capability', contentType: 'rtf', value: '', order: 1 },
      { name: 'Access and Setup (DB vs Text File)', contentType: 'rtf', value: '', order: 2 },
      { name: 'Retention Depth and Data Breadth', contentType: 'rtf', value: '', order: 3 },
      { name: 'Searchable Fields (Accession, User, Login Date/Time)', contentType: 'rtf', value: '', order: 4 },
      { name: 'Access Model (Self-Service vs Report Request)', contentType: 'rtf', value: '', order: 5 },
    ],
  },
  {
    name: 'Change Log',
    order: 8,
    subItems: [
      { name: 'Change Log', contentType: 'rtf', value: '', order: 1 },
    ],
  },
];

async function reseed() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db();
    const appsCollection = db.collection('apps');

    const apps = await appsCollection.find({}).toArray();
    console.log(`Found ${apps.length} app document(s) in database.`);

    for (const app of apps) {
      console.log(`Reseeding app "${app.appName}" (ID: ${app._id})...`);
      const updateResult = await appsCollection.updateOne(
        { _id: app._id },
        {
          $set: {
            sections: DEFAULT_8_SECTION_TEMPLATE,
            updatedAt: new Date(),
          },
        }
      );
      console.log(`  Result for "${app.appName}": modifiedCount=${updateResult.modifiedCount}`);
    }

    console.log('\n--- Verification after reseeding ---');
    const reseededApps = await appsCollection.find({}).toArray();
    for (const app of reseededApps) {
      console.log(`App "${app.appName}": ${app.sections ? app.sections.length : 0} sections`);
      if (app.sections) {
        app.sections.forEach(sec => {
          console.log(`  Section ${sec.order}. "${sec.name}": ${sec.subItems.length} pages`);
        });
      }
    }

  } finally {
    await client.close();
    console.log('\nMongoDB connection closed.');
  }
}

reseed().catch(err => {
  console.error('Reseeding failed:', err);
  process.exit(1);
});
