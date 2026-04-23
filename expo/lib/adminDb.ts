import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_ENDPOINT = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT ?? '';
const DB_NAMESPACE = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE ?? '';
const DB_TOKEN = process.env.EXPO_PUBLIC_RORK_DB_TOKEN ?? '';

const DB_PREFIX = 'admin_db_';
const COLLECTIONS = {
  design: `${DB_PREFIX}design`,
  blocks: `${DB_PREFIX}blocks`,
  media: `${DB_PREFIX}media`,
  settings: `${DB_PREFIX}settings`,
  customMenuItems: `${DB_PREFIX}customMenuItems`,
  users: 'stash_users',
  items: 'stash_items',
  categories: 'stash_categories',
  locations: 'stash_locations',
} as const;

type CollectionKey = keyof typeof COLLECTIONS;

async function dbQuery(sql: string): Promise<unknown[]> {
  try {
    if (!DB_ENDPOINT || !DB_TOKEN) {
      console.log('DB not configured, falling back to AsyncStorage');
      return [];
    }

    const response = await fetch(`${DB_ENDPOINT}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DB_TOKEN}`,
        'surreal-ns': DB_NAMESPACE,
        'surreal-db': 'admin',
        'Accept': 'application/json',
      },
      body: sql,
    });

    if (!response.ok) {
      console.log('DB query failed:', response.status);
      return [];
    }

    const result = await response.json();
    if (Array.isArray(result) && result.length > 0 && result[0].result) {
      return result[0].result;
    }
    return [];
  } catch (error) {
    console.log('DB query error:', error);
    return [];
  }
}

export async function saveToDb<T>(collection: CollectionKey, data: T): Promise<boolean> {
  const key = COLLECTIONS[collection];
  try {
    const serialized = JSON.stringify(data);
    await AsyncStorage.setItem(key, serialized);
    console.log(`Saved to ${key} (local)`);

    if (DB_ENDPOINT && DB_TOKEN) {
      const escapedData = serialized.replace(/'/g, "\\'");
      await dbQuery(
        `DELETE FROM ${collection}; CREATE ${collection} SET data = '${escapedData}', updated_at = time::now();`
      );
      console.log(`Saved to ${key} (remote)`);
    }

    return true;
  } catch (error) {
    console.log(`Save to ${key} error:`, error);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (fallbackError) {
      console.log(`Fallback save error:`, fallbackError);
      return false;
    }
  }
}

export async function loadFromDb<T>(collection: CollectionKey, fallback: T): Promise<T> {
  const key = COLLECTIONS[collection];
  try {
    if (DB_ENDPOINT && DB_TOKEN) {
      const results = await dbQuery(`SELECT data FROM ${collection} ORDER BY updated_at DESC LIMIT 1;`);
      if (results.length > 0) {
        const record = results[0] as { data?: string };
        if (record.data) {
          const parsed = JSON.parse(record.data) as T;
          await AsyncStorage.setItem(key, JSON.stringify(parsed));
          console.log(`Loaded from ${key} (remote)`);
          return parsed;
        }
      }
    }

    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      console.log(`Loaded from ${key} (local)`);
      return JSON.parse(stored) as T;
    }

    console.log(`No data found for ${key}, using fallback`);
    return fallback;
  } catch (error) {
    console.log(`Load from ${key} error:`, error);
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) return JSON.parse(stored) as T;
    } catch {
      // ignore
    }
    return fallback;
  }
}

export async function deleteFromDb(collection: CollectionKey): Promise<boolean> {
  const key = COLLECTIONS[collection];
  try {
    await AsyncStorage.removeItem(key);
    if (DB_ENDPOINT && DB_TOKEN) {
      await dbQuery(`DELETE FROM ${collection};`);
    }
    console.log(`Deleted ${key}`);
    return true;
  } catch (error) {
    console.log(`Delete ${key} error:`, error);
    return false;
  }
}

export { COLLECTIONS };
