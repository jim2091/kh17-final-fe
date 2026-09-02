import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { apiClient } from "@utils/reaxios";
import "./TaskComments.css";

export default function TaskComments({ taskNo, projectNo, loginUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState("");

  const [editingCommentNo, setEditingCommentNo] = useState(null);
  const [editInputContent, setEditInputContent] = useState("");

  // 로그인한 사번 추출
  const getLoginEmpNo = () => {
    if (loginUser && loginUser.empNo) {
      return Number(loginUser.empNo);
    }
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (val && val.includes("empNo")) {
          const parsed = JSON.parse(val);
          if (parsed && parsed.empNo) {
            return Number(parsed.empNo);
          }
        }
      }
    } catch (e) {}
    return Number(localStorage.getItem("empNo") || 0);
  };

  const currentEmpNo = getLoginEmpNo();

  // 댓글 목록 조회
  const fetchComments = useCallback(async (isSilent = false) => {
    if (!taskNo || isNaN(Number(taskNo))) {
      setLoading(false);
      return;
    }

    try {
      if (!isSilent) setLoading(true);
      const res = await apiClient.get(`/task/comment/list/${taskNo}`);
      const commentData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setComments(commentData);
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
      if (!isSilent) toast.error("댓글 목록을 불러오지 못했습니다.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [taskNo]);

  useEffect(() => {
    fetchComments(false);
    setEditingCommentNo(null);
    setInputContent("");

    const handleRemoteCommentChange = (e) => {
      if (Number(e.detail?.taskNo) === Number(taskNo)) {
        fetchComments(true);
      }
    };

    window.addEventListener("task-comment-changed", handleRemoteCommentChange);
    return () => {
      window.removeEventListener("task-comment-changed", handleRemoteCommentChange);
    };
  }, [taskNo, fetchComments]);

  // 댓글 등록
  const handleAddComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputContent.trim()) return;

    try {
      await apiClient.post(`/task/comment/?projectNo=${projectNo || 0}`, {
        taskNo: Number(taskNo),
        taskCommentContent: inputContent.trim(),
      });
      setInputContent("");
      toast.success("댓글이 등록되었습니다.");
      fetchComments(true);
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      toast.error("댓글 작성에 실패했습니다.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputContent.trim()) handleAddComment();
    }
  };

  // 수정 모드 진입
  const handleStartEdit = (comment) => {
    setEditingCommentNo(comment.taskCommentNo);
    setEditInputContent(comment.taskCommentContent);
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingCommentNo(null);
    setEditInputContent("");
  };

  // 수정 내용 서버 저장
  const handleSaveEdit = async (commentNo) => {
    if (!editInputContent.trim()) {
      toast.warn("수정할 댓글 내용을 입력해주세요.");
      return;
    }

    try {
      await apiClient.put(`/task/comment/?projectNo=${projectNo || 0}`, {
        taskCommentNo: Number(commentNo),
        taskNo: Number(taskNo),
        taskCommentContent: editInputContent.trim(),
      });
      setEditingCommentNo(null);
      setEditInputContent("");
      toast.success("댓글이 수정되었습니다.");
      fetchComments(true);
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      toast.error("댓글 수정에 실패했습니다.");
    }
  };

  // 댓글 삭제 (SweetAlert2 모달 적용)
  const handleDeleteComment = async (commentNo) => {
    const result = await Swal.fire({
      title: "댓글을 삭제하시겠습니까?",
      text: "삭제된 댓글은 복구할 수 없습니다.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "삭제",
      cancelButtonText: "취소",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(
        `/task/comment/${commentNo}?projectNo=${projectNo || 0}&taskNo=${taskNo}`
      );
      Swal.fire({
        title: "삭제 완료",
        text: "댓글이 정상적으로 삭제되었습니다.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchComments(true);
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      Swal.fire({
        title: "삭제 실패",
        text: "댓글 삭제 중 오류가 발생했습니다.",
        icon: "error",
      });
    }
  };

  return (
    <div className="task-comment-container" style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
      <div className="comment-header" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
        <MessageSquare size={16} />
        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>
          업무 댓글 ({comments.length})
        </span>
      </div>

      {/* 등록 폼 */}
      <form className="comment-input-box" onSubmit={handleAddComment} style={{ marginBottom: "16px" }}>
        <textarea
          className="comment-textarea"
          rows="2"
          placeholder="업무 피드백을 입력하세요... (Enter: 등록, Shift+Enter: 줄바꿈)"
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="comment-input-actions">
          <button type="submit" className="btn-comment-submit" disabled={!inputContent.trim()}>
            <Send size={13} /> 등록
          </button>
        </div>
      </form>

      {/* 댓글 목록 */}
      <div className="comment-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div className="comment-empty">댓글을 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">등록된 댓글이 없습니다.</div>
        ) : (
          comments.map((comment) => {
            const commentEmpNo = Number(comment.empNo || 0);

            // 로그인 사번과 댓글 작성자 사번 1:1 대조
            const isMyComment = currentEmpNo > 0 && commentEmpNo > 0 && currentEmpNo === commentEmpNo;
            const isEditing = editingCommentNo === comment.taskCommentNo;
            const author = (comment.empName || comment.memberName || "사원").trim();

            return (
              <div
                key={comment.taskCommentNo}
                className="comment-item"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        backgroundColor: "#cbd5e1",
                        color: "#334155",
                        fontSize: "11px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {author.slice(0, 1)}
                    </div>
                    <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#1e293b" }}>
                      {author}
                    </span>
                    {comment.empDeptNo && (
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        ({comment.empDeptNo})
                      </span>
                    )}
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {comment.taskCommentCtime
                        ? String(comment.taskCommentCtime).replace("T", " ").slice(0, 16)
                        : ""}
                    </span>
                    {comment.taskCommentUtime && (
                      <span style={{ fontSize: "10.5px", color: "#6366f1" }}>(수정됨)</span>
                    )}
                  </div>

                  {/* 본인 댓글에만 수정 및 삭제 버튼 노출 */}
                  {isMyComment && !isEditing && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(comment)}
                        title="수정"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "3px 7px",
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          color: "#334155",
                          cursor: "pointer",
                        }}
                      >
                        <Edit2 size={11} /> 수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.taskCommentNo)}
                        title="삭제"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "3px 7px",
                          fontSize: "11px",
                          fontWeight: "600",
                          backgroundColor: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "4px",
                          color: "#ef4444",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={11} /> 삭제
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                    <textarea
                      rows="2"
                      value={editInputContent}
                      onChange={(e) => setEditInputContent(e.target.value)}
                      style={{
                        width: "100%",
                        border: "1px solid #93c5fd",
                        borderRadius: "6px",
                        padding: "8px",
                        backgroundColor: "#f8fafc",
                        fontSize: "13px",
                        outline: "none",
                        resize: "none",
                      }}
                      autoFocus
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "11px",
                          padding: "4px 8px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          backgroundColor: "#ffffff",
                          color: "#64748b",
                          cursor: "pointer",
                        }}
                      >
                        <X size={12} /> 취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(comment.taskCommentNo)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          padding: "4px 8px",
                          border: "none",
                          borderRadius: "4px",
                          backgroundColor: "#2563eb",
                          color: "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <Check size={12} /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                    {comment.taskCommentContent}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}