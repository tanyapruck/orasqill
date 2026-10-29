/** Token-efficient repository locator: paths and symbol hints, never source snippets or runtime authority. */
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,lstatSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const SKIP_DIR=new Set(['.git','.agent-workflow','.next','.nuxt','.venv','venv','node_modules','vendor','dist','build','out','coverage','target','__pycache__','.pytest_cache','.turbo','.cache','.idea','.vscode']);
const EXT=new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.py','.go','.rs','.java','.cs','.php','.rb','.vue','.svelte','.sql','.json','.yaml','.yml','.toml','.md','.css','.scss','.html']);
const MAX_FILES=6000, MAX_TOTAL_BYTES=80*1024*1024, MAX_FILE_BYTES=1024*1024;
const SECRET=/(^\.env($|\.)|secret|credential|private.?key|(^|[._-])token([._-]|$)|\.pem$|\.p12$|\.pfx$|\.key$|\.sqlite$|\.db$|\.min\.[cm]?js$|(^|[._-])lock\.(json|yaml|yml)$)/i;
const sha=s=>createHash('sha256').update(s).digest('hex');
const cleanPath=p=>p.replaceAll(path.sep,'/');
const isSafeStat=(p,folder)=>{const s=lstatSync(p);return !s.isSymbolicLink()&&(folder?s.isDirectory():s.isFile());};
const language=ext=>({'.ts':'TypeScript','.tsx':'TSX','.js':'JavaScript','.jsx':'JSX','.mjs':'JavaScript','.cjs':'JavaScript','.py':'Python','.go':'Go','.rs':'Rust','.java':'Java','.cs':'C#','.php':'PHP','.rb':'Ruby','.vue':'Vue','.svelte':'Svelte','.sql':'SQL','.md':'Markdown'}[ext]??ext.slice(1));

function symbolsOf(source,ext){
  if(!['.js','.jsx','.ts','.tsx','.mjs','.cjs','.py','.go','.rs','.java','.cs','.php','.rb','.vue','.svelte'].includes(ext))return [];
  const rx=ext==='.py'
    ? /^\s*(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)\b/
    : ext==='.go'
    ? /^\s*(?:func(?:\s+\([^)]*\))?|type)\s+([A-Za-z_]\w*)\b/
    : ext==='.rs'
    ? /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:fn|struct|enum|trait|impl)\s+([A-Za-z_]\w*)\b/
    : /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)\b/;
  const result=[];
  for(const [i,line] of source.split(/\r?\n/).entries()){
    const match=line.match(rx);
    if(match && result.length<80)result.push({name:match[1],line:i+1});
  }
  return result;
}

const skippedDir=name=>SKIP_DIR.has(name)||name.startsWith('.');

/** Directory walk used outside Git (or when Git is unavailable): every non-hidden, non-vendor file. */
function walkCandidates(root){
  const out=[],stack=[''];
  while(stack.length){
    const dir=stack.pop(),absolute=path.join(root,dir);
    if(!isSafeStat(absolute,true))continue;
    for(const entry of readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).reverse()){
      const relative=cleanPath(path.join(dir,entry.name));
      if(entry.isSymbolicLink())continue;
      if(entry.isDirectory()){if(!skippedDir(entry.name))stack.push(relative);continue;}
      out.push({relative,regular:entry.isFile()});
    }
  }
  return out;
}

/** In a Git work tree, index tracked files plus untracked, non-ignored files that sit beside tracked ones.
 * Ignored paths, nested repositories/worktrees and untracked-only trees (build outputs, stores) are never walked.
 * Returns null when root is not the top of a Git work tree, so callers fall back to the directory walk. */
function gitCandidates(root){
  const run=args=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','ignore'],maxBuffer:256*1024*1024});
  let top,tracked,untracked;
  try{
    top=run(['rev-parse','--show-toplevel']).trim();
    if(path.resolve(realpathSync.native(top))!==path.resolve(realpathSync.native(root)))return null;
    tracked=run(['ls-files','-z','--cached']).split('\0').filter(Boolean);
    untracked=run(['ls-files','-z','--others','--exclude-standard']).split('\0').filter(Boolean);
  }catch{return null;}
  const trackedDirs=new Set(tracked.map(p=>path.posix.dirname(p)));
  const chosen=[...new Set([...tracked,...untracked.filter(p=>!p.endsWith('/')&&trackedDirs.has(path.posix.dirname(p)))])];
  return chosen.filter(p=>!p.split('/').slice(0,-1).some(skippedDir)).sort((a,b)=>a.localeCompare(b))
    .map(relative=>({relative,regular:true}));
}

