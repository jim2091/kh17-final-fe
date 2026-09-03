import React, { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Send, Edit2, Trash2, Check, X, Paperclip, FileText, Download } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { apiClient } from "@utils/reaxios";
import "./TaskComments.css";

export default function TaskComments({ taskNo, projectNo, loginUser }) {
  const [comments, setComments] = useState([]);
  const [commentFilesMap, setCommentFilesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [editingCommentNo, setEditingCommentNo] = useState(null);
  const [editInputContent, setEditInputContent] = useState("");

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

  const isImageFile = (file) => {
    if (file.attachType && file.attachType.startsWith("image/")) return true;
    const name = file.attachName || "";
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);
  };

  const fetchCommentFiles = async (commentList) => {
    const fileMap = {};
    await Promise.all(
      commentList.map(async (c) => {
        try {
          const res = await apiClient.get(`/task/file/comment/${c.taskCommentNo}`);
          fileMap[c.taskCommentNo] = res.data || [];
        } catch (err) {
          fileMap[c.taskCommentNo] = [];
        }
      })
    );
    setCommentFilesMap(fileMap);
  };

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
      await fetchCommentFiles(commentData);
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
    setSelectedFile(null);

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

  const handleAddComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputContent.trim() && !selectedFile) return;

    try {
      const contentPayload = inputContent.trim() || "(파일 첨부)";

      const res = await apiClient.post(`/task/comment/?projectNo=${projectNo || 0}`, {
        taskNo: Number(taskNo),
        taskCommentContent: contentPayload,
      });

      const newCommentNo = typeof res.data === "number"
        ? res.data
        : (res.data?.taskCommentNo || res.data?.data);

      if (selectedFile && newCommentNo) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        await apiClient.post(
          `/task/file/comment/${newCommentNo}?projectNo=${projectNo || 0}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      setInputContent("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("댓글이 등록되었습니다.");
      fetchComments(true);
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      toast.error("댓글 작성 또는 파일 업로드에 실패했습니다.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputContent.trim() || selectedFile) handleAddComment();
    }
  };

  const handleStartEdit = (comment) => {
    setEditingCommentNo(comment.taskCommentNo);
    setEditInputContent(comment.taskCommentContent === "(파일 첨부)" ? "" : comment.taskCommentContent);
  };

  const handleCancelEdit = () => {
    setEditingCommentNo(null);
    setEditInputContent("");
  };

  const handleSaveEdit = async (commentNo) => {
    const trimmed = editInputContent.trim();
    const targetFiles = commentFilesMap[commentNo] || [];

    if (!trimmed && targetFiles.length === 0) {
      toast.warn("수정할 댓글 내용을 입력해주세요.");
      return;
    }

    try {
      await apiClient.put(`/task/comment/?projectNo=${projectNo || 0}`, {
        taskCommentNo: Number(commentNo),
        taskNo: Number(taskNo),
        taskCommentContent: trimmed || "(파일 첨부)",
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

  const handleDeleteComment = async (commentNo) => {
    const result = await Swal.fire({
      title: "댓글을 삭제하시겠습니까?",
      text: "첨부된 파일도 함께 삭제되며 복구할 수 없습니다.",
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
        text: "댓글 및 첨부파일이 정상적으로 삭제되었습니다.",
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

  const handleDownloadFile = (attachNo) => {
    window.open(`http://localhost:8080/api/attach/${attachNo}`, "_blank");
  };

  return (
    <div className="task-comment-container" style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
      <div className="comment-header" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
        <MessageSquare size={16} />
        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>
          업무 댓글 ({comments.length})
        </span>
      </div>

      <form className="comment-input-box" onSubmit={handleAddComment} style={{ marginBottom: "16px" }}>
        <textarea
          className="comment-textarea"
          rows="2"
          placeholder="업무 피드백을 입력하세요... (Enter: 등록, Shift+Enter: 줄바꿈)"
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {selectedFile && (
          <div className="comment-selected-file-chip">
            <FileText size={13} />
            <span className="file-name">{selectedFile.name}</span>
            <button
              type="button"
              className="btn-remove-chip"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="comment-input-actions">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setSelectedFile(e.target.files[0]);
              }
            }}
          />
          <button
            type="button"
            className="btn-attach-clip"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={15} />
            <span>파일 첨부</span>
          </button>

          <button type="submit" className="btn-comment-submit" disabled={!inputContent.trim() && !selectedFile}>
            <Send size={13} /> 등록
          </button>
        </div>
      </form>

      <div className="comment-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {loading ? (
          <div className="comment-empty">댓글을 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">등록된 댓글이 없습니다.</div>
        ) : (
          comments.map((comment) => {
            const commentEmpNo = Number(comment.empNo || comment.writerEmpNo || 0);
            const isMyComment = currentEmpNo > 0 && commentEmpNo > 0 && currentEmpNo === commentEmpNo;
            const isEditing = editingCommentNo === comment.taskCommentNo;
            const author = (comment.empName || comment.memberName || "사원").trim();
            const files = commentFilesMap[comment.taskCommentNo] || [];

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
                  <>
                    {comment.taskCommentContent && comment.taskCommentContent !== "(파일 첨부)" && (
                      <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                        {comment.taskCommentContent}
                      </div>
                    )}

                    {files.length > 0 && (
                      <div className="comment-files-wrapper">
                        {/* 이미지 갤러리 (개별 삭제 버튼 제거) */}
                        <div className="comment-image-gallery">
                          {files.filter(isImageFile).map((file) => {
                            const fileUrl = `http://localhost:8080/api/attach/${file.attachNo}`;
                            return (
                              <div key={file.attachNo} className="comment-image-card">
                                <img
                                  src={fileUrl}
                                  alt={file.attachName}
                                  className="comment-thumbnail-img"
                                  onClick={() => setPreviewModalUrl(fileUrl)}
                                  title="클릭하여 원본 보기"
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* 일반 문서 목록 (개별 삭제 버튼 제거, 다운로드 버튼 유지) */}
                        <div className="comment-doc-list">
                          {files.filter((f) => !isImageFile(f)).map((file) => (
                            <div key={file.attachNo} className="comment-file-chip">
                              <FileText size={13} className="file-icon" />
                              <span
                                className="file-link"
                                onClick={() => handleDownloadFile(file.attachNo)}
                                title="다운로드"
                              >
                                {file.attachName} ({(file.attachSize / 1024).toFixed(1)} KB)
                              </span>
                              <Download
                                size={13}
                                className="download-icon"
                                onClick={() => handleDownloadFile(file.attachNo)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {previewModalUrl && (
        <div className="image-preview-modal" onClick={() => setPreviewModalUrl(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src={previewModalUrl} alt="확대 보기" />
            <button type="button" className="btn-close-modal" onClick={() => setPreviewModalUrl(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}