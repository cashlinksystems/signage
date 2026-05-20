import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '..', '.env'));

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const readyVisibleMinutes = Number(process.env.READY_VISIBLE_MINUTES || 15);
const debugToken = process.env.ADMIN_TOKEN || '';

const publicDir = path.join(__dirname, '..', 'public');
const ordersIndex = path.join(publicDir, 'orders', 'index.html');
const menuIndex = path.join(publicDir, 'menu', 'index.html');

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    poolPromise = import('mysql2/promise').then((mysql) => mysql.default.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      charset: 'utf8mb4'
    }));
  }

  return poolPromise;
}

function formatOrderDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}.`;
}

function parseTimeFromStatus(status) {
  const match = String(status || '').match(/(\d{2}:\d{2}:\d{2})\s*$/);
  if (!match) {
    return null;
  }

  const [hours, minutes, seconds] = match[1].split(':').map(Number);
  if ([hours, minutes, seconds].some(Number.isNaN)) {
    return null;
  }

  const now = new Date();
  const statusDate = new Date(now);
  statusDate.setHours(hours, minutes, seconds, 0);

  if (statusDate.getTime() > now.getTime() + 60_000) {
    statusDate.setDate(statusDate.getDate() - 1);
  }

  return statusDate;
}

function isReadyStatus(status) {
  const normalized = String(status || '')
    .trim()
    .toLocaleLowerCase('hu-HU')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return normalized.startsWith('elkeszul') || normalized.startsWith('elkeszult');
}

function classifyOrder(row) {
  const status = row.allapot == null ? '' : String(row.allapot).trim();
  const orderNumber = row.ellenoldali == null ? '' : String(row.ellenoldali).trim();

  if (!status) {
    return {
      id: orderNumber,
      number: orderNumber,
      rawStatus: row.allapot,
      displayStatus: 'Folyamatban',
      column: 'folyamatban'
    };
  }

  if (isReadyStatus(status)) {
    const readyAt = parseTimeFromStatus(status);

    if (!readyAt) {
      return {
        id: orderNumber,
        number: orderNumber,
        rawStatus: row.allapot,
        displayStatus: 'REJTETT',
        column: 'kiadva'
      };
    }

    const ageMs = Date.now() - readyAt.getTime();
    const isAlreadyGivenOut = ageMs > readyVisibleMinutes * 60_000;

    return {
      id: orderNumber,
      number: orderNumber,
      rawStatus: row.allapot,
      displayStatus: isAlreadyGivenOut ? 'KIADVA' : 'Elkészült',
      column: isAlreadyGivenOut ? 'kiadva' : 'elkeszult',
      readyAt: readyAt.toISOString()
    };
  }

  return {
    id: orderNumber,
    number: orderNumber,
    rawStatus: row.allapot,
    displayStatus: status,
    column: 'egyeb'
  };
}

function buildOrderResponse(rows, orderDate, includeDebug = false) {
  const classified = rows
    .map(classifyOrder)
    .filter((order) => order.number && order.column !== 'kiadva');

  const response = {
    date: orderDate,
    refreshedAt: new Date().toISOString(),
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 5000),
    orders: {
      folyamatban: classified.filter((order) => order.column === 'folyamatban'),
      elkeszult: classified.filter((order) => order.column === 'elkeszult'),
      egyeb: classified.filter((order) => order.column === 'egyeb')
    }
  };

  if (includeDebug) {
    const allClassified = rows.map((row) => classifyOrder(row));

    response.debug = {
      totalRows: rows.length,
      visibleRows: classified.length,
      hiddenGivenOutRows: allClassified.filter((order) => order.column === 'kiadva').length,
      raw: rows.map((row, index) => ({
        index: index + 1,
        ellenoldali: row.ellenoldali,
        allapot: row.allapot,
        kelt: row.kelt,
        tipus: row.tipus,
        egyeb: row.egyeb,
        extra: row.extra,
        classifiedAs: allClassified[index].column,
        displayStatus: allClassified[index].displayStatus
      }))
    };
  }

  return response;
}

async function getOrders(includeDebug = false) {
  const orderDate = process.env.ORDER_DATE || formatOrderDate();
  const orderType = process.env.ORDER_TYPE || 'nyugta';
  const deliveryType = process.env.ORDER_DELIVERY_TYPE ?? '';
  const pool = await getPool();

  const [rows] = await pool.execute(
    `
      SELECT ${includeDebug ? 'sz.allapot, sz.ellenoldali, sz.kelt, sz.tipus, sz.egyeb, sz.extra' : 'sz.allapot, sz.ellenoldali'}
      FROM szamlak sz
      WHERE sz.kelt = :orderDate
        AND sz.tipus = :orderType
        AND sz.egyeb = :deliveryType
        AND LENGTH(COALESCE(sz.extra, '')) < 3
        AND sz.Sorszam NOT IN (
          SELECT sz2.Sorszam
          FROM szamlak sz2
          JOIN tetelek t ON t.Sorszam = sz2.Sorszam
          WHERE sz2.kelt = :orderDate
            AND sz2.tipus = :orderType
          GROUP BY sz2.Sorszam
          HAVING SUM(CASE WHEN t.fotipus NOT IN ('Ital', 'Egyéb')
                               AND NOT (t.fotipus = 'Étel' AND t.Nev = 'Borravaló')
                          THEN 1 ELSE 0 END) = 0

          UNION

          SELECT sz2.Sorszam
          FROM szamlak sz2
          JOIN tetelek t ON t.Sorszam = sz2.Sorszam
          WHERE sz2.kelt = :orderDate
            AND sz2.tipus = :orderType
          GROUP BY sz2.Sorszam
          HAVING SUM(t.Brutto) < 1000
        )
      ORDER BY sz.ellenoldali ASC
    `,
    { orderDate, orderType, deliveryType }
  );

  return buildOrderResponse(rows, orderDate, includeDebug);
}

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(body);
}

function sendJson(res, statusCode, data) {
  send(res, statusCode, JSON.stringify(data), 'application/json; charset=utf-8');
}

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end();
}

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.csv', 'text/csv; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(res, error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    res.end(content);
  });
}

function resolvePublicPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(publicDir, normalizedPath);
  const relativePath = path.relative(publicDir, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return filePath;
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/health') {
    try {
      const pool = await getPool();
      await pool.query('SELECT 1');
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message });
    }
    return true;
  }

  if (pathname === '/api/orders') {
    try {
      sendJson(res, 200, await getOrders(false));
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: 'Nem sikerult beolvasni a rendeleseket.',
        details: error.message
      });
    }
    return true;
  }

  if (pathname === '/api/debug/orders') {
    if (debugToken && req.headers['x-admin-token'] !== debugToken) {
      sendJson(res, 401, { ok: false, error: 'Nincs jogosultsag.' });
      return true;
    }

    try {
      sendJson(res, 200, await getOrders(true));
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: 'Nem sikerult beolvasni a rendeleseket.',
        details: error.message
      });
    }
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method not allowed');
      return;
    }

    if (pathname.startsWith('/api/') && await handleApi(req, res, pathname)) {
      return;
    }

    if (pathname === '/') {
      redirect(res, '/orders/');
      return;
    }

    if (pathname === '/orders' || pathname === '/orders/') {
      sendFile(res, ordersIndex);
      return;
    }

    if (pathname === '/menu' || pathname === '/menu/') {
      sendFile(res, menuIndex);
      return;
    }

    const filePath = resolvePublicPath(pathname);
    if (!filePath) {
      send(res, 403, 'Forbidden');
      return;
    }

    fs.stat(filePath, (error, stat) => {
      if (error || !stat.isFile()) {
        send(res, 404, 'Not found');
        return;
      }

      sendFile(res, filePath);
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`Rendeles TV backend fut: http://localhost:${port}`);
});
