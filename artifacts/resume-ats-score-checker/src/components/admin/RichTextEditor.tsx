import { useEffect, useMemo, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Sparkles } from 'lucide-react';
import { sanitizeRichHtml } from '@/lib/admin-blog';

type ToolbarState = { bold: boolean; italic: boolean; align: 'left' | 'center' | 'right' };

function currentAlign(): ToolbarState['align'] {
  if (document.queryCommandState('justifyCenter')) return 'center';
  if (document.queryCommandState('justifyRight')) return 'right';
  return 'left';
}

const toolbarButtonClass =
  'grid size-8 place-items-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] aria-pressed:bg-[hsl(var(--primary)/.16)] aria-pressed:text-[hsl(var(--primary))]';

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<ToolbarState>({ bold: false, italic: false, align: 'left' });

  const initializeContent = useMemo(() => (value ? sanitizeRichHtml(value) : ''), []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initializeContent) {
      editorRef.current.innerHTML = initializeContent;
    }
    const updateState = () => {
      setState({ bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), align: currentAlign() });
    };
    document.addEventListener('selectionchange', updateState);
    return () => document.removeEventListener('selectionchange', updateState);
  }, [initializeContent]);

  const run = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const emit = () => {
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const clean = sanitizeRichHtml(html || textToParagraph(text));
    document.execCommand('insertHTML', false, clean);
    emit();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] focus-within:border-[hsl(var(--primary)/.5)] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/.2)]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--card)/.6)] px-2 py-1.5">
        <button
          type="button"
          aria-pressed={state.bold}
          title="Bold"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run('bold')}
        >
          <Bold className="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={state.italic}
          title="Italic"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run('italic')}
        >
          <Italic className="size-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-[hsl(var(--border))]" />
        <button
          type="button"
          aria-pressed={state.align === 'left'}
          title="Align left"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run('justifyLeft')}
        >
          <AlignLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={state.align === 'center'}
          title="Align center"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run('justifyCenter')}
        >
          <AlignCenter className="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={state.align === 'right'}
          title="Align right"
          className={toolbarButtonClass}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run('justifyRight')}
        >
          <AlignRight className="size-4" />
        </button>
        <span className="ml-auto hidden items-center gap-1.5 px-2 font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))] sm:inline-flex">
          <Sparkles className="size-3 text-[hsl(var(--accent-foreground))]" /> paste converts formatting
        </span>
      </div>
      <div
        ref={editorRef}
        className="min-h-[320px] px-4 py-3.5 text-sm leading-7 text-[hsl(var(--foreground))] outline-none [&_a]:text-[hsl(var(--primary))] [&_a]:underline [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_li]:ml-5 [&_blockquote]:border-l-2 [&_blockquote]:border-[hsl(var(--primary)/.5)] [&_blockquote]:pl-3"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Article content"
        data-placeholder="Write the article here. Headings, lists, bold and alignment are supported..."
        onInput={emit}
        onPaste={handlePaste}
      />
      <div className="border-t border-[hsl(var(--border)/.7)] bg-[hsl(var(--card)/.5)] px-4 py-2 font-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">
        Rich text · pasted formatting is converted automatically
      </div>
    </div>
  );
}

function textToParagraph(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => `<p>${block.trim().replace(/\n/g, '<br/>')}</p>`)
    .join('');
}