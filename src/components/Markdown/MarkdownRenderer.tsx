import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface Props {
  children: string;
}

const components: Components = {
  code({ className, children, ...rest }) {
    const match = /language-(\w+)/.exec(className || '');
    if (!match) {
      return (
        <code className="md-inline-code" {...rest}>
          {children}
        </code>
      );
    }
    const code = String(children).replace(/\n$/, '');
    return <CodeBlock language={match[1]} code={code} />;
  },
  pre({ children }) {
    return <>{children}</>;
  },
  a({ children, ...rest }) {
    return (
      <a
        target="_blank"
        rel="noreferrer"
        className="text-accent-600 underline underline-offset-2 decoration-accent-300 hover:decoration-accent-500"
        {...rest}
      >
        {children}
      </a>
    );
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 space-y-1.5 marker:text-accent-500">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 space-y-1.5 marker:text-accent-500">{children}</ol>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-accent-300 pl-3 text-ink-700 italic">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="w-full border-collapse text-[13.5px]">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b border-paper-300 px-3 py-2 text-left font-medium bg-paper-100">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border-b border-paper-200 px-3 py-2">{children}</td>;
  },
  h1: ({ children }) => <h1 className="font-display text-[20px] mt-2 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="font-display text-[17px] mt-2 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="font-display text-[15px] mt-2 mb-1">{children}</h3>,
};

export function MarkdownRenderer({ children }: Props) {
  return (
    <div className="text-[14.5px] leading-relaxed text-ink-900 space-y-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
