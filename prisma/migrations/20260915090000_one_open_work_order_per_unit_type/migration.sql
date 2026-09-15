-- One open work order of a kind per unit, enforced by the database.
--
-- createWorkOrderAction already refuses a second pending/claimed order of the
-- same type for the same unit (QA 20260913-1742, BUG-004), but it checks with a
-- SELECT inside the transaction that inserts, and under READ COMMITTED two
-- simultaneous submissions can both see nothing and both insert. This index is
-- the backstop the application check cannot be: the second INSERT fails with a
-- unique violation (Prisma P2002), which the action reports the same way it
-- reports the row it did see.
--
-- Partial, so completed and cancelled orders are not part of it — a unit may
-- carry any number of those. Repairs and cleanings are different work and may
-- coexist, which is why `type` is in the key.
--
-- Hand-written: Prisma's schema language cannot express a WHERE clause on an
-- index, so this lives only here. Prisma's introspection ignores partial
-- indexes, so a later `prisma migrate dev` does not try to drop it.
CREATE UNIQUE INDEX "work_orders_one_open_per_unit_type"
  ON "work_orders" ("air_conditioner_id", "type")
  WHERE "status" IN ('pending', 'claimed');
