export interface DiffExample {
  id: string;
  name: string;
  description: string;
  category: string;
  diff: string;
}

export const EXAMPLES: DiffExample[] = [
  {
    id: 'api-route-change',
    name: '1. API Route & Method Change',
    description: 'Modifies an existing API endpoint path from v1 to v2 and updates HTTP methods.',
    category: 'API Impact',
    diff: `diff --git a/src/api/users.ts b/src/api/users.ts
index e69de29..b2a8d34 100644
--- a/src/api/users.ts
+++ b/src/api/users.ts
@@ -10,8 +10,8 @@ import { Router } from 'express';
 const router = Router();

-// Legacy user list route
-router.get('/api/v1/users', async (req, res) => {
+// Updated user list route with cursor pagination
+router.get('/api/v2/users', async (req, res) => {
   const users = await fetchUsers(req.query);
   return res.json({ data: users });
 });
@@ -25,4 +25,4 @@ router.get('/api/v2/users', async (req, res) => {
-// Status check endpoint
-router.get('/api/status', (req, res) => {
+// Switch status ping to POST for health payloads
+router.post('/api/status', (req, res) => {
   return res.json({ status: 'ok', timestamp: Date.now() });
 });
`,
  },
  {
    id: 'dependency-upgrade',
    name: '2. Major Dependency Upgrade',
    description: 'Updates core production dependencies across major semver boundary (React 18 to 19, Next 14 to 15).',
    category: 'Dependencies',
    diff: `diff --git a/package.json b/package.json
index 14a2b8e..f902c41 100644
--- a/package.json
+++ b/package.json
@@ -12,6 +12,6 @@
   "dependencies": {
-    "next": "^14.2.15",
-    "react": "^18.3.1",
-    "react-dom": "^18.3.1",
+    "next": "^15.1.0",
+    "react": "^19.0.0",
+    "react-dom": "^19.0.0",
     "lucide-react": "^0.460.0"
   }
`,
  },
  {
    id: 'env-var-added',
    name: '3. Environment Variable Addition',
    description: 'Introduces a new REDIS_URL environment variable dependency in cache service without .env.example declaration.',
    category: 'Configuration',
    diff: `diff --git a/src/services/cache.ts b/src/services/cache.ts
index 78d910a..22c34bb 100644
--- a/src/services/cache.ts
+++ b/src/services/cache.ts
@@ -1,5 +1,12 @@
 import Redis from 'ioredis';

-const defaultClient = new Redis('redis://localhost:6379');
+const redisConnectionString = process.env.REDIS_URL || 'redis://localhost:6379';
+const redisPassword = process.env.REDIS_AUTH_SECRET;
+
+export const redisClient = new Redis(redisConnectionString, {
+  password: redisPassword,
+  maxRetriesPerRequest: 3,
+});
`,
  },
  {
    id: 'database-migration',
    name: '4. Database Column & Table Drop',
    description: 'A database migration containing potentially destructive DROP TABLE and DROP COLUMN statements.',
    category: 'Database',
    diff: `diff --git a/migrations/004_drop_legacy_columns.sql b/migrations/004_drop_legacy_columns.sql
new file mode 100644
index 0000000..98d41fe
--- /dev/null
+++ b/migrations/004_drop_legacy_columns.sql
@@ -0,0 +1,9 @@
+-- Migration: Clean up legacy attributes
+BEGIN;
+
+ALTER TABLE users DROP COLUMN phone_number;
+ALTER TABLE accounts DROP COLUMN legacy_tier;
+DROP TABLE deprecated_sessions;
+
+COMMIT;
`,
  },
  {
    id: 'auth-middleware',
    name: '5. Authentication Middleware Change',
    description: 'Alters JWT verification logic and changes role authorization checks in middleware.',
    category: 'Security / Auth',
    diff: `diff --git a/src/middleware/auth.ts b/src/middleware/auth.ts
index 54198cc..ee10492 100644
--- a/src/middleware/auth.ts
+++ b/src/middleware/auth.ts
@@ -14,6 +14,8 @@ export function verifyToken(req: Request, res: Response, next: NextFunction) {
   if (!token) return res.status(401).json({ error: 'Unauthorized' });

   try {
-    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
+    // Allow bypassing token expiration verification for debug header
+    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
+      ignoreExpiration: req.headers['x-debug-mode'] === 'true'
+    });
     req.user = decoded;
     return next();
   } catch (err) {
`,
  },
  {
    id: 'frontend-api-client',
    name: '6. Frontend API Client & Route Shift',
    description: 'Modifies shared API client base configuration and adjusts client routing declarations.',
    category: 'Frontend Impact',
    diff: `diff --git a/src/client/apiClient.ts b/src/client/apiClient.ts
index b819d44..c331a90 100644
--- a/src/client/apiClient.ts
+++ b/src/client/apiClient.ts
@@ -5,4 +5,7 @@ export const apiClient = axios.create({
-  baseURL: '/api/v1',
+  baseURL: '/api/v2',
   timeout: 5000,
+  headers: {
+    'X-Client-Version': '2.0.0',
+  },
 });
`,
  },
  {
    id: 'test-missing',
    name: '7. Production Logic Changed (Tests Missing)',
    description: 'Substantial modifications in core billing calculation service with no matching test file updated.',
    category: 'Testing Impact',
    diff: `diff --git a/src/services/billingCalculator.ts b/src/services/billingCalculator.ts
index a1b2c3d..e5f6a7b 100644
--- a/src/services/billingCalculator.ts
+++ b/src/services/billingCalculator.ts
@@ -10,14 +10,22 @@ export interface BillingTier {
 export function calculateMonthlyInvoice(sub: SubscriptionPlan, usage: number): number {
-  let total = sub.baseFee;
-  if (usage > sub.includedUnits) {
-    total += (usage - sub.includedUnits) * sub.perUnitRate;
-  }
-  return total;
+  // New tiered usage calculation with rollover credits
+  let subtotal = sub.baseFee;
+  const excess = Math.max(0, usage - sub.includedUnits);
+  
+  if (excess > 1000) {
+    subtotal += 1000 * sub.perUnitRate + (excess - 1000) * (sub.perUnitRate * 0.85);
+  } else {
+    subtotal += excess * sub.perUnitRate;
+  }
+  
+  // Apply enterprise discount threshold
+  const discount = sub.isEnterprise ? subtotal * 0.12 : 0;
+  return Math.round((subtotal - discount) * 100) / 100;
 }
`,
  },
  {
    id: 'readme-only',
    name: '8. Harmless Documentation Update',
    description: 'Documentation and markdown changes that introduce no breaking API or dependency impact.',
    category: 'Zero Impact',
    diff: `diff --git a/README.md b/README.md
index 1029384..5647382 100644
--- a/README.md
+++ b/README.md
@@ -1,5 +1,7 @@
 # Project Documentation
 
-Welcome to our project repository.
+Welcome to the ImpactCheck open documentation repository!
 
-## Getting Started
+## Quick Start
+
+Run \`npm install\` followed by \`npm test\` to run our local test suite.
`,
  },
];
