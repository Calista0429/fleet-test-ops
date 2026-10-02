CREATE TABLE vehicles (
  id uuid PRIMARY KEY,
  license_plate text NOT NULL UNIQUE CHECK (length(trim(license_plate)) > 0),
  model text NOT NULL CHECK (length(trim(model)) > 0),
  status text NOT NULL CHECK (status IN ('available','testing','maintenance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE test_runs (
  id uuid PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_name text NOT NULL CHECK (length(trim(driver_name)) > 0),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  distance_km numeric(10,2) CHECK (distance_km >= 0),
  status text NOT NULL CHECK (status IN ('in_progress','completed','cancelled')),
  CHECK (ended_at IS NULL OR ended_at >= started_at),
  CHECK (status <> 'completed' OR (ended_at IS NOT NULL AND distance_km IS NOT NULL))
);
CREATE TABLE issues (
  id uuid PRIMARY KEY,
  test_run_id uuid NOT NULL REFERENCES test_runs(id) ON DELETE RESTRICT,
  issue_type text NOT NULL CHECK (issue_type IN ('sensor_failure','software_crash','other')),
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 2000),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  status text NOT NULL CHECK (status IN ('open','in_progress','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK ((status = 'resolved') = (resolved_at IS NOT NULL)),
  CHECK (resolved_at IS NULL OR resolved_at >= created_at)
);
CREATE INDEX test_runs_vehicle_started_idx ON test_runs(vehicle_id,started_at);
CREATE INDEX issues_run_idx ON issues(test_run_id);
CREATE INDEX issues_status_severity_idx ON issues(status,severity);
