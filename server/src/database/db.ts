import fs from 'fs';
import path from 'path';
import { config } from '../config';

/**
 * 纯 JavaScript JSON 文件数据库
 * 无需原生编译，跨平台兼容
 * 提供类 SQL 的查询接口，方便后续迁移到真实数据库
 */

interface DbSchema {
  roles: any[];
  permissions: any[];
  role_permissions: any[];
  users: any[];
  vessel_drawings: any[];
  counters: Record<string, number>;
}

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbFile = config.dbPath.replace(/\.db$/, '.json');

// 初始化空数据库
const emptyDb: DbSchema = {
  roles: [],
  permissions: [],
  role_permissions: [],
  users: [],
  vessel_drawings: [],
  counters: {},
};

// 加载或创建数据库文件
function loadDb(): DbSchema {
  if (fs.existsSync(dbFile)) {
    const raw = fs.readFileSync(dbFile, 'utf-8');
    return JSON.parse(raw);
  }
  fs.writeFileSync(dbFile, JSON.stringify(emptyDb, null, 2), 'utf-8');
  return { ...emptyDb };
}

let data: DbSchema = loadDb();

// 持久化到文件
function persist() {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
}

// 生成自增ID
function nextId(table: string): number {
  if (!data.counters[table]) {
    data.counters[table] = 1;
  }
  return data.counters[table]++;
}

/**
 * 简易查询构建器 - 模拟 SQL 查询接口
 */
class Table<T extends { id: number }> {
  constructor(private tableName: keyof DbSchema) {}

  private get rows(): T[] {
    return (data as any)[this.tableName] as T[];
  }

  all(): T[] {
    return [...this.rows];
  }

  get(predicate: (row: T) => boolean): T | undefined {
    return this.rows.find(predicate);
  }

  find(predicate: (row: T) => boolean): T[] {
    return this.rows.filter(predicate);
  }

  insert(row: Omit<T, 'id'>): T {
    const newRow = { ...row, id: nextId(this.tableName) } as T;
    this.rows.push(newRow);
    persist();
    return newRow;
  }

  update(predicate: (row: T) => boolean, updates: Partial<T>): number {
    let count = 0;
    for (let i = 0; i < this.rows.length; i++) {
      if (predicate(this.rows[i])) {
        this.rows[i] = { ...this.rows[i], ...updates };
        count++;
      }
    }
    if (count > 0) persist();
    return count;
  }

  delete(predicate: (row: T) => boolean): number {
    const before = this.rows.length;
    const filtered = this.rows.filter((r) => !predicate(r));
    const removed = before - filtered.length;
    (data as any)[this.tableName] = filtered;
    if (removed > 0) persist();
    return removed;
  }

  count(predicate?: (row: T) => boolean): number {
    return predicate ? this.rows.filter(predicate).length : this.rows.length;
  }
}

export const db = {
  roles: new Table<any>('roles'),
  permissions: new Table<any>('permissions'),
  role_permissions: new Table<any>('role_permissions'),
  users: new Table<any>('users'),
  vessel_drawings: new Table<any>('vessel_drawings'),

  // 获取原始数据（用于复杂查询）
  raw: () => data,

  // 持久化
  persist,

  // 重置数据库（仅用于初始化）
  reset() {
    data = { ...emptyDb, counters: {} };
    persist();
  },
};
