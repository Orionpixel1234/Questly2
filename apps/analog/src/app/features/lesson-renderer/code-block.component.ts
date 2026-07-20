import { Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';

// Prism.highlight escapes the source and only wraps tokens in <span
// class="token ...">; it never lets the code's own content become live
// HTML, so bypassSecurityTrustHtml on its output is the standard safe
// pattern for syntax highlighters.
@Component({
  selector: 'app-code-block',
  template: `
    <div class="code-block">
      <div class="code-block__header">
        <span class="code-block__lang">{{ lang() }}</span>
        @if (canRun()) {
          <button type="button" class="btn btn-secondary code-block__run" (click)="run()">
            Run
          </button>
        }
      </div>
      <pre class="code-block__pre"><code [innerHTML]="highlighted()"></code></pre>
      @if (output(); as lines) {
        <div class="code-block__output">
          @for (line of lines; track $index) {
            <div>{{ line }}</div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './code-block.component.css',
})
export class CodeBlockComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly lang = input.required<string>();
  readonly runnable = input(false);
  readonly code = input.required<string>();

  readonly output = signal<string[] | null>(null);
  readonly canRun = computed(() => this.runnable() && this.lang() === 'javascript');

  readonly highlighted = computed(() => {
    const grammar = Prism.languages[this.lang()];
    const html = grammar
      ? Prism.highlight(this.code(), grammar, this.lang())
      : escapeHtml(this.code());
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  run(): void {
    this.output.set(['Running…']);
    const iframe = document.createElement('iframe');
    // No allow-same-origin: the sandboxed document gets an opaque origin,
    // so it cannot read cookies, localStorage, or reach the parent page's
    // DOM — only the code the author wrote runs, isolated.
    iframe.sandbox.add('allow-scripts');
    iframe.style.display = 'none';
    const messages: string[] = [];

    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data as { type: string; text: string };
      if (data.type === 'log') messages.push(data.text);
      if (data.type === 'done') {
        this.output.set(messages.length ? messages : ['(no output)']);
        cleanup();
      }
    };
    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      iframe.remove();
    };

    window.addEventListener('message', onMessage);
    iframe.srcdoc = `<script>
      const send = (type, text) => parent.postMessage({ type, text }, '*');
      console.log = (...args) => send('log', args.map(String).join(' '));
      console.error = (...args) => send('log', '[error] ' + args.map(String).join(' '));
      try {
        ${escapeForScriptTag(this.code())}
      } catch (e) {
        send('log', '[error] ' + e.message);
      }
      send('done', '');
    </` + `script>`;
    document.body.appendChild(iframe);

    // Runaway/hung code shouldn't leave the UI stuck on "Running…" forever.
    setTimeout(() => {
      if (this.output()?.[0] === 'Running…') {
        this.output.set(['(timed out after 3s)']);
        cleanup();
      }
    }, 3000);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeForScriptTag(code: string): string {
  return code.replace(/<\/script/gi, '<\\/script');
}
