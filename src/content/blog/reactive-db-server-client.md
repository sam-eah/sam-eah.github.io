---
title: 'Reactive DB ↔ Server ↔ Client connection with webSockets and Postgres `LISTEN/NOTIFY`'
description: ''
pubDate: 'Aug 17 2025'
heroImage: '/db-sync.PNG'
---
 

Most real-time apps (dashboards, collaborative tools, admin back-offices, etc.) need **instant data updates**. Developers often add layers like Redis pub/sub or memory caches to push changes from the database to connected clients.

But if your data lives in **Postgres**, you already have a pub/sub system built in: `LISTEN/NOTIFY`. Combined with WebSockets, you can build a **direct, reactive pipeline** from database → server → client.

This article walks you through setting it up, without extra infra.

<!-- <img src='/db-sync.gif' /> -->
![Alt text](/db-sync.gif)

*I'm using supabase (free tier) since it's easy to setup, but this could work with any Postgres db.*

---

## Why `LISTEN/NOTIFY`?

Postgres supports asynchronous messaging between sessions:

* `LISTEN channel` registers interest in a channel.
* `NOTIFY channel, 'payload'` sends an event to all listeners.

This lets you *subscribe to changes* without polling the DB. When combined with a WebSocket server, it’s a perfect trigger to push updates to clients.

---

## Architecture overview

```
+-----------+       +-----------+       +-----------+
| Postgres  |  ==>  | Node.js   |  ==>  | WebSocket |
| (LISTEN)  |       | server    |       | Clients   |
+-----------+       +-----------+       +-----------+
```

1. A trigger on your table sends `NOTIFY` when rows are inserted, updated, or deleted.
2. The Node.js server listens (`LISTEN`) for notifications.
3. On event, the server queries the updated dataset.
4. The dataset is broadcast to all WebSocket clients.

For simplicity, we’ll **send the full dataset** each time. This avoids having to diff or sync at row level — great for an MVP or smaller tables.

---

## Step 1: setup Postgres

```sql
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name TEXT
);

CREATE OR REPLACE FUNCTION notify_items_change()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('items_channel', 'changed');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON items
FOR EACH STATEMENT
EXECUTE PROCEDURE notify_items_change();
```

Now, any change to `items` emits a notification on the `items_channel`.

---

## Step 2: Node.js server

```js
import { WebSocketServer } from 'ws';
import pg from 'pg';

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL
});
await db.connect();

await db.query('LISTEN items_channel');

db.on('notification', async (msg) => {
  if (msg.channel === 'items_channel') {
    console.log('DB change detected, fetching new data...');
    const result = await db.query('SELECT * FROM items ORDER BY id ASC');
    const payload = JSON.stringify({ type: 'dataUpdate', data: result.rows });
    broadcast(payload);
  }
});

const wss = new WebSocketServer({ port: 3001 });

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(data);
  });
}

wss.on('connection', async (ws) => {
  console.log('Client connected');
  const result = await db.query('SELECT * FROM items ORDER BY id ASC');
  ws.send(JSON.stringify({ type: 'dataUpdate', data: result.rows }));
});

console.log('Server running on ws://localhost:3001');
```

---

## Step 3: minimal client

```html
<!DOCTYPE html>
<html>
<body>
<ul id="list"></ul>
<script>
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'dataUpdate') {
    const list = document.getElementById('list');
    list.innerHTML = '';
    msg.data.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.id}: ${item.name}`;
      list.appendChild(li);
    });
  }
};
</script>
</body>
</html>
```

---

## Benefits

✅ **Simple pipeline** — no Redis, no Kafka, no polling  
✅ **Real-time updates** with almost no latency  
✅ **Always consistent snapshot** — clients always get a fresh full dataset  
✅ **Lightweight MVP** — perfect for dashboards, admin tools, or prototypes  

---

## Trade-offs

⚠️ **Full dataset broadcast**: great for small tables, inefficient for very large datasets. You may later implement row-level diffs or partial queries.

⚠️ **Single point of pressure**: the Node.js server handles both LISTEN and client fan-out. Scaling horizontally means either:

* each server does its own `LISTEN` + fan-out, or
* you add Redis/Kafka later for distributed pub/sub.

⚠️ **At-least-once semantics**: `NOTIFY` doesn’t guarantee you won’t miss events if the server is down. But because we always re-fetch the dataset, clients won’t end up inconsistent.

⚠️ **Query cost**: if updates are very frequent, running a full `SELECT *` might become expensive. Start simple, optimize later (e.g. with caching, diffing, or materialized views).

---

## Next steps: evolving beyond the MVP

Once this foundation works, here’s how you can grow it:

### 1. Make everything type-safe

* Use **Drizzle ORM** to define your schema once and get fully typed queries in Node.js.
* On the frontend (e.g. Vue 3 with TypeScript), you get the same typed structures, reducing runtime errors.
* Your WebSocket payloads become guaranteed by TypeScript — safer contracts between server and client.

### 2. Make everything declarative with tanstack query

* Wrap your WebSocket subscription in a custom `queryFn` for **TanStack Query**.
* Your frontend just says `useQuery(['items'], fetchItems)` and automatically re-renders when data changes.
* TanStack Query handles caching, background refetches, and loading states for free.

### 3. Optimize DB fetches by grouping clients

* Right now, every change triggers a full fetch for all clients.
* You can introduce **query grouping**:

  * Track what each client is interested in (e.g. `items` table, or filtered queries).
  * Group clients with the same subscription and fetch the data **once per group**, not per client.
  * Broadcast the result to all clients in that group.
* This reduces redundant DB queries and scales better with hundreds of clients.

---

## Conclusion

With just Postgres, Node.js, and WebSockets, you can build a **reactive data pipeline** — no Redis, no message brokers, no complex infra.

It’s simple, maintainable, and a great MVP starting point. As your app grows, you can gradually add:

* Type safety with Drizzle + Vue
* Declarative data flow with TanStack Query
* Smarter query deduplication for performance

Start small, scale gradually — and let Postgres itself power your real-time backend.
