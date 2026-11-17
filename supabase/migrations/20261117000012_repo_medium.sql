-- Repo joins Video, Article and Podcast as a medium: a link to a code
-- repository (GitHub and the like). Data only; nothing about the tables
-- changes.
insert into public.tags (name, type, status)
values ('Repo', 'medium', 'approved')
on conflict ((lower(name))) do update set type = 'medium', status = 'approved';
