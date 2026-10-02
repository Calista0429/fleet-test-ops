# Native PostgreSQL 17 setup

The application requires PostgreSQL 17 and a role that can create/drop schemas for integration tests. Choose a database dedicated to this fictional demo. The Docker alternative is configured in `compose.yaml`; local execution was verified with installed PostgreSQL 17 binaries.

For a new local cluster on macOS, adjust the binary location if needed. These commands create a dedicated data directory inside the project, listen only on loopback, and use the synthetic local password from `.env.example`:

```sh
export FLEET_PG_BIN=/Library/PostgreSQL/17/bin
mkdir -p .local/postgres
printf '%s\n' local_fleet_password > .local/postgres/bootstrap-password
"$FLEET_PG_BIN/initdb" -D "$PWD/.local/postgres/data" \
  --username=fleet --pwfile="$PWD/.local/postgres/bootstrap-password" \
  --auth-host=scram-sha-256 --auth-local=trust
rm .local/postgres/bootstrap-password
"$FLEET_PG_BIN/pg_ctl" -D "$PWD/.local/postgres/data" \
  -l "$PWD/.local/postgres/server.log" \
  -o "-h 127.0.0.1 -p 5433 -k $PWD/.local/postgres" start
"$FLEET_PG_BIN/createdb" -h "$PWD/.local/postgres" -p 5433 -U fleet fleet_ops
```

Use a free port; if 5433 is occupied, change both server options and `DATABASE_URL`. The example data directory is for a newly initialized cluster: run initialization once. Later, start an existing cluster with the same `pg_ctl` command and stop it with:

```sh
"$FLEET_PG_BIN/pg_ctl" -D "$PWD/.local/postgres/data" stop
```

Then follow the README's migration/seed/application commands. An existing PostgreSQL installation is also usable: create a dedicated database and set its connection string in `.env`. The role used by tests needs schema creation privileges.

`.local` and `.env` are ignored by Git. Migration and ordinary seeding preserve saved demo edits. `npm run db:reset-demo` deliberately replaces the three demo entity tables and is guarded to the loopback database named `fleet_ops`; it preserves migration history.
