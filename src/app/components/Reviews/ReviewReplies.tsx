'use client';

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Edit, Trash2, Send } from "@/app/lib/icons";
import type { AuthUser } from '../../lib/types/database';
import { useReviewReplies } from '../../hooks/useReviewReplies';
import { ConfirmationDialog } from '@/app/components/molecules/ConfirmationDialog/ConfirmationDialog';
import { isOptimisticId, isValidUUID } from '../../lib/utils/validation';

interface ReviewRepliesProps {
  reviewId: string;
  user: AuthUser | null;
  isOwnerView: boolean;
  isDesktop: boolean;
  formatDate: (date: string) => string;
  showReplyForm: boolean;
  onCloseReplyForm: () => void;
}

export function ReviewReplies({
  reviewId,
  user,
  isOwnerView,
  isDesktop,
  formatDate,
  showReplyForm,
  onCloseReplyForm,
}: ReviewRepliesProps) {
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [showDeleteReplyDialog, setShowDeleteReplyDialog] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<string | null>(null);

  const { replies, addReply, updateReply, deleteReply: deleteReplyById } = useReviewReplies(reviewId);

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !user || submittingReply) return;
    if (isOptimisticId(reviewId) || !isValidUUID(reviewId)) return;

    setSubmittingReply(true);
    const result = await addReply(replyText.trim());
    if (result) {
      setReplyText('');
      onCloseReplyForm();
    } else {
      alert('Failed to submit reply');
    }
    setSubmittingReply(false);
  };

  const handleEditReply = (reply: any) => {
    setEditingReplyId(reply.id);
    setEditReplyText(reply.content);
  };

  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditReplyText('');
  };

  const handleSaveEdit = async (replyId: string) => {
    if (!editReplyText.trim() || !user) return;
    const success = await updateReply(replyId, editReplyText.trim());
    if (success) {
      setEditingReplyId(null);
      setEditReplyText('');
    } else {
      alert('Failed to update reply');
    }
  };

  const handleDeleteReply = (replyId: string) => {
    setReplyToDelete(replyId);
    setShowDeleteReplyDialog(true);
  };

  const confirmDeleteReply = async () => {
    if (!replyToDelete || !user) return;
    setShowDeleteReplyDialog(false);
    const replyId = replyToDelete;
    setReplyToDelete(null);
    setDeletingReplyId(replyId);
    const success = await deleteReplyById(replyId);
    if (!success) alert('Failed to delete reply');
    setDeletingReplyId(null);
  };

  return (
    <>
      {/* Reply Form */}
      <AnimatePresence>
        {showReplyForm && user && (
          <m.div className="mt-4 pt-4 border-t border-sage/10">
            <div className="space-y-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a public reply to this review..."
                className="w-full px-4 py-3 rounded-lg border border-sage/20 bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 resize-none font-urbanist text-sm"
                rows={3}
                disabled={submittingReply}
              />
              <div className="flex items-center justify-end gap-2">
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={() => { onCloseReplyForm(); setReplyText(''); }}
                  className={`px-4 py-2 text-sm font-semibold bg-charcoal/10 text-charcoal rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDesktop ? '' : 'hover:bg-charcoal/20 transition-colors'
                  }`}
                  disabled={submittingReply}
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  Cancel
                </m.button>
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.05 }}
                  whileTap={isDesktop ? undefined : { scale: 0.95 }}
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim() || submittingReply}
                  className={`px-4 py-2 text-sm font-semibold bg-card-bg text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                    isDesktop ? '' : 'hover:bg-card-bg/90 transition-colors'
                  }`}
                  style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                >
                  <Send size={16} />
                  <span>{submittingReply ? 'Sending...' : 'Save Reply'}</span>
                </m.button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Replies List */}
      {replies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-sage/10 space-y-3">
          <h5
            className="font-urbanist text-sm font-semibold text-charcoal/70 mb-3"
            style={{ fontFamily: 'Urbanist, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            {replies.length === 1 ? '1 Reply' : `${replies.length} Replies`}
          </h5>
          {replies.map((reply) => {
            const isEditing = editingReplyId === reply.id;
            const isDeleting = deletingReplyId === reply.id;
            const replyDisplayName = reply.user?.name || 'Anonymous';
            const canEdit = !isEditing && (isOwnerView || reply.user_id === user?.id);

            const actionButtons = canEdit ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.1 }}
                  whileTap={isDesktop ? undefined : { scale: 0.9 }}
                  onClick={() => handleEditReply(reply)}
                  className={`w-7 h-7 bg-card-bg rounded-full flex items-center justify-center ${
                    isDesktop ? '' : 'hover:bg-card-bg/90 transition-colors'
                  }`}
                  aria-label="Edit reply"
                  title="Edit reply"
                >
                  <Edit className="w-[18px] h-[18px] text-white" />
                </m.button>
                <m.button
                  whileHover={isDesktop ? undefined : { scale: 1.1 }}
                  whileTap={isDesktop ? undefined : { scale: 0.9 }}
                  onClick={() => handleDeleteReply(reply.id)}
                  disabled={isDeleting}
                  className={`w-7 h-7 bg-coral rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDesktop ? '' : 'hover:bg-coral/90 transition-colors'
                  }`}
                  aria-label="Delete reply"
                  title="Delete reply"
                >
                  <Trash2 className="w-[18px] h-[18px] text-white" />
                </m.button>
              </div>
            ) : null;

            return (
              <m.div
                key={reply.id}
                className="pl-4 border-l-2 border-sage/20 bg-off-white/30 rounded-r-lg p-3 relative flex flex-col w-full min-w-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                    <span className="font-urbanist text-sm font-semibold text-charcoal-700 truncate min-w-0" title={replyDisplayName}>
                      {replyDisplayName}
                    </span>
                    <span className="font-urbanist text-xs font-semibold text-charcoal/70 flex-shrink-0">
                      {formatDate(reply.created_at)}
                    </span>
                  </div>
                  {actionButtons ? <div className="hidden sm:flex">{actionButtons}</div> : null}
                </div>

                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      value={editReplyText}
                      onChange={(e) => setEditReplyText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-sage/20 bg-off-white/50 focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage/40 resize-none font-urbanist text-sm min-w-0"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <m.button
                        whileHover={isDesktop ? undefined : { scale: 1.05 }}
                        whileTap={isDesktop ? undefined : { scale: 0.95 }}
                        onClick={handleCancelEdit}
                        className={`px-3 py-1.5 text-xs font-medium text-charcoal/70 ${
                          isDesktop ? '' : 'hover:text-charcoal transition-colors'
                        }`}
                      >
                        Cancel
                      </m.button>
                      <m.button
                        whileHover={isDesktop ? undefined : { scale: 1.05 }}
                        whileTap={isDesktop ? undefined : { scale: 0.95 }}
                        onClick={() => handleSaveEdit(reply.id)}
                        disabled={!editReplyText.trim()}
                        className={`px-3 py-1.5 text-xs font-medium bg-navbar-bg text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDesktop ? '' : 'hover:bg-navbar-bg/90 transition-colors'
                        }`}
                      >
                        Save
                      </m.button>
                    </div>
                  </div>
                ) : (
                  <p className="font-urbanist text-sm font-bold text-charcoal/80 min-w-0 break-words">
                    {reply.content}
                  </p>
                )}

                {actionButtons ? (
                  <div className="flex sm:hidden items-center justify-end gap-1 mt-2 w-full">
                    {actionButtons}
                  </div>
                ) : null}
              </m.div>
            );
          })}
        </div>
      )}

      <ConfirmationDialog
        isOpen={showDeleteReplyDialog}
        onClose={() => { setShowDeleteReplyDialog(false); setReplyToDelete(null); }}
        onConfirm={confirmDeleteReply}
        title="Delete Reply"
        message="Are you sure you want to delete this reply? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}

export type { ReviewRepliesProps };
