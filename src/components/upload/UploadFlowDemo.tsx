import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from 'motion/react';
import { UploadCloud, Loader2, CheckCircle2, XCircle, Bell, Trash2 } from 'lucide-react';
import { AnimatedList } from '../motion/AnimatedList';
import { AnimatedButton } from '../motion/AnimatedButton';
import { AnimatedContainer } from '../motion/AnimatedContainer';
import { transitions } from '../motion/transitions';

type UploadStatus = 'queued' | 'processing' | 'complete' | 'failed';

interface DemoUpload {
  id: string;
  filename: string;
  sizeMb: number;
  status: UploadStatus;
  progress: number; // 0-100, GPU-rendered via scaleX
}

const FILTERS: Array<'all' | UploadStatus> = ['all', 'queued', 'processing', 'complete', 'failed'];

const STATUS_META: Record<UploadStatus, { label: string; classes: string }> = {
  queued: { label: 'Queued (SQS)', classes: 'bg-amber-100 text-amber-800' },
  processing: { label: 'Processing (Worker)', classes: 'bg-blue-100 text-blue-800' },
  complete: { label: 'Complete', classes: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed (DLQ)', classes: 'bg-red-100 text-red-700' },
};

let seq = 3;

const SEED: DemoUpload[] = [
  { id: 'up-1', filename: 'sundarban-harvest.mp4', sizeMb: 420, status: 'processing', progress: 55 },
  { id: 'up-2', filename: 'ghani-oil-press.mp4', sizeMb: 180, status: 'queued', progress: 0 },
  { id: 'up-3', filename: 'chia-superfood.mp4', sizeMb: 640, status: 'complete', progress: 100 },
];

/**
 * Animated demo of the Video Upload architecture:
 * Client -> Upload Service (pre-signed URL) -> S3 -> SQS -> Workers -> Notification.
 * Showcases: staggered fade-in (AnimatedList), hover/tap (motion),
 * exit animations (AnimatePresence), shared layout (LayoutGroup), reduced motion.
 */
export function UploadFlowDemo() {
  const [uploads, setUploads] = useState<DemoUpload[]>(SEED);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [notified, setNotified] = useState<string[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const visible = uploads.filter((u) => filter === 'all' || u.status === filter);

  const simulateUpload = () => {
    seq += 1;
    const id = `up-${seq}-${Date.now() % 10000}`;
    const next: DemoUpload = {
      id,
      filename: `batch-${seq}-clip.mp4`,
      sizeMb: 120 + Math.round(Math.random() * 600),
      status: 'queued',
      progress: 0,
    };
    setUploads((prev) => [next, ...prev]);

    // Upload Service -> SQS -> Worker pipeline simulation
    setTimeout(() => {
      setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, status: 'processing', progress: 10 } : u)));
      const tick = setInterval(() => {
        setUploads((prev) => {
          const target = prev.find((u) => u.id === id);
          if (!target || target.status !== 'processing') {
            clearInterval(tick);
            return prev;
          }
          const progress = Math.min(100, target.progress + 25);
          const done = progress >= 100;
          if (done) {
            clearInterval(tick);
            // Notification Service event
            setNotified((n) => [`upload.completed:${id}`, ...n].slice(0, 3));
            return prev.map((u) => (u.id === id ? { ...u, progress, status: 'complete' } : u));
          }
          return prev.map((u) => (u.id === id ? { ...u, progress } : u));
        });
      }, 600);
    }, 800);
  };

  const remove = (id: string) => setUploads((prev) => prev.filter((u) => u.id !== id));

  return (
    <AnimatedContainer animation="fadeInUp" className="max-w-5xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl border border-[#2F5233]/15 shadow-sm p-5 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#D9A441]">
              System Design Demo • 1000/day • p95 &lt;5min
            </p>
            <h2 className="font-serif-brand text-xl sm:text-2xl font-extrabold text-[#2F5233]">
              Video Upload & Processing Pipeline
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Pre-signed S3 → SQS queue → FFmpeg workers → webhook notification
            </p>
          </div>
          <AnimatedButton onClick={simulateUpload} className="inline-flex items-center gap-2">
            <UploadCloud className="w-4 h-4" />
            Simulate upload
          </AnimatedButton>
        </div>

        {/* Shared-layout filter tabs */}
        <LayoutGroup>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                  filter === f ? 'text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {filter === f && !shouldReduceMotion && (
                  <motion.span
                    layoutId="upload-filter-pill"
                    transition={transitions.springStiff}
                    className="absolute inset-0 bg-[#2F5233] rounded-full"
                  />
                )}
                {filter === f && shouldReduceMotion && (
                  <span className="absolute inset-0 bg-[#2F5233] rounded-full" />
                )}
                <span className="relative z-10">{f}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>

        {/* Staggered upload queue */}
        <AnimatedList<DemoUpload>
          items={visible}
          keyExtractor={(u: DemoUpload) => u.id}
          className="space-y-3"
          renderItem={(u: DemoUpload) => (
            <motion.div
              layout
              whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.005 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
              transition={transitions.spring}
              className="flex items-center gap-3 p-3 rounded-2xl border border-neutral-200 bg-[#FAF7F2]"
            >
              <div className="shrink-0 w-9 h-9 rounded-xl bg-[#2F5233] text-white flex items-center justify-center">
                {u.status === 'processing' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : u.status === 'complete' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : u.status === 'failed' ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold truncate">{u.filename}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_META[u.status].classes}`}>
                    {STATUS_META[u.status].label}
                  </span>
                  <span className="text-[11px] text-neutral-500">{u.sizeMb} MB</span>
                </div>
                {/* GPU progress bar: scaleX only */}
                <div className="mt-2 h-1.5 rounded-full bg-neutral-200 overflow-hidden">
                  <motion.div
                    className="h-full w-full origin-left bg-[#D9A441]"
                    initial={false}
                    animate={{ scaleX: u.progress / 100 }}
                    transition={transitions.smooth}
                  />
                </div>
              </div>
              <button
                onClick={() => remove(u.id)}
                aria-label={`Remove ${u.filename}`}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        />

        {visible.length === 0 && (
          <p className="text-sm text-neutral-500 text-center py-6">No uploads in this state.</p>
        )}

        {/* Notification Service events with exit animations */}
        <div className="pt-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-1.5 mb-2">
            <Bell className="w-3.5 h-3.5" /> Notification Service (webhooks)
          </p>
          <AnimatePresence initial={false}>
            {notified.map((n) => (
              <motion.div
                key={n}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                transition={transitions.spring}
                className="text-xs font-mono bg-green-50 border border-green-200 text-green-800 rounded-xl px-3 py-2 mb-2"
              >
                POST webhook → {`{ "event": "${n.split(':')[0]}", "status": "complete" }`}
              </motion.div>
            ))}
          </AnimatePresence>
          {notified.length === 0 && (
            <p className="text-xs text-neutral-400">Complete an upload to trigger a webhook event.</p>
          )}
        </div>
      </div>
    </AnimatedContainer>
  );
}
