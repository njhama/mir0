/* Official SVG assets are bundled locally; no optimization server is needed. */
/* oxlint-disable next/no-img-element */
import { Square, Diamond, Circle, FileText, Workflow, Merge, Split, Timer, CircleCheck, CircleX, Router, Wifi, Cable, Cloud, BrickWall, ShieldCheck, LockKeyhole, KeyRound, Fingerprint, BadgeCheck, Table2, HardDrive, Folder, Search, ChartColumn, Waves, Users, Building2, Monitor, Laptop, Smartphone, Radio, Mail, Bell, MessagesSquare, CreditCard, Bot, Code2, Terminal, Package, FlaskConical, Rocket, Archive, Server, FunctionSquare, Database, ListOrdered, Globe, Network, Zap, Container, PanelsTopLeft, User, GitFork } from 'lucide-react';
import { iconCatalog } from '@/lib/icon-catalog';
const symbols = { Globe, Square, Diamond, Circle, FileText, Workflow, Merge, Split, Timer, CircleCheck, CircleX, Router, Wifi, Cable, Cloud, BrickWall, ShieldCheck, LockKeyhole, KeyRound, Fingerprint, BadgeCheck, Table2, HardDrive, Folder, Search, ChartColumn, Waves, Users, Building2, Monitor, Laptop, Smartphone, Radio, Mail, Bell, MessagesSquare, CreditCard, Bot, Code2, Terminal, Package, FlaskConical, Rocket,  bucket: Archive, server: Server, function: FunctionSquare, database: Database, queue: ListOrdered, globe: Globe, network: Network, cache: Zap, container: Container, browser: PanelsTopLeft, user: User, git: GitFork };
export function DiagramIcon({ id, label }: { id: string; label?: string }) {
  const item = iconCatalog.find(icon => icon.id === id);
  if (!item) return null;
  const Icon = symbols[item.symbol];
  const official = id.startsWith('aws-') || ['s3', 'ec2', 'lambda', 'rds', 'dynamodb', 'sqs', 'cloudfront', 'api-gateway', 'github', 'cache'].includes(id);
  return <span className="diagram-icon"><span className={official ? "diagram-icon-symbol official-logo" : "diagram-icon-symbol"} style={{ background: official ? "transparent" : item.color }}>{official ? <img src={"/icons/" + id + ".svg"} alt="" draggable={false} /> : <Icon size={36} strokeWidth={1.7} />}</span><span className="diagram-icon-label">{label ?? item.label}</span></span>;
}





