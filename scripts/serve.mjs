import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||4173);
const basePath=(process.env.SITE_BASE_PATH||'').replace(/\/$/,'');
const staticRoot=process.env.STATIC_DIRECTORY?path.resolve(root,process.env.STATIC_DIRECTORY):root;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.webp':'image/webp','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
const server=http.createServer(async(req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(basePath){
      if(pathname===basePath){res.writeHead(301,{'Location':basePath+'/'});res.end();return;}
      if(!pathname.startsWith(basePath+'/')){res.writeHead(404);res.end('Not found');return;}
      pathname=pathname.slice(basePath.length);
    }
    let file=path.resolve(staticRoot,'.'+pathname);
    if(file!==staticRoot&&!file.startsWith(staticRoot+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    const contents=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:contents);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log(`BIO-SYNTHETIC local preview: http://localhost:${port}${basePath}/`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
