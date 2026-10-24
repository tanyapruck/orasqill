/** Portable, local-only checkpoint filesystem and Git helpers. No provider calls. */
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const TEXT_LIMIT = 4000;

export function options(args, permitted) {
  if (args.length % 2) throw Error('expected --option value pairs');
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    const [key, value] = [args[i], args[i+1]];
    if (!permitted.includes(key) || typeof value !== 'string' || !value.trim() || value.length > TEXT_LIMIT || value.includes('\0')) throw Error(`invalid option or value: ${key}`);
    (parsed[key] ??= []).push(value.trim());
  }
  return parsed;
}
export function one(opts, key, required = true) {
  const values = opts[key];
  if (!values) { if (required) throw Error(`missing ${key}`); return undefined; }
  if (values.length !== 1) throw Error(`${key} must occur exactly once`);
  return values[0];
}
export function git(repo, argv) {
  return execFileSync('git', argv, {cwd:repo, encoding:'utf8', timeout:6000, maxBuffer:1024*1024}).trim();
}
export function gitFacts(repo) {
  const actual=realpathSync.native(git(repo,['rev-parse','--show-toplevel']));
  const expected=realpathSync.native(repo);
  if (process.platform === 'win32' ? actual.toLowerCase() !== expected.toLowerCase() : actual !== expected) throw Error('repository root required');
  return {branch:git(repo,['branch','--show-current']), head:git(repo,['rev-parse','HEAD']), status:git(repo,['status','--short','--untracked-files=normal']).split('\n').filter(Boolean)};
}
export function assertSafeFile(file, required = false) {
  try {
    const info=lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink()) throw Error(`unsafe state file: ${file}`);
    return true;
  } catch(e) {
    if(e.code === 'ENOENT' && !required) return false;
    throw e;
  }
}
export function taskDir(repo,id,create=false) {
  if (!ID.test(id ?? '')) throw Error('invalid task ID');
  const base=path.join(repo,'.agent-workflow');
  const root=path.join(base,'state');
  const dir=path.join(root,id);
  for(const p of [base,root,dir]) {
    try {
      const info=lstatSync(p);
      if (info.isSymbolicLink() || !info.isDirectory()) throw Error(`unsafe state path: ${p}`);
    } catch(e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  if (create) mkdirSync(dir,{recursive:true,mode:0o700});
  return dir;
}
export function readJSON(file) { assertSafeFile(file,true); return JSON.parse(readFileSync(file,'utf8')); }
export function atomic(file,data) {
  assertSafeFile(file);
  const tmp=`${file}.${process.pid}.tmp`;
  if (existsSync(tmp)) throw Error('concurrent checkpoint write detected');
  try { writeFileSync(tmp,data,{flag:'wx',mode:0o600}); renameSync(tmp,file); }
  finally { if (existsSync(tmp)) unlinkSync(tmp); }
}
export const saveJSON=(file,value)=>atomic(file,JSON.stringify(value,null,2)+'\n');
export const clean=(value)=>String(value??'').replaceAll('\r',' ').replaceAll('\n',' ').replaceAll('`','\\`');
export const bullets=(items, format=x=>`- ${clean(x)}`)=>items.length?items.map(format).join('\n'):'- None';
