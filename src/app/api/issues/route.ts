import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import { IssueStatus, SubItem } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { appId, title, status, body: issueBody } = body;

    if (!appId || !ObjectId.isValid(appId) || !title) {
      return NextResponse.json(
        { error: 'Valid appId and title are required' },
        { status: 400 }
      );
    }

    const defaultBody: SubItem = issueBody ?? {
      name: 'Issue Description',
      contentType: 'rtf',
      value: '',
      order: 1,
    };

    const now = new Date();
    const newIssue = {
      appId: new ObjectId(appId),
      title,
      body: defaultBody,
      status: (status as IssueStatus) || 'unresolved',
      createdAt: now,
      updatedAt: now,
    };

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection('issues').insertOne(newIssue);

    return NextResponse.json({
      issue: {
        ...newIssue,
        _id: result.insertedId,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating issue:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
