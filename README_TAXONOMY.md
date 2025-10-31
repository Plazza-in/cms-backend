## Taxonomy APIs (Categories, Use Cases, Sub-categories)

Base URL: `/taxonomy`

### Endpoints

- Categories
  - GET `/categories` → list categories (sorted by `rank` ASC)
  - GET `/categories/:id` → get one
  - POST `/categories` → create
  - PUT `/categories/:id` → update
  - DELETE `/categories/:id` → delete

- Use Cases
  - GET `/use-cases` → list all (sorted by `rank` ASC)
  - GET `/use-cases?l1_id=<categoryId>` → list for a category
  - GET `/use-cases/:id` → get one
  - POST `/use-cases` → create
  - PUT `/use-cases/:id` → update
  - DELETE `/use-cases/:id` → delete

- Sub-categories
  - GET `/sub-categories` → list all (sorted by `rank` ASC)
  - GET `/sub-categories?l2_id=<useCaseId>` → list for a use-case
  - GET `/sub-categories/:id` → get one
  - POST `/sub-categories` → create
  - PUT `/sub-categories/:id` → update
  - DELETE `/sub-categories/:id` → delete

### Request payloads (summary)

- Create/Update Category fields: `code` (text), `title` (text), `subtitle?` (text), `thumbnail_icon?` (json), `bg_img?` (json), `banner?` (json), `top_products?` (text[]), `rank?` (int), `ui_configs?` (json)
- Create/Update UseCase fields: `code` (text), `l1_id` (uuid FK → categories.id), `title` (text), `subtitle?`, `thumbnail_image?` (json), `bg_img?` (json), `product_ids?` (text[]), `es_query?` (json), `ui_configs?` (json), `rank?` (int)
- Create/Update SubCategory fields: `id` (uuid, required on create), `code` (text), `l2_id` (uuid FK → use_cases.id), `title` (text), `subtitle?`, `thumbnail_image?` (json), `bg_img?` (json), `product_ids?` (text[]), `es_query?` (json), `ui_configs?` (json), `rank` (int)

Notes:
- `categories.id` and `use_cases.id` auto-generate (uuid) if omitted on create. `sub_categories.id` must be provided.
- Sorting is by `rank` ASC across all three lists.

### Minimal cURL examples

```bash
# List categories
curl --location 'http://localhost:3001/taxonomy/categories' | jq

# List use-cases for a category (l1_id)
curl --location 'http://localhost:3001/taxonomy/use-cases?l1_id=REPLACE_CATEGORY_UUID' | jq

# List sub-categories for a use-case (l2_id)
curl --location 'http://localhost:3001/taxonomy/sub-categories?l2_id=REPLACE_USE_CASE_UUID' | jq

# Update a category
curl --location --request PUT 'http://localhost:3001/taxonomy/categories/REPLACE_UUID' \
  --header 'Content-Type: application/json' \
  --data '{"title":"New Title","rank":3}' | jq
```

### Table Schemas

```text
Table: public.categories
  id uuid primary key default uuid_generate_v4()
  code text unique not null
  title text not null
  subtitle text null
  thumbnail_icon jsonb null
  bg_img jsonb null
  banner json null
  top_products text[] null  -- max 6 (check)
  rank int not null default 0
  ui_configs jsonb null
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

```text
Table: public.use_cases
  id uuid primary key default uuid_generate_v4()
  code text unique not null
  l1_id uuid not null  -- FK → categories(id)
  title text not null
  subtitle text null
  thumbnail_image jsonb null
  bg_img jsonb null
  product_ids text[] null
  es_query jsonb null
  ui_configs jsonb null
  rank int not null default 0
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

```text
Table: public.sub_categories
  id uuid primary key  -- required (no default)
  code text unique not null
  l2_id uuid not null  -- FK → use_cases(id)
  title text not null
  subtitle text null
  thumbnail_image jsonb null
  bg_img jsonb null
  product_ids text[] null
  es_query jsonb null
  ui_configs jsonb null
  rank int not null
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```


