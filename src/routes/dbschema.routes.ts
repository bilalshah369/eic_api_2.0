import { Router } from 'express';
import {
  getDbInfo,
  getSchemas,
  getTables,
  getColumns,
  getIndexes,
  getConstraints,
  getTypes,
  getFunctions,
  getSequences,
  getViewDefinition,
  getTableScript,
  addColumn,
  renameColumn,
} from '../controllers/dbschema.controller';

const router = Router();

router.get('/info',                                       getDbInfo);
router.get('/schemas',                                    getSchemas);
router.get('/schema/:schema/tables',                      getTables);
router.get('/schema/:schema/table/:table/columns',        getColumns);
router.get('/schema/:schema/table/:table/indexes',        getIndexes);
router.get('/schema/:schema/table/:table/constraints',    getConstraints);
router.get('/schema/:schema/table/:table/script',         getTableScript);
router.get('/schema/:schema/view/:view/definition',       getViewDefinition);
router.get('/schema/:schema/types',                       getTypes);
router.get('/schema/:schema/functions',                   getFunctions);
router.get('/schema/:schema/sequences',                   getSequences);
router.post('/schema/:schema/table/:table/add-column',    addColumn);
router.post('/schema/:schema/table/:table/rename-column', renameColumn);

export default router;
