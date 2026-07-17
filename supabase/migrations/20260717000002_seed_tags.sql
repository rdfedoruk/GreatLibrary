-- Seed the controlled tag vocabulary (docs/data-model.md, Tagging Taxonomy).
-- Starter set only — new tags are a deliberate admin add via the dashboard.

insert into public.tags (dimension, name) values
  -- Medium (strictly format, exactly three values)
  ('medium', 'Video'),
  ('medium', 'Article'),
  ('medium', 'Podcast'),
  -- Module / Product Area — Core IT
  ('module', 'ITSM'),
  ('module', 'ITOM'),
  ('module', 'ITBM/SPM'),
  ('module', 'ITAM'),
  ('module', 'CMDB/Discovery'),
  ('module', 'DevOps'),
  -- Platform / Dev
  ('module', 'App Engine'),
  ('module', 'Flow Designer'),
  ('module', 'Flow Action'),
  ('module', 'IntegrationHub'),
  ('module', 'Now Assist/Agentic AI'),
  ('module', 'Virtual Agent'),
  ('module', 'Performance Analytics/Reporting'),
  ('module', 'Platform Administration'),
  ('module', 'Scripting/Server-side'),
  ('module', 'UI Builder/UI Policies/Client Scripts'),
  -- Business Lines
  ('module', 'CSM'),
  ('module', 'HRSD'),
  ('module', 'SecOps'),
  ('module', 'GRC'),
  ('module', 'FSM'),
  ('module', 'Source-to-Pay/Procurement'),
  -- Cross-cutting
  ('module', 'Integrations'),
  ('module', 'Upgrades/Release Management'),
  ('module', 'Instance Architecture/Best Practices'),
  ('module', 'Career/Certification/Industry Commentary');
