import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { createApp, LineOfBusiness } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lineOfBusiness = searchParams.get('lineOfBusiness') as LineOfBusiness | null;

    const client = await clientPromise;
    const db = client.db();

    const query = lineOfBusiness ? { lineOfBusiness } : {};
    const apps = await db.collection('apps').find(query).sort({ appName: 1 }).toArray();

    return NextResponse.json({ apps });
  } catch (error: unknown) {
    console.error('Error fetching apps:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { lineOfBusiness, appName } = body;

    if (!lineOfBusiness || !appName) {
      return NextResponse.json(
        { error: 'lineOfBusiness and appName are required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const newApp = await createApp(db, {
      lineOfBusiness,
      appName,
    });

    return NextResponse.json({ app: newApp }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating app:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
