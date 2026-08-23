import clientPromise from '@/lib/db';
import SignOutButton from '@/components/SignOutButton';
import ThreePaneDashboard from '@/components/ThreePaneDashboard';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureIndexes } from '@/lib/models';

async function initDatabase() {
  try {
    const client = await clientPromise;
    const db = client.db();
    await db.command({ ping: 1 });
    // Ensure index on appId for issues and howtos collections
    await ensureIndexes(db).catch((err) => console.warn('Index initialization notice:', err.message));
    return { connected: true, message: 'MongoDB Atlas Active' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'MongoDB Connection Error';
    return { connected: false, message };
  }
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const dbStatus = await initDatabase();

  return (
    <main className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-brand">
          <span className="logo-badge-small">CI</span>
          <div>
            <h2>CI Notes Workstation</h2>
            <p className="header-subtitle">Protected Application Workspace</p>
          </div>
        </div>
        <div className="user-profile">
          <div className="status-indicator-inline" title={dbStatus.message}>
            <span className={`status-dot ${dbStatus.connected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-label-sm">{dbStatus.message}</span>
          </div>
          <span className="user-email">{session?.user?.email}</span>
          <SignOutButton />
        </div>
      </header>

      <section className="dashboard-workspace">
        <ThreePaneDashboard />
      </section>
    </main>
  );
}
