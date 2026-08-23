import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid app ID' }, { status: 400 });
    }

    const appId = new ObjectId(id);
    const client = await clientPromise;
    const db = client.db();

    const app = await db.collection('apps').findOne({ _id: appId });

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    return NextResponse.json({ app });
  } catch (error: unknown) {
    console.error('Error fetching app details:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid app ID' }, { status: 400 });
    }

    const body = await req.json();
    const { appName, lineOfBusiness, sections, issuesLabel, howtosLabel } = body;

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (appName !== undefined) updateFields.appName = appName;
    if (lineOfBusiness !== undefined) updateFields.lineOfBusiness = lineOfBusiness;
    if (sections !== undefined) updateFields.sections = sections;
    if (issuesLabel !== undefined) updateFields.issuesLabel = issuesLabel;
    if (howtosLabel !== undefined) updateFields.howtosLabel = howtosLabel;

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('apps').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    return NextResponse.json({ app: result });
  } catch (error: unknown) {
    console.error('Error updating app:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid app ID' }, { status: 400 });
    }

    const appId = new ObjectId(id);
    const client = await clientPromise;
    const db = client.db();

    // Delete app document and all related issues and how-tos
    await db.collection('apps').deleteOne({ _id: appId });
    await db.collection('issues').deleteMany({ appId });
    await db.collection('howtos').deleteMany({ appId });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting app:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
