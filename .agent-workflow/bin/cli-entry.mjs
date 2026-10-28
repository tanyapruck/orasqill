/** Recognize direct CLI execution even when npm link or a symlinked folder is used. */
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export function isDirectRun(moduleUrl,argv1=process.argv[1]){
  if(!argv1)return false;
  try{
    return realpathSync.native(argv1)===realpathSync.native(fileURLToPath(moduleUrl));
  }catch{
    return false;
  }
}
