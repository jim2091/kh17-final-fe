import React, { useState, useEffect } from "react";
import { MessageSquare, Send, Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "react-toastify";
import apiClient from "../../utils/apiClient";
import "./TaskComments.css";

export default function TaskComments({ taskNo, currentProjectMemberNo, currentMemberName }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState("");
  
  // 수정 중인 댓글 번호 및 수정 텍스트 상태
  const [editingCommentNo, setEditingCommentNo] = useState(null);
  const [editInputContent, setEditInputContent] = useState("");

  // 1. [R] 댓글 목록 조회 (GET /api/task/comment/list/{taskNo})
  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/task/comment/list/${taskNo}`);
      setComments(res.data || []);
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
      toast.error("댓글 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskNo) {
      fetchComments();
      setEditingCommentNo(null);
      setInputContent("");
    }
  }, [taskNo]);

  // 2. [C] 댓글 등록 (POST /api/task/comment/)
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    try {
      await apiClient.post("/api/task/comment/", {
        taskNo: taskNo,
        projectMemberNo: currentProjectMemberNo,
        taskCommentContent: inputContent.trim(),
      });
      setInputContent("");
      toast.success("댓글이 등록되었습니다.");
      fetchComments(); // 목록 재동기화
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      toast.error("댓글 작성에 실패했습니다.");
    }
  };

  // 3. [U] 댓글 수정 제출 (PUT /api/task/comment/)
  const handleSaveEdit = async (commentNo) => {
    if (!editInputContent.trim()) return;

    try {
      await apiClient.put("/api/task/comment/", {
        taskCommentNo: commentNo,
        taskCommentContent: editInputContent.trim(),
      });
      setEditingCommentNo(null);
      setEditInputContent("");
      toast.success("댓글이 수정되었습니다.");
      fetchComments();
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      toast.error("댓글 수정에 실패했습니다.");
    }
  };

  // 4. [D] 댓글 삭제 (DELETE /api/task/comment/{taskCommentNo})
  const handleDeleteComment = async (commentNo) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await apiClient.delete(`/api/task/comment/${commentNo}`);
      toast.success("댓글이 삭제되었습니다.");
      fetchComments();
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      toast.error("댓글 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="task-comment-container">
      <div className="comment-header">
        <span className="comment-title">
          <MessageSquare size={16} />
          업무 댓글 ({comments.length})
        </span>
      </div>

      {/* 댓글 작성 폼 */}
      <form className="comment-input-box" onSubmit={handleAddComment}>
        <textarea
          className="comment-textarea"
          rows="2"
          placeholder="업무 피드백이나 진행 상황을 남겨주세요..."
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
        />
        <div className="comment-input-actions">
          <button type="submit" className="btn-comment-submit" disabled={!inputContent.trim()}>
            <Send size={13} />
            등록
          </button>
        </div>
      </form>

      {/* 댓글 리스트 */}
      <div className="comment-list">
        {loading ? (
          <div className="comment-empty">댓글을 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">등록된 댓글이 없습니다.</div>
        ) : (
          comments.map((comment) => {
            const isMyComment = comment.projectMemberNo === currentProjectMemberNo;
            const isEditing = editingCommentNo === comment.taskCommentNo;

            return (
              <div key={comment.taskCommentNo} className="comment-item">
                <div className="comment-item-header">
                  <div className="comment-author-wrap">
                    <div className="comment-avatar">
                      {(comment.empName || "사").slice(0, 1)}
                    </div>
                    <span className="comment-author">{comment.empName || "익명"}</span>
                    <span className="comment-time">
                      {comment.taskCommentCtime ? String(comment.taskCommentCtime).replace("T", " ").slice(0, 16) : ""}
                    </span>
                    {comment.taskCommentUtime && (
                      <span className="comment-edited-tag">(수정됨)</span>
                    )}
                  </div>

                  {/* 작성자 본인에게만 수정/삭제 버튼 노출 */}
                  {isMyComment && !isEditing && (
                    <div className="comment-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentNo(comment.taskCommentNo);
                          setEditInputContent(comment.taskCommentContent);
                        }}
                        className="btn-icon-action"
                        title="수정"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.taskCommentNo)}
                        className="btn-icon-action text-danger"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 댓글 본문 (일반 모드 vs 인라인 수정 모드) */}
                {isEditing ? (
                  <div className="comment-edit-box">
                    <textarea
                      className="comment-textarea edit"
                      value={editInputContent}
                      onChange={(e) => setEditInputContent(e.target.value)}
                      rows="2"
                    />
                    <div className="comment-edit-btns">
                      <button
                        type="button"
                        className="btn-edit-cancel"
                        onClick={() => setEditingCommentNo(null)}
                      >
                        <X size={13} /> 취소
                      </button>
                      <button
                        type="button"
                        className="btn-edit-save"
                        onClick={() => handleSaveEdit(comment.taskCommentNo)}
                      >
                        <Check size={13} /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="comment-content">{comment.taskCommentContent}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}