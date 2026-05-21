import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

const safeIdent = (s: string) => /^[a-zA-Z_][a-zA-Z0-9_$]*$/.test(s);
const qi = (s: string) => `"${s}"`;

const ALLOWED_TYPES = new Set([
  'bigint', 'bigserial', 'boolean', 'bytea', 'text', 'integer', 'int',
  'smallint', 'serial', 'real', 'numeric', 'decimal', 'double precision',
  'date', 'timestamp', 'timestamptz', 'timestamp with time zone',
  'timestamp without time zone', 'json', 'jsonb', 'uuid', 'bytea',
  'inet', 'cidr', 'macaddr', 'char', 'varchar', 'character varying', 'character',
]);

const isValidDataType = (t: string) => {
  const base = t.toLowerCase().replace(/\s*\(.*\)/, '').trim();
  return ALLOWED_TYPES.has(base);
};

const fail = (res: Response, msg: string, code = 400) =>
  res.status(code).json({ success: false, message: msg });

// ─── DB Info ──────────────────────────────────────────────────────────────────

export async function getDbInfo(_req: Request, res: Response) {
  try {
    const [row] = await prisma.$queryRaw<any[]>`
      SELECT
        current_database() AS name,
        version()           AS version,
        pg_size_pretty(pg_database_size(current_database())) AS size,
        current_user        AS db_user,
        current_schema()    AS current_schema
    `;
    res.json({ success: true, data: row });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export async function getSchemas(_req: Request, res: Response) {
  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT
        s.schema_name,
        (SELECT COUNT(*)::int FROM information_schema.tables
         WHERE table_schema = s.schema_name AND table_type = 'BASE TABLE') AS table_count,
        (SELECT COUNT(*)::int FROM information_schema.views
         WHERE table_schema = s.schema_name) AS view_count,
        (SELECT COUNT(*)::int FROM information_schema.routines
         WHERE routine_schema = s.schema_name) AS function_count,
        (SELECT COUNT(*)::int FROM information_schema.sequences
         WHERE sequence_schema = s.schema_name) AS sequence_count,
        (SELECT COUNT(*)::int
         FROM pg_type t2
         JOIN pg_namespace n2 ON n2.oid = t2.typnamespace
         WHERE n2.nspname = s.schema_name AND t2.typtype IN ('e','c','d')) AS type_count
      FROM information_schema.schemata s
      WHERE s.schema_name NOT IN ('pg_catalog','information_schema')
        AND s.schema_name NOT LIKE 'pg_%'
      ORDER BY s.schema_name
    `;
    res.json({ success: true, data: rows });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Tables (BASE TABLE + VIEW) ───────────────────────────────────────────────

export async function getTables(req: Request, res: Response) {
  const { schema } = req.params;
  if (!safeIdent(schema)) fail(res, 'Invalid schema name'); return;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        t.table_name,
        t.table_type,
        (SELECT COUNT(*)::int FROM information_schema.columns c
         WHERE c.table_schema = '${schema}' AND c.table_name = t.table_name) AS column_count
      FROM information_schema.tables t
      WHERE t.table_schema = '${schema}'
      ORDER BY t.table_type DESC, t.table_name
    `);
    res.json({ success: true, data: rows });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Columns ──────────────────────────────────────────────────────────────────

export async function getColumns(req: Request, res: Response) {
  const { schema, table } = req.params;
  if (!safeIdent(schema) || !safeIdent(table)) fail(res, 'Invalid identifier'); return;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        c.ordinal_position,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
         AND tc.table_schema    = ku.table_schema
         AND tc.table_name      = ku.table_name
        WHERE tc.table_schema    = '${schema}'
          AND tc.table_name      = '${table}'
          AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_schema = '${schema}' AND c.table_name = '${table}'
      ORDER BY c.ordinal_position
    `);
    res.json({ success: true, data: rows });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Indexes ──────────────────────────────────────────────────────────────────

export async function getIndexes(req: Request, res: Response) {
  const { schema, table } = req.params;
  if (!safeIdent(schema) || !safeIdent(table)) fail(res, 'Invalid identifier'); return;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        pi.indexname,
        pi.indexdef,
        ix.indisprimary AS is_primary,
        ix.indisunique  AS is_unique
      FROM pg_indexes pi
      JOIN pg_class c   ON c.relname = pi.tablename
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = '${schema}'
      JOIN pg_index ix  ON ix.indrelid = c.oid
      JOIN pg_class ic  ON ic.oid = ix.indexrelid AND ic.relname = pi.indexname
      WHERE pi.schemaname = '${schema}' AND pi.tablename = '${table}'
      ORDER BY ix.indisprimary DESC, pi.indexname
    `);
    res.json({ success: true, data: rows });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Constraints ──────────────────────────────────────────────────────────────

export async function getConstraints(req: Request, res: Response) {
  const { schema, table } = req.params;
  if (!safeIdent(schema) || !safeIdent(table)) fail(res, 'Invalid identifier'); return;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        ARRAY_AGG(ku.column_name ORDER BY ku.ordinal_position)::text[] AS columns,
        ccu.table_schema  AS fk_schema,
        ccu.table_name    AS fk_table,
        ccu.column_name   AS fk_column,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
       AND tc.table_schema    = ku.table_schema
       AND tc.table_name      = ku.table_name
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name  = rc.constraint_name
       AND tc.table_schema     = rc.constraint_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name   = ccu.constraint_name
       AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE tc.table_schema = '${schema}' AND tc.table_name = '${table}'
      GROUP BY tc.constraint_name, tc.constraint_type,
               ccu.table_schema, ccu.table_name, ccu.column_name,
               rc.update_rule, rc.delete_rule
      ORDER BY tc.constraint_type, tc.constraint_name
    `);
    res.json({ success: true, data: rows });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Types / Enums ────────────────────────────────────────────────────────────

export async function getTypes(req: Request, res: Response) {
  const { schema } = req.params;
  if (!safeIdent(schema)) fail(res, 'Invalid schema name'); return;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        t.typname AS type_name,
        CASE t.typtype
          WHEN 'e' THEN 'enum'
          WHEN 'c' THEN 'composite'
          WHEN 'd' THEN 'domain'
          ELSE 'other'
        END AS kind,
        ARRAY(
          SELECT e.enumlabel::text
          FROM pg_enum e
          WHERE e.enumtypid = t.oid
          ORDER BY e.enumsortorder
        )::text[] AS enum_values
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = '${schema}'
        AND t.typtype IN ('e','c','d')
      ORDER BY t.typtype, t.typname
    `);
    res.json({ success: true, data: rows });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Functions ────────────────────────────────────────────────────────────────

export async function getFunctions(req: Request, res: Response) {
  const { schema } = req.params;
  if (!safeIdent(schema)) fail(res, 'Invalid schema name'); return;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        routine_name,
        routine_type,
        data_type         AS return_type,
        routine_definition,
        external_language AS language
      FROM information_schema.routines
      WHERE routine_schema = '${schema}'
      ORDER BY routine_type, routine_name
    `);
    res.json({ success: true, data: rows });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Sequences ────────────────────────────────────────────────────────────────

export async function getSequences(req: Request, res: Response) {
  const { schema } = req.params;
  if (!safeIdent(schema)) fail(res, 'Invalid schema name'); return;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        sequence_name,
        data_type,
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
      FROM information_schema.sequences
      WHERE sequence_schema = '${schema}'
      ORDER BY sequence_name
    `);
    res.json({ success: true, data: rows });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── View Definition ──────────────────────────────────────────────────────────

export async function getViewDefinition(req: Request, res: Response) {
  const { schema, view } = req.params;
  if (!safeIdent(schema) || !safeIdent(view)) fail(res, 'Invalid identifier'); return;
  try {
    const [row] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = '${schema}' AND table_name = '${view}'
    `);
    res.json({ success: true, data: row || null });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── Table Script (CREATE TABLE DDL) ─────────────────────────────────────────

export async function getTableScript(req: Request, res: Response) {
  const { schema, table } = req.params;
  if (!safeIdent(schema) || !safeIdent(table)) fail(res, 'Invalid identifier'); return;
  try {
    const columns = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default,
             character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = '${schema}' AND table_name = '${table}'
      ORDER BY ordinal_position
    `);
    const constraints = await prisma.$queryRawUnsafe<any[]>(`
      SELECT tc.constraint_name, tc.constraint_type,
             ARRAY_AGG(ku.column_name ORDER BY ku.ordinal_position)::text[] AS columns,
             ccu.table_schema AS fk_schema, ccu.table_name AS fk_table, ccu.column_name AS fk_col,
             rc.update_rule, rc.delete_rule
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name AND tc.table_schema = ku.table_schema AND tc.table_name = ku.table_name
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE tc.table_schema = '${schema}' AND tc.table_name = '${table}'
      GROUP BY tc.constraint_name, tc.constraint_type,
               ccu.table_schema, ccu.table_name, ccu.column_name, rc.update_rule, rc.delete_rule
    `);
    const nonPkIndexes = await prisma.$queryRawUnsafe<any[]>(`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = '${schema}' AND tablename = '${table}'
        AND indexname NOT IN (
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_schema = '${schema}' AND table_name = '${table}'
        )
    `);

    const fmtType = (col: any): string => {
      if (col.data_type === 'character varying')
        return col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'TEXT';
      if (col.data_type === 'character')
        return col.character_maximum_length ? `CHAR(${col.character_maximum_length})` : 'CHAR';
      if (col.data_type === 'numeric' && col.numeric_precision)
        return `NUMERIC(${col.numeric_precision}${col.numeric_scale ? `,${col.numeric_scale}` : ''})`;
      if (col.data_type === 'USER-DEFINED') return col.udt_name.toUpperCase();
      if (col.data_type === 'ARRAY') return `${col.udt_name.replace(/^_/, '').toUpperCase()}[]`;
      return col.data_type.toUpperCase();
    };

    const colLines = columns.map(c => {
      let line = `  ${qi(c.column_name)} ${fmtType(c)}`;
      if (c.is_nullable === 'NO') line += ' NOT NULL';
      if (c.column_default)       line += ` DEFAULT ${c.column_default}`;
      return line;
    });

    const conLines: string[] = [];
    for (const con of constraints) {
      const cols = (con.columns as string[]).map(c => qi(c)).join(', ');
      if (con.constraint_type === 'PRIMARY KEY') {
        conLines.push(`  CONSTRAINT ${qi(con.constraint_name)} PRIMARY KEY (${cols})`);
      } else if (con.constraint_type === 'UNIQUE') {
        conLines.push(`  CONSTRAINT ${qi(con.constraint_name)} UNIQUE (${cols})`);
      } else if (con.constraint_type === 'FOREIGN KEY' && con.fk_table) {
        conLines.push(
          `  CONSTRAINT ${qi(con.constraint_name)} FOREIGN KEY (${cols})` +
          ` REFERENCES ${qi(con.fk_schema)}.${qi(con.fk_table)}(${qi(con.fk_col)})` +
          ` ON UPDATE ${con.update_rule} ON DELETE ${con.delete_rule}`,
        );
      }
    }

    let script =
      `-- Table: ${schema}.${table}\n` +
      `-- Generated: ${new Date().toISOString()}\n\n` +
      `CREATE TABLE ${qi(schema)}.${qi(table)} (\n` +
      [...colLines, ...conLines].join(',\n') +
      `\n);\n`;

    if (nonPkIndexes.length > 0) {
      script += `\n-- Indexes\n` + nonPkIndexes.map(i => `${i.indexdef};`).join('\n') + '\n';
    }

    res.json({ success: true, data: { script } });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── DDL: Add Column ──────────────────────────────────────────────────────────

export async function addColumn(req: Request, res: Response) {
  const { schema, table } = req.params;
  const { columnName, dataType, nullable = true, defaultValue } = req.body;

  if (!safeIdent(schema) || !safeIdent(table) || !safeIdent(columnName)) { fail(res, 'Invalid identifier'); return; }
  if (!isValidDataType(String(dataType))) { fail(res, `Invalid data type: ${dataType}`); return; }

  try {
    let sql = `ALTER TABLE ${qi(schema)}.${qi(table)} ADD COLUMN ${qi(columnName)} ${dataType}`;
    if (!nullable) sql += ' NOT NULL';
    if (defaultValue !== undefined && defaultValue !== '')
      sql += ` DEFAULT '${String(defaultValue).replace(/'/g, "''")}'`;

    await prisma.$executeRawUnsafe(sql);
    res.json({ success: true, message: `Column "${columnName}" added successfully` });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}

// ─── DDL: Rename Column ───────────────────────────────────────────────────────

export async function renameColumn(req: Request, res: Response) {
  const { schema, table } = req.params;
  const { oldName, newName } = req.body;

  if (!safeIdent(schema) || !safeIdent(table) || !safeIdent(oldName) || !safeIdent(newName)) { fail(res, 'Invalid identifier'); return; }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${qi(schema)}.${qi(table)} RENAME COLUMN ${qi(oldName)} TO ${qi(newName)}`,
    );
    res.json({ success: true, message: `Column renamed from "${oldName}" to "${newName}"` });
  } catch (e: any) {
    fail(res, e.message, 500);
  }
}
