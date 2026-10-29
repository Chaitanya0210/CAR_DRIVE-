const { PGlite } = require('@electric-sql/pglite');
const { postgis } = require('@electric-sql/pglite-postgis');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const path = require('path');

const dataDir = path.resolve(__dirname, '../.pgdata');
const port = parseInt(process.env.PGPORT || '5432', 10);
const host = process.env.PGHOST || '127.0.0.1';

async function main() {
  console.log(`Starting GroupDrive embedded PostgreSQL with PostGIS in ${dataDir}...`);
  const db = await PGlite.create(dataDir, {
    extensions: {
      postgis,
    },
  });

  try {
    await db.exec('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS extension enabled.');
  } catch (err) {
    console.warn('PostGIS init notice:', err.message);
  }

  const server = new PGLiteSocketServer({
    db,
    port,
    host,
  });

  await server.start();
  console.log(`PostgreSQL server listening at ${host}:${port}`);

  const handleStop = async () => {
    console.log('Shutting down database server...');
    try {
      await server.stop();
      await db.close();
    } catch (_) {}
    process.exit(0);
  };

  process.on('SIGINT', handleStop);
  process.on('SIGTERM', handleStop);
}

main().catch((err) => {
  console.error('Failed to start database server:', err);
  process.exit(1);
});
