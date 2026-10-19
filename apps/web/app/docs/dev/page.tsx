import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { PageWrapper } from '@/components/page-wrapper';
import { 
  BookOpen, 
  Code2, 
  Layers, 
  ClipboardList, 
  Wrench, 
  FlaskConical, 
  Rocket, 
  Activity, 
  Smartphone,
  ArrowLeft 
} from 'lucide-react';

interface DocItem {
  id: string;
  file: string;
  title: string;
  description: string;
  content: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
}

// Read markdown files at build/request time
function readDocFile(subPath: string, fallbackTitle: string): { title: string; description: string; content: string } {
  try {
    const filePath = path.join(process.cwd(), 'docs', subPath);
    const raw = fs.readFileSync(filePath, 'utf-8');

    // Parse simple YAML frontmatter if present
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) {
      // If no frontmatter, extract first # heading as title if available
      const firstHeading = raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? fallbackTitle;
      return { title: firstHeading, description: '', content: raw };
    }

    const fm = fmMatch[1];
    const content = fmMatch[2];

    const title = fm.match(/title:\s*(.+)/)?.[1]?.trim() ?? fallbackTitle;
    const description = fm.match(/description:\s*(.+)/)?.[1]?.trim() ?? '';

    return { title, description, content };
  } catch {
    return { title: fallbackTitle, description: '', content: '' };
  }
}

