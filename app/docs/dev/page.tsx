import fs from 'fs';
import path from 'path';
import { PageWrapper } from '@/components/page-wrapper';
import { BookOpen, Code2, Layers, ClipboardList, Wrench, FlaskConical, Rocket, Activity } from 'lucide-react';

// Read all docs/ai files at build/request time (server component)
function readDoc(phase: string): { title: string; description: string; content: string } {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'ai', phase, 'README.md');
    const raw = fs.readFileSync(filePath, 'utf-8');

    // Parse simple YAML frontmatter manually (no external dep needed)
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!fmMatch) return { title: phase, description: '', content: raw };

    const fm = fmMatch[1];
    const content = fmMatch[2];

    const title = fm.match(/title:\s*(.+)/)?.[1]?.trim() ?? phase;
    const description = fm.match(/description:\s*(.+)/)?.[1]?.trim() ?? '';

    return { title, description, content };
  } catch {
    return { title: phase, description: '', content: '' };
  }
}

const PHASES = [
  { id: 'requirements', icon: ClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'design',       icon: Layers,        color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'planning',     icon: Wrench,         color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  { id: 'implementation', icon: Code2,        color: 'text-green-400',  bg: 'bg-green-500/10' },
  { id: 'testing',      icon: FlaskConical,   color: 'text-pink-400',   bg: 'bg-pink-500/10' },
  { id: 'deployment',   icon: Rocket,         color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  { id: 'monitoring',   icon: Activity,       color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

// Minimal markdown renderer (no external dep) — handles headers, code blocks, checkboxes, lists, bold, inline code
function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inCode = false;
  let inList = false;
  let lang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fence
    if (line.startsWith('```')) {
      if (inCode) {
        out.push('</code></pre>');
        inCode = false;
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        lang = line.slice(3).trim();
        out.push(`<pre class="bg-black/40 rounded-xl p-4 overflow-x-auto text-xs my-3 border border-white/10"><code class="text-green-300 font-mono">`);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      out.push(line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '\n');
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h4 class="text-sm font-bold text-white/80 mt-4 mb-1">${inline(line.slice(5))}</h4>`);
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
    // Table row
    else if (line.startsWith('|')) {
      if (inList) { out.push('</ul>'); inList = false; }
      const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
      const isSep = cells.every(c => /^[-: ]+$/.test(c));
      if (isSep) continue;
      const isHeader = i > 0 && lines[i + 1]?.startsWith('|') && lines[i + 1]?.includes('---');
      const tag = isHeader ? 'th' : 'td';
      const cls = isHeader
        ? 'px-3 py-2 text-left text-xs font-bold text-white/60 uppercase tracking-wider bg-white/5'
        : 'px-3 py-2 text-sm text-white/70 border-t border-white/5';
      if (isHeader) {
        out.push(`<div class="overflow-x-auto my-4"><table class="w-full text-left rounded-xl overflow-hidden border border-white/10"><thead><tr>${cells.map(c => `<${tag} class="${cls}">${inline(c.trim())}</${tag}>`).join('')}</tr></thead><tbody>`);
      } else {
        // Check if next line is separator (we're a header row)
        const prevIsHeader = lines[i - 1]?.startsWith('|') && !lines[i - 1]?.includes('---') && lines[i + 1]?.startsWith('|') && lines[i + 1]?.includes('---');
        if (!prevIsHeader) {
          out.push(`<tr>${cells.map(c => `<${tag} class="${cls}">${inline(c.trim())}</${tag}>`).join('')}</tr>`);
        }
        // Close table if next line isn't a table row
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
      out.push(`<li class="flex items-start gap-2 text-sm">
        <span class="mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/20'}">
          ${checked ? '✓' : ''}
        </span>
        <span class="${checked ? 'line-through text-white/30' : 'text-white/70'}">${text}</span>
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
      if (line.trim()) out.push(`<p class="text-sm text-white/70 leading-relaxed">${inline(line)}</p>`);
    }
  }

  if (inList) out.push('</ul>');
  if (inCode) out.push('</code></pre>');

  return out.join('\n');
}

function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 text-purple-300 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="text-white/80">$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-purple-400 underline hover:text-purple-300" target="_blank">$1</a>');
}

export const metadata = { title: 'Dev Docs' };
export const dynamic = 'force-static';

export default function DevDocsPage() {
  const docs = PHASES.map(p => ({ ...p, ...readDoc(p.id) }));

  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-start">

        {/* Sidebar */}
        <div className="hidden md:flex flex-col sticky top-24 w-56 shrink-0 border-r border-white/10 pr-6 py-2">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={14} className="text-purple-400" />
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Dev Docs</span>
          </div>
          <nav className="flex flex-col gap-1">
            {docs.map(d => (
              <a key={d.id} href={`#${d.id}`}
                className="text-sm text-white/60 hover:text-white py-1 transition-colors flex items-center gap-2">
                <d.icon size={12} className={d.color} />
                {d.title}
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
                <h1 className="text-3xl font-bold text-white">Developer Docs</h1>
                <p className="text-white/40 text-sm">Architecture, planning, and implementation notes</p>
              </div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
              This page is rendered from <code className="bg-white/10 px-1 rounded text-purple-300 text-xs">docs/ai/*/README.md</code> — the same files AI coding agents read to understand the project context. Edit those files to keep this in sync.
            </p>
          </header>

          {docs.map(doc => (
            <section key={doc.id} id={doc.id} className="mb-16 scroll-mt-24">
              <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl ${doc.bg} border border-white/5`}>
                <div className={`${doc.color}`}>
                  <doc.icon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{doc.title}</h2>
                  {doc.description && (
                    <p className="text-sm text-white/50">{doc.description}</p>
                  )}
                </div>
              </div>
              <div
                className="prose-custom"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
              />
            </section>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
