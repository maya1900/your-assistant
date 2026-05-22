import { ArrowRightLeft, Code2, Compass, Sparkles } from 'lucide-react';

interface Preset {
  icon: React.ReactNode;
  bg: string;
  iconColor: string;
  title: string;
  description: string;
  prompt: string;
}

const PRESETS: Preset[] = [
  {
    icon: <Code2 size={16} />,
    bg: 'bg-accent-100',
    iconColor: 'text-accent-500',
    title: '解释一段代码',
    description: '把它当面向新手，说清每一行在做什么、为什么这么写。',
    prompt: '请帮我解释下面这段代码，假设我是新手：\n\n```\n// 把代码粘贴在这里\n```',
  },
  {
    icon: <Sparkles size={16} />,
    bg: 'bg-sage-100',
    iconColor: 'text-sage-700',
    title: '写一首十四行诗',
    description: '关于秋夜、关于咖啡、关于一个你想念但说不出口的人。',
    prompt: '帮我写一首十四行诗，主题是秋夜与一盏未喝完的咖啡。',
  },
  {
    icon: <Compass size={16} />,
    bg: 'bg-sky-100',
    iconColor: 'text-sky-500',
    title: '帮我做技术选型',
    description: '列出场景、约束、候选项，给一个推荐 + 它的代价。',
    prompt: '我想做技术选型，请按"场景 · 约束 · 候选项 · 推荐 + 代价"的结构帮我梳理：\n\n场景：',
  },
  {
    icon: <ArrowRightLeft size={16} />,
    bg: 'bg-paper-200',
    iconColor: 'text-ink-700',
    title: '翻译一段文字',
    description: '英 ↔ 中，保留语气与节奏，不做直白的字面对应。',
    prompt: '请把下面这段文字翻译成中文，保留语气与节奏：\n\n',
  },
];

interface Props {
  onPick: (prompt: string) => void;
}

export function EmptyState({ onPick }: Props) {
  return (
    <div className="flex-1 overflow-y-auto nice-scroll">
      <div className="max-w-[780px] mx-auto px-4 md:px-6 py-10 sm:py-16">
        <div className="mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 mb-4 sm:mb-5 text-[11px] uppercase tracking-wider-meta text-ink-500">
            <span className="brand-mark !w-3 !h-3" />
            <span>{getGreeting()}</span>
          </div>
          <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.05] tracking-tight-display text-ink-900">
            今天，
            <span
              className="italic"
              style={{ fontVariationSettings: "'SOFT' 80, 'WONK' 1", color: '#FF6B35' }}
            >
              想聊点
            </span>
            <br />
            什么？
          </h1>
          <p className="mt-4 sm:mt-5 text-[14px] sm:text-[15px] text-ink-700 max-w-[480px] leading-relaxed">
            我可以解释代码、写作、做技术选型、翻译，或者只是陪你想清楚一件事。从一张卡片开始，或者直接在下面输入。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {PRESETS.map((p) => (
            <button
              key={p.title}
              onClick={() => onPick(p.prompt)}
              className="prompt-card text-left p-5 rounded-2xl"
            >
              <div className={`w-9 h-9 rounded-xl ${p.bg} grid place-items-center mb-3 ${p.iconColor}`}>
                {p.icon}
              </div>
              <div className="text-[14px] font-medium mb-1">{p.title}</div>
              <div className="text-[12.5px] text-ink-500 leading-relaxed">{p.description}</div>
            </button>
          ))}
        </div>

        <div className="hairline mb-8" />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-ink-500">
          <span className="kbd">⌘K</span>
          <span>新建对话</span>
          <span className="text-ink-300">·</span>
          <span className="kbd">Enter</span>
          <span>发送</span>
          <span className="text-ink-300">·</span>
          <span className="kbd">⇧↵</span>
          <span>换行</span>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'late night';
  if (h < 11) return 'good morning';
  if (h < 14) return 'good noon';
  if (h < 18) return 'good afternoon';
  return 'good evening';
}
