import { writeFile } from 'node:fs/promises';
const commit = await fetch('https://api.github.com/repos/devicons/devicon/commits/master').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
const base = `https://raw.githubusercontent.com/devicons/devicon/${commit.sha}`;
const get = async path => { const r=await fetch(`${base}/${path}`); if(!r.ok) throw new Error(`${path}: ${r.status}`); return r.text(); };
const meta = JSON.parse(await get('devicon.json'));
const groups = {
 'Containers & Kubernetes': ['docker','kubernetes','helm','argocd','podman','rancher'],
 'CI/CD & Infrastructure': ['git','gitlab','githubactions','jenkins','terraform','ansible','vagrant','prometheus','grafana','elasticsearch','logstash','kibana','nginx','apache','vault'],
 'Databases & Messaging': ['postgresql','mysql','mongodb','sqlite','redis','rabbitmq','apachekafka','cassandra','neo4j'],
 'Languages & Frameworks': ['python','go','rust','java','javascript','typescript','nodejs','react','nextjs','vuejs','angular','spring','fastapi','django','dotnet'],
 'Developer Tools': ['linux','ubuntu','bash','vscode','npm','pnpm','yarn','maven','gradle','pytest','jest','playwright','postman','swagger','grpc']
};
const labels={docker:'Docker',kubernetes:'Kubernetes (K8s)',helm:'Helm',argocd:'Argo CD',githubactions:'GitHub Actions',apachekafka:'Apache Kafka',postgresql:'PostgreSQL',mysql:'MySQL',mongodb:'MongoDB',nodejs:'Node.js',nextjs:'Next.js',vuejs:'Vue.js',dotnet:'.NET',vscode:'VS Code',grpc:'gRPC'};
const entries=[];
for(const [category,names] of Object.entries(groups)) for(const name of names) {
 const item=meta.find(x=>x.name===name); if(!item) { console.log('Unavailable:',name); continue; }
 const versions=item.versions.svg; const variant=['original','plain','original-wordmark','plain-wordmark'].find(v=>versions.includes(v))??versions[0];
 entries.push({id:`dev-${name}`,label:labels[name]??name.charAt(0).toUpperCase()+name.slice(1),category,color:item.color??'#516176',name,variant});
}
for(let i=0;i<entries.length;i+=6) await Promise.all(entries.slice(i,i+6).map(async entry=>{
 const svg=await get(`icons/${entry.name}/${entry.name}-${entry.variant}.svg`);
 if(!svg.includes('<svg') || /<script|<foreignObject|\bonload\s*=/i.test(svg)) throw new Error('Invalid SVG '+entry.name);
 await writeFile(`public/icons/${entry.id}.svg`,svg);
}));
await writeFile('public/icons/DEVICON-LICENSE.txt',await get('LICENSE'));
await writeFile('lib/dev-icon-catalog.json',JSON.stringify(entries.map(({name: _name,variant: _variant,...entry})=>entry),null,2)+'\n');
await writeFile('public/icons/DEVICON-SOURCES.json',JSON.stringify({repository:'https://github.com/devicons/devicon',commit:commit.sha,icons:entries.map(e=>({id:e.id,source:`${base}/icons/${e.name}/${e.name}-${e.variant}.svg`}))},null,2)+'\n');
console.log(`Bundled ${entries.length} development logos at ${commit.sha}`);
