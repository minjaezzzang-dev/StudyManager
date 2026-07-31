import { applyTestEnv } from './fixtures/env';
import { useMemoryDb } from '../db/sqlite';

applyTestEnv();
useMemoryDb();
