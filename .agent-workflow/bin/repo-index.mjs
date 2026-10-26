/** Token-efficient repository locator: paths and symbol hints, never source snippets or runtime authority. */
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,lstatSync} from 'node:fs';
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

export function scanWorkspace(root,{maxFiles=MAX_FILES,maxTotalBytes=MAX_TOTAL_BYTES}={}){
  const files=[],skipped={large:0,excluded:0},folderCounts=new Map(),stack=[''];
  let consumed=0,partial=false;
  while(stack.length){
    const dir=stack.pop(),absolute=path.join(root,dir);
    if(!isSafeStat(absolute,true))continue;
    for(const entry of readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).reverse()){
      if(partial)break;
      const relative=cleanPath(path.join(dir,entry.name)),full=path.join(absolute,entry.name);
      if(entry.isSymbolicLink())continue;
      if(entry.isDirectory()){
        if(SKIP_DIR.has(entry.name)||entry.name.startsWith('.'))continue;
        stack.push(relative);continue;
      }
      if(!entry.isFile()||SECRET.test(entry.name)) {skipped.excluded++;continue;}
      const ext=path.extname(entry.name).toLowerCase();
      if(!EXT.has(ext))continue;
      const stat=lstatSync(full);
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