export function scanWorkspace(root,{maxFiles=MAX_FILES,maxTotalBytes=MAX_TOTAL_BYTES}={}){
  const files=[],skipped={large:0,excluded:0},folderCounts=new Map();
  let consumed=0,partial=false;
  const git=gitCandidates(root);
  for(const {relative,regular} of git??walkCandidates(root)){
    const name=path.posix.basename(relative),full=path.join(root,relative);
    if(!regular||SECRET.test(name)){skipped.excluded++;continue;}
    const ext=path.extname(name).toLowerCase();
    if(!EXT.has(ext))continue;
    let stat;
    try{stat=lstatSync(full);}catch{continue;} // tracked but deleted in the work tree
    if(!stat.isFile()||stat.isSymbolicLink())continue;
    if(stat.size>MAX_FILE_BYTES){skipped.large++;continue;}
    if(files.length>=maxFiles||consumed+stat.size>maxTotalBytes){partial=true;break;}
    const content=readFileSync(full);
    if(content.includes(0))continue; // binary content, no OCR or guessing
    consumed+=content.length;
    const source=content.toString('utf8');
    const record={path:relative,language:language(ext),bytes:content.length,lines:source.split(/\r?\n/).length,sha256:sha(content),symbols:symbolsOf(source,ext)};
    files.push(record);
    const group=relative.includes('/')?relative.split('/').slice(0,2).join('/'):'.';
    folderCounts.set(group,(folderCounts.get(group)??0)+1);
  }
  files.sort((a,b)=>a.path.localeCompare(b.path));
  return {version:1,kind:'codebase-locator',notice:'Hints only; validate live source, imports, callers and tests before editing. No snippets or secrets stored.',limits:{maxFiles,maxTotalBytes},partial,skipped,features:[...folderCounts].sort((a,b)=>a[0].localeCompare(b[0])).map(([folder,count])=>({folder,count})),files};
}
export function compareIndex(old,fresh){
  if(!old||old.version!==1||!Array.isArray(old.files))throw Error('INDEX_INVALID: run oranit init');
  const original=new Map(old.files.map(x=>[x.path,x.sha256]));
  const current=new Map(fresh.files.map(x=>[x.path,x.sha256]));
  const added=[...current.keys()].filter(p=>!original.has(p));
  const removed=[...original.keys()].filter(p=>!current.has(p));
  const changed=[...current].filter(([p,h])=>original.has(p)&&original.get(p)!==h).map(([p])=>p);
  const stale=!!(added.length||removed.length||changed.length||old.partial||fresh.partial);
  return {stale,added,removed,changed,partial:fresh.partial};
}
export function locate(index,query,{limit=12}={}){
  if(!index||!Array.isArray(index.files))throw Error('INDEX_INVALID');
  if(typeof query!=='string'||!query.trim()||query.length>120)throw Error('QUERY_REQUIRED: enter 1-120 characters');
  const terms=query.trim().toLowerCase().split(/\s+/);
  return index.files.map(f=>{
    const base=f.path.toLowerCase(),symbols=f.symbols??[];
    let score=0;
    for(const term of terms){
      const best=base.includes(term)?(base.split('/').at(-1).includes(term)?6:3):0;
      const symbolMatch=symbols.some(x=>x.name.toLowerCase().includes(term));
      if(best===0&&!symbolMatch)return null;
      score+=best+(symbolMatch?9:0);
    }
    return {...f,score,matchedSymbols:symbols.filter(s=>terms.some(t=>s.name.toLowerCase().includes(t))).slice(0,12)};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path)).slice(0,limit)
    .map(({path,language,lines,matchedSymbols,score})=>({path,language,lines,matchedSymbols,score}));
}
