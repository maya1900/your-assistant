import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  language: string;
  code: string;
}

export function CodeBlock({ language, code }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  return (
    <div className="codeblock not-prose">
      <div className="codeblock-bar flex items-center justify-between px-4 py-2 text-[11px] tracking-wider-meta uppercase">
        <span className="text-paper-200/80">{language}</span>
        <button
          onClick={handleCopy}
          className="copy-chip px-2 py-1 rounded-md flex items-center gap-1.5 text-[11px]"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '14px 18px',
          background: 'transparent',
          fontSize: '13px',
          lineHeight: 1.65,
        }}
        codeTagProps={{
          style: { fontFamily: '"Geist Mono", ui-monospace, monospace' },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
