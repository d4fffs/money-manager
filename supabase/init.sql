create table if not exists allowances (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  total_amount numeric not null default 1550000,
  remaining_amount numeric not null default 1550000,
  created_at timestamptz default now()
);

create table if not exists weekly_limits (
  id uuid primary key default gen_random_uuid(),
  allowance_id uuid references allowances(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  limit_amount numeric not null,
  total_spent numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  allowance_id uuid references allowances(id) on delete cascade,
  weekly_limit_id uuid references weekly_limits(id) on delete set null,
  date date not null,
  description text,
  amount numeric not null,
  created_at timestamptz default now()
);
