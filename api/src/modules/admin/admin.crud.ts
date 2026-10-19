import { Router } from 'express';
import { z, type ZodType } from 'zod';
import { asyncHandler } from '../../lib/http';
import { validate } from '../../middleware/validate';

export const idParams = z.object({ id: z.coerce.number().int().positive() });

interface CrudConfig<S extends ZodType> {
  schema: S;
  list: () => Promise<unknown[]>;
  create: (data: z.infer<S>) => Promise<unknown>;
  update: (id: number, data: z.infer<S>) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
}

export const crudRouter = <S extends ZodType>({ schema, list, create, update, remove }: CrudConfig<S>): Router => {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json({ data: await list() });
    })
  );

  router.post(
    '/',
    validate('body', schema),
    asyncHandler(async (req, res) => {
      res.status(201).json({ data: await create(req.body) });
    })
  );

  router.put(
    '/:id',
    validate('params', idParams),
    validate('body', schema),
    asyncHandler(async (req, res) => {
      res.json({ data: await update(Number(req.params.id), req.body) });
    })
  );

  router.delete(
    '/:id',
    validate('params', idParams),
    asyncHandler(async (req, res) => {
      await remove(Number(req.params.id));
      res.status(204).end();
    })
  );

  return router;
};
