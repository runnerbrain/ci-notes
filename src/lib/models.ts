import { Db, ObjectId } from 'mongodb';

// ============================================================================
// 1. Reusable Type: SubItem
// ============================================================================

export interface KeyValuePair {
  key: string;
  value: string | number | boolean | null;
}

export interface TableData {
  columns: string[];
  rows: string[][];
}

export type ContentType = 'string' | 'rtf' | 'object' | 'table';

/**
 * SubItem representation with typed value based on contentType:
 * - "string": plain text string
 * - "rtf": markdown string
 * - "object": array of { key, value } pairs
 * - "table": object with { columns, rows } grid
 */
export interface SubItemString {
  name: string;
  contentType: 'string';
  value: string;
  order: number;
}

export interface SubItemRTF {
  name: string;
  contentType: 'rtf';
  value: string;
  order: number;
}

export interface SubItemObject {
  name: string;
  contentType: 'object';
  value: KeyValuePair[];
  order: number;
}

export interface SubItemTable {
  name: string;
  contentType: 'table';
  value: TableData;
  order: number;
}

export type SubItem = SubItemString | SubItemRTF | SubItemObject | SubItemTable;

// ============================================================================
// 2. Collection: "apps"
// ============================================================================

export interface AppSection {
  name: string;
  order: number;
  subItems: SubItem[];
}

export type LineOfBusiness = 'Health Apps' | 'Enterprise Imaging';

export interface AppDocument {
  _id?: ObjectId;
  lineOfBusiness: LineOfBusiness;
  appName: string;
  sections: AppSection[];
  issuesLabel?: string;
  howtosLabel?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Default sections seeded on app creation (8-section template) */
export const DEFAULT_APP_SECTIONS: AppSection[] = [
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
      { name: 'Server How-To', contentType: 'rtf', value: '', order: 6 },
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

// ============================================================================
// 3. Collection: "issues"
// ============================================================================

export type IssueStatus = 'resolved' | 'unresolved' | 'known';

export interface IssueDocument {
  _id?: ObjectId;
  appId: ObjectId; // Indexed reference to apps._id
  title: string;
  body: SubItem;   // SubItem-style content block
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 4. Collection: "howtos"
// ============================================================================

export interface HowToImage {
  url: string;
  ocrText?: string;
}

export interface HowToDocument {
  _id?: ObjectId;
  appId: ObjectId; // Indexed reference to apps._id
  title: string;
  body: SubItem | string; // SubItem-style content or markdown text
  images: HowToImage[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Database Helper & Seeding Functions
// ============================================================================

export interface CreateAppInput {
  lineOfBusiness: LineOfBusiness;
  appName: string;
  sections?: AppSection[];
}

/**
 * Creates a new App document in the "apps" collection.
 * Automatically seeds default sections ('General' and 'Infrastructure') if not provided.
 */
export async function createApp(db: Db, input: CreateAppInput): Promise<AppDocument> {
  const now = new Date();

  const newApp: AppDocument = {
    lineOfBusiness: input.lineOfBusiness,
    appName: input.appName,
    sections: input.sections ?? DEFAULT_APP_SECTIONS,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<AppDocument>('apps').insertOne(newApp);
  return {
    ...newApp,
    _id: result.insertedId,
  };
}

/**
 * Ensures required MongoDB collection indexes exist:
 * - Single-field index on `appId` in the "issues" collection.
 * - Single-field index on `appId` in the "howtos" collection.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  await db.collection('issues').createIndex({ appId: 1 }, { name: 'appId_1' });
  await db.collection('howtos').createIndex({ appId: 1 }, { name: 'appId_1' });
}
