import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "react-toastify";
import { useAtomValue } from "jotai";
import { apiClient } from "@utils/reaxios";
import { loginUserAtom } from "./Task";
import "./TaskComments.css";

export default function TaskComments({ taskNo }) {
  // Task 파일에서 선언된 전역 로그인 유저 상태 구독
  const loginUser = useAtomValue(loginUserAtom);

  // 댓글 목록 데이터 및 로딩 상태
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // 신규 댓글 입력 상태
  const [inputContent, setInputContent] = useState("");

  // 댓글 수정 모드 및 수정 입력 상태
  const [editingCommentNo, setEditingCommentNo] = useState(null);
  const [editInputContent, setEditInputContent] = useState("");

  // 댓글 목록 서버 조회
  const fetchComments = useCallback(async () => {
    if (!taskNo || isNaN(Number(taskNo))) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.get(`/task/comment/list/${taskNo}`);
      const commentData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setComments(commentData);
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
      toast.error("댓글 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [taskNo]);

  // 업무 번호 변경 시 댓글 목록 동기화
  useEffect(() => {
    fetchComments();
    setEditingCommentNo(null);
    setInputContent("");
  }, [fetchComments]);

  // 신규 댓글 등록
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!inputContent.trim()) return;

    try {
      await apiClient.post("/task/comment/", {
        taskNo: Number(taskNo),
        taskCommentContent: inputContent.trim(),
      });
      
      setInputContent("");
      toast.success("댓글이 등록되었습니다.");
      fetchComments();
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      toast.error("댓글 작성에 실패했습니다.");
    }
  };

  // 댓글 수정 모드 진입
  const handleStartEdit = (comment) => {
    setEditingCommentNo(comment.taskCommentNo);
    setEditInputContent(comment.taskCommentContent);
  };

  // 댓글 수정 취소
  const handleCancelEdit = () => {
    setEditingCommentNo(null);
    setEditInputContent("");
  };

  // 댓글 수정 내용 서버 저장
  const handleSaveEdit = async (commentNo) => {
    if (!editInputContent.trim()) return;

    try {
      await apiClient.put("/task/comment/", {
        taskCommentNo: Number(commentNo),
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

  // 댓글 삭제
  const handleDeleteComment = async (commentNo) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await apiClient.delete(`/task/comment/${commentNo}`);
      toast.success("댓글이 삭제되었습니다.");
      fetchComments();
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      toast.error("댓글 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="task-comment-container">
      {/* 댓글 상단 헤더 */}
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

      {/* 댓글 목록 뷰 */}
      <div className="comment-list">
        {loading ? (
          <div className="comment-empty">댓글을 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">등록된 댓글이 없습니다.</div>
        ) : (
          comments.map((comment) => {
            // 전역 loginUser의 사번과 댓글 작성자 사번을 비교하여 본인 댓글 식별
            const isMyComment = Number(comment.empNo) === Number(loginUser?.empNo);
            const isEditing = editingCommentNo === comment.taskCommentNo;
            const author = comment.empName || comment.memberName || "사원";

            return (
              <div key={comment.taskCommentNo} className="comment-item">
                {/* 댓글 항목 헤더 */}
                <div className="comment-item-header">
                  <div className="comment-author-wrap">
                    <div className="comment-avatar">
                      {author.slice(0, 1)}
                    </div>
                    <span className="comment-author">{author}</span>
                    {comment.empDeptNo && (
                      <span className="comment-dept">({comment.empDeptNo})</span>
                    )}
                    <span className="comment-time">
                      {comment.taskCommentCtime ? String(comment.taskCommentCtime).replace("T", " ").slice(0, 16) : ""}
                    </span>
                    {comment.taskCommentUtime && (
                      <span className="comment-edited-tag">(수정됨)</span>
                    )}
                  </div>

                  {/* 댓글 제어 액션 */}
                  {isMyComment && !isEditing && (
                    <div className="comment-actions">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(comment)}
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

                {/* 댓글 수정 폼 */}
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
                        onClick={handleCancelEdit}
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
                  /* 댓글 본문 내용 */
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