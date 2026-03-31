import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineSparkles, HiOutlineChatBubbleLeftRight, HiOutlinePaperAirplane } from 'react-icons/hi2';
import api, { getApiError } from '../lib/api';
import EmptyState from './EmptyState';
import StatusBadge from './StatusBadge';

export default function DiscussionBoard({ jobId, collegeId, canPost = true }) {
  const [loading, setLoading] = useState(true);
  const [discussion, setDiscussion] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const query = collegeId ? `?college_id=${encodeURIComponent(collegeId)}` : '';

  const loadThread = async () => {
    try {
      const { data } = await api.get(`/discussions/job/${jobId}${query}`);
      setDiscussion(data.discussion);
      setReplies(data.replies || []);
    } catch (error) {
      const msg = getApiError(error, 'Unable to load discussion');
      if (!msg.toLowerCase().includes('required')) toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadThread(); }, [jobId, collegeId]);

  const handleReply = async (event) => {
    event.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/discussions/job/${jobId}/replies`, {
        body: replyText,
        college_id: collegeId || undefined,
      });
      setReplies((cur) => [...cur, data.reply]);
      setReplyText('');
      toast.success('Reply posted.');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to post reply'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const { data } = await api.post(`/discussions/job/${jobId}/summarize`, {
        college_id: collegeId || undefined,
      });
      setDiscussion(data.discussion);
      toast.success('AI summary updated.');
    } catch (error) {
      toast.error(getApiError(error, 'Unable to summarize discussion'));
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="th-section">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-brand-500/30 border-t-brand-500" style={{ animation: 'spin 0.8s linear infinite' }} />
          <p className="text-sm text-ink-soft">Loading discussion…</p>
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="th-section">
        <EmptyState
          title="Discussion not available"
          description="Campus discussion is created when a college assignment is approved. Public jobs get a shared thread automatically."
        />
      </div>
    );
  }

  return (
    <section className="th-section space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: 'rgba(6,182,212,0.1)' }}
          >
            <HiOutlineChatBubbleLeftRight className="h-5 w-5" style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <p className="th-label">Discussion</p>
            <h2 className="text-lg font-bold text-ink">{discussion.title}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <StatusBadge status={discussion.scope} />
              {discussion.last_summarized_at && <StatusBadge status="summarized" />}
            </div>
          </div>
        </div>
        <button
          className="th-btn-secondary text-xs flex-shrink-0"
          type="button"
          onClick={handleSummarize}
          disabled={summarizing || replies.length === 0}
        >
          <HiOutlineSparkles className="h-3.5 w-3.5" />
          {summarizing ? 'Summarizing…' : 'AI Summary'}
        </button>
      </div>

      {/* AI Summary */}
      {discussion.ai_summary && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          <div className="flex items-center gap-2">
            <HiOutlineSparkles className="h-4 w-4" style={{ color: '#818cf8' }} />
            <p className="text-sm font-semibold text-ink">AI Summary</p>
          </div>
          <p className="text-sm leading-7 text-ink-soft">{discussion.ai_summary.summary}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="th-label mb-2">Interview difficulty</p>
              <p className="text-sm font-semibold text-ink capitalize">
                {discussion.ai_summary.interview_difficulty || 'medium'}
              </p>
            </div>
            <div>
              <p className="th-label mb-2">Prep topics</p>
              <div className="flex flex-wrap gap-1.5">
                {(discussion.ai_summary.preparation_topics || []).map((topic) => (
                  <span
                    key={topic}
                    className="th-badge"
                    style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.2)' }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply form */}
      {canPost && (
        <form className="space-y-3" onSubmit={handleReply}>
          <label className="block space-y-1.5">
            <span className="th-label">Share your experience or question</span>
            <textarea
              className="th-input"
              style={{ minHeight: '6rem' }}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Share interview rounds, prep advice, or questions other students should know…"
            />
          </label>
          <button className="th-btn-primary text-sm" disabled={submitting} type="submit">
            <HiOutlinePaperAirplane className="h-4 w-4" />
            {submitting ? 'Posting…' : 'Post reply'}
          </button>
        </form>
      )}

      {/* Replies */}
      <div className="space-y-3">
        {replies.length === 0 ? (
          <EmptyState
            title="No replies yet"
            description="Be the first to document the interview process, prep topics, or company-specific advice."
          />
        ) : (
          replies.map((reply) => (
            <article
              key={reply.id}
              className="th-panel p-4 space-y-2"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                >
                  {reply.user?.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{reply.user?.full_name || 'Community member'}</p>
                  <p className="text-xs text-ink-soft capitalize">{reply.user?.role_code || 'user'}</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-ink-soft pl-11">{reply.body}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