const DOC_CONFIGS = [
  { id: 'mobile-plan',   file: 'mobile-app-plan.md',          fallbackTitle: 'Mobile App Architecture & Plan', icon: Smartphone,   color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 'requirements',  file: 'ai/requirements/README.md',   fallbackTitle: 'Requirements',                  icon: ClipboardList, color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  { id: 'design',        file: 'ai/design/README.md',         fallbackTitle: 'System Design',                 icon: Layers,        color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  { id: 'planning',      file: 'ai/planning/README.md',       fallbackTitle: 'Planning & Milestones',         icon: Wrench,        color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { id: 'implementation',file: 'ai/implementation/README.md', fallbackTitle: 'Implementation Guide',          icon: Code2,         color: 'text-green-400',   bg: 'bg-green-500/10' },
  { id: 'testing',       file: 'ai/testing/README.md',        fallbackTitle: 'Testing Strategy',              icon: FlaskConical,  color: 'text-pink-400',    bg: 'bg-pink-500/10' },
  { id: 'deployment',    file: 'ai/deployment/README.md',     fallbackTitle: 'Deployment & CI/CD',            icon: Rocket,        color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
  { id: 'monitoring',    file: 'ai/monitoring/README.md',     fallbackTitle: 'Monitoring & Health',           icon: Activity,      color: 'text-orange-400',  bg: 'bg-orange-500/10' },
];

function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 text-purple-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="text-white/80">$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-purple-400 underline hover:text-purple-300" target="_blank" rel="noopener noreferrer">$1</a>');
}

// Markdown renderer handling headers, code blocks, tables, checklists, blockquotes, alerts
function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inCode = false;
  let inList = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fence
    if (line.startsWith('```')) {
      if (inCode) {
        out.push('</code></pre>');
        inCode = false;
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        if (inBlockquote) { out.push('</blockquote>'); inBlockquote = false; }
        const lang = line.slice(3).trim();
        const codeClass = lang === 'mermaid' ? 'text-amber-300' : 'text-green-300';
        out.push(`<pre class="bg-black/50 rounded-xl p-4 overflow-x-auto text-xs my-3 border border-white/10"><code class="${codeClass} font-mono leading-relaxed">`);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      out.push(line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '\n');
      continue;
    }

    // Blockquote & GitHub Alerts
    if (line.startsWith('> ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      const bqContent = line.slice(2).trim();
      if (!inBlockquote) {
        out.push('<blockquote class="border-l-4 border-purple-500/70 bg-purple-500/10 px-4 py-2 my-3 rounded-r-xl text-sm text-purple-200">');
        inBlockquote = true;
      }
      out.push(`<p class="leading-relaxed">${inline(bqContent)}</p>`);
      continue;
    } else if (inBlockquote) {
      out.push('</blockquote>');
      inBlockquote = false;
    }

    // Headings
    if (line.startsWith('#### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h4 class="text-sm font-bold text-white/90 mt-5 mb-1">${inline(line.slice(5))}</h4>`);
    } else if (line.startsWith('### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h3 class="text-base font-bold text-white mt-6 mb-2">${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2 class="text-xl font-bold text-white mt-8 mb-3 pb-2 border-b border-white/10">${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h1 class="text-2xl font-bold text-white mt-6 mb-4">${inline(line.slice(2))}</h1>`);
    }
    // Horizontal Rule
    else if (line.trim() === '---' || line.trim() === '***') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr class="border-white/10 my-6" />');
    }
    // Table row
    else if (line.startsWith('|')) {
      if (inList) { out.push('</ul>'); inList = false; }
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isSep = cells.every(c => /^[-: ]+$/.test(c));
      if (isSep) continue;
      const isHeader = i > 0 && lines[i + 1]?.startsWith('|') && lines[i + 1]?.includes('---');
      const tag = isHeader ? 'th' : 'td';
      const cls = isHeader
        ? 'px-3 py-2 text-left text-xs font-bold text-white/70 uppercase tracking-wider bg-white/5 border-b border-white/10'
        : 'px-3 py-2 text-sm text-white/70 border-t border-white/5';
      if (isHeader) {
        out.push(`<div class="overflow-x-auto my-4"><table class="w-full text-left rounded-xl overflow-hidden border border-white/10 bg-white/[0.02]"><thead><tr>${cells.map(c => `<${tag} class="${cls}">${inline(c.trim())}</${tag}>`).join('')}</tr></thead><tbody>`);
      } else {
        const prevIsHeader = lines[i - 1]?.startsWith('|') && !lines[i - 1]?.includes('---') && lines[i + 1]?.startsWith('|') && lines[i + 1]?.includes('---');
        if (!prevIsHeader) {
          out.push(`<tr>${cells.map(c => `<${tag} class="${cls}">${inline(c.trim())}</${tag}>`).join('')}</tr>`);
        }
        if (!lines[i + 1]?.startsWith('|')) {
          out.push(`</tbody></table></div>`);
        }
      }
    }
    // Checkbox list item
    else if (line.match(/^- \[[ x]\]/)) {
      if (!inList) { out.push('<ul class="space-y-1.5 my-3">'); inList = true; }
      const checked = line.includes('[x]');
      const text = inline(line.replace(/^- \[[ x]\]\s*/, ''));
      out.push(`<li class="flex items-start gap-2.5 text-sm">
        <span class="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-green-500/20 border-green-500/50 text-green-400 font-bold text-xs' : 'border-white/20 text-transparent'}">
          ${checked ? '✓' : ''}
        </span>
        <span class="${checked ? 'line-through text-white/40' : 'text-white/80'}">${text}</span>
      </li>`);
    }
    // Regular list item
    else if (line.match(/^[-*] /)) {
      if (!inList) { out.push('<ul class="list-disc list-inside space-y-1 my-2 pl-2 text-white/70">'); inList = true; }
      out.push(`<li class="text-sm">${inline(line.slice(2))}</li>`);
    }
    // Blank line
    else if (line.trim() === '') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<div class="h-2"></div>');
    }
    // Paragraph
    else {
      if (inList) { out.push('</ul>'); inList = false; }
      if (line.trim()) out.push(`<p class="text-sm text-white/70 leading-relaxed my-1.5">${inline(line)}</p>`);
    }
  }

  if (inList) out.push('</ul>');
  if (inBlockquote) out.push('</blockquote>');
  if (inCode) out.push('</code></pre>');

  return out.join('\n');
}

export const metadata = { title: 'Developer & Architecture Docs' };
export const dynamic = 'force-static';

export default function DevDocsPage() {
  const docs: DocItem[] = DOC_CONFIGS.map(cfg => {
    const docData = readDocFile(cfg.file, cfg.fallbackTitle);
    return {
      id: cfg.id,
      file: cfg.file,
      title: docData.title,
      description: docData.description,
      content: docData.content,
      icon: cfg.icon,
      color: cfg.color,
      bg: cfg.bg,
    };
  });

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-start">

        {/* Sidebar */}
        <div className="hidden md:flex flex-col sticky top-24 w-60 shrink-0 border-r border-white/10 pr-6 py-2">
          <div className="mb-4 flex flex-col gap-2">
            <Link 
              href="/docs" 
              className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors py-1"
            >
              <ArrowLeft size={13} /> Back to User Guide
            </Link>
            <div className="flex items-center gap-2 mt-2">
              <BookOpen size={14} className="text-purple-400" />
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Dev & Arch Docs</span>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {docs.map(d => (
              <a 
                key={d.id} 
                href={`#${d.id}`}
                className="text-xs text-white/60 hover:text-white py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <d.icon size={13} className={d.color} />
                <span className="truncate">{d.title}</span>
              </a>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-32">
          <header className="mb-12 border-b border-white/10 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Code2 size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Developer & Architecture Docs</h1>
                <p className="text-white/40 text-sm">Architecture blueprints, technical guides, and mobile roadmap</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white/[0.03] p-3 rounded-xl border border-white/5">
              <p className="text-white/60">
                Rendered live from repository markdown artifacts (<code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">docs/ai/*.md</code> &amp; <code className="bg-white/10 px-1 py-0.5 rounded text-purple-300">docs/mobile-app-plan.md</code>).
              </p>
              <Link href="/docs" className="text-purple-400 hover:text-purple-300 font-semibold shrink-0">
                Switch to User Guide &rarr;
              </Link>
            </div>
          </header>

          {docs.map(doc => (
            <section key={doc.id} id={doc.id} className="mb-16 scroll-mt-24">
              <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl ${doc.bg} border border-white/5`}>
                <div className={`${doc.color}`}>
                  <doc.icon size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{doc.title}</h2>
                  {doc.description ? (
                    <p className="text-sm text-white/50">{doc.description}</p>
                  ) : (
                    <p className="text-xs text-white/40 font-mono">{doc.file}</p>
                  )}
                </div>
              </div>
              <div
                className="prose-custom space-y-2"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
              />
            </section>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
