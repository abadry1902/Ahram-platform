import {readFileSync,existsSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
test("required public and staff routes are present",()=>{
 for(const path of ["app/[locale]/page.tsx","app/[locale]/articles/page.tsx","app/[locale]/links/page.tsx","app/login/page.tsx","app/app/page.tsx","app/app/tasks/[id]/page.tsx","app/app/import/page.tsx","app/app/content/page.tsx"]){
  assert.ok(existsSync(new URL(`../${path}`,import.meta.url)),`Missing ${path}`);
 }
});
test("approved statuses and privacy rules are reflected in migrations",()=>{
 const sql=read("supabase/migrations/202610240001_initial.sql");
 assert.match(sql,/awaiting_review/);
 assert.match(sql,/done','expired/);
 assert.match(sql,/public.is_task_member\(id\)/);
 assert.match(sql,/Supervisor approval required/);
 assert.match(read("supabase/migrations/202610240004_personal_status.sql"),/status in \('new','in_progress','paused','completed'\)/);
});
test("env example contains no actual credentials",()=>{
 const env=read(".env.example");
 assert.match(env,/SUPABASE_SERVICE_ROLE_KEY=/);
 assert.doesNotMatch(env,/eyJ[a-zA-Z0-9_-]{100}/);
});
test("package scripts include build and typecheck",()=>{
 const pkg=JSON.parse(read("package.json"));
 assert.ok(pkg.scripts.build&&pkg.scripts.typecheck);
});
