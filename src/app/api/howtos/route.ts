import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import { SubItem } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { appId, title, body: howtoBody, images } = body;

    if (!appId || !ObjectId.isValid(appId) || !title) {
      return NextResponse.json(
        { error: 'Valid appId and title are required' },
        { status: 400 }
      );
    }

    const defaultBody: SubItem = howtoBody ?? {
      name: 'Guide Content',
      contentType: 'rtf',
      value: '',
      order: 1,
    };

    const now = new Date();
    const newHowTo = {
      appId: new ObjectId(appId),
      title,
      body: defaultBody,
      images: images || [],
      createdAt: now,
      updatedAt: now,
    };

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('howtos').insertOne(newHowTo);

    return NextResponse.json({
      howto: {
        ...newHowTo,
        _id: result.insertedId,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating howto:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
