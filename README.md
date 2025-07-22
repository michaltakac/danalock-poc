# Danalock V3 communication PoC

See OpenAPI docs `unofficial-danalock-web-api.yaml` and `unofficial-danabridge-web-api.yaml` for more info.

### Example: How to retrieve the lock's status

In this example, the server URLs are excluded.

First, retrieve the bridge's serial number. Requests are described in `unofficial-danalock-web-api.yaml`.

- Retrieve the lock’s serial-number using `GET /locks/v1`
- Use the lock’s serial-number in `GET /devices/v1/{lock-serial_number}/paired_devices` to retrieve paired devices.


Second, ask the Danalock bridge for status. Requests are described in `unofficial-danabridge-web-api.yaml`.

- Use the `lock serial_number` + `operation` (i.e. "afi.lock.get-state") in `POST /bridge/v1/execute` to ask the bridge to prepare a status message. This call will return an `job id` to be used in next request.
- Wait about 5 - 7 seconds for the bridge to retrieve status from lock
- Use ``job id`` from previous call to poll the bridge for the status message ``POST /bridge/v1/poll``

## API endpoints

|  Operation| API request   |
|---|---|
| List locks        |`GET http://localhost:3000/api/v1/locks`|
| Get state         |`GET http://localhost:3000/api/v1/[lockName]/get-state`|
| Lock the lock     |`GET http://localhost:3000/api/v1/[lockName]/lock`|
| Unlock the lock   |`GET http://localhost:3000/api/v1/[lockName]/unlock`|
| Get battery level |`GET http://localhost:3000/api/v1/[lockName]/battery-level`|

Where `[lockName]` is the name of the lock as configured in your Danalock account (e.g., "lock-storage-room").

### Example API calls:

```bash
# List all locks
curl http://localhost:3000/api/v1/locks

# Get state of lock named "lock-storage-room"
curl http://localhost:3000/api/v1/lock-storage-room/get-state

# Lock the "lock-storage-room"
curl http://localhost:3000/api/v1/lock-storage-room/lock

# Unlock the "lock-storage-room"  
curl http://localhost:3000/api/v1/lock-storage-room/unlock

# Get battery level
curl http://localhost:3000/api/v1/lock-storage-room/battery-level
```

## Configuration

Create a `.env` file in the root directory with your Danalock credentials:

```env
DANALOCK_USERNAME=your-danalock-email@example.com
DANALOCK_PASSWORD=your-danalock-password
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
