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

  // 로그인 사번 추출
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

  // 이미지 파일 판별
  const isImageFile = (file) => {
    if (file.attachType && file.attachType.startsWith("image/")) return true;
    const name = file.attachName || "";
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);
  };

  // 확장자명 추출 및 전용 색상 배지 렌더러
  const renderFileTypeBadge = (file) => {
    const name = file.attachName || "";
    const rawExt = name.includes(".") ? name.split(".").pop().trim() : "FILE";
    const extUpper = rawExt.toUpperCase();
    const extLower = rawExt.toLowerCase();

    let bgColor = "#f1f5f9";
    let textColor = "#475569";

    if (["pdf"].includes(extLower)) {
      bgColor = "#fee2e2";
      textColor = "#dc2626";
    } else if (["doc", "docx", "hwp", "hwpx", "txt"].includes(extLower)) {
      bgColor = "#e0e7ff";
      textColor = "#4338ca";
    } else if (["xls", "xlsx", "csv"].includes(extLower)) {
      bgColor = "#dcfce7";
      textColor = "#15803d";
    } else if (["ppt", "pptx"].includes(extLower)) {
      bgColor = "#ffedd5";
      textColor = "#ea580c";
    } else if (["zip", "rar", "7z", "tar", "gz"].includes(extLower)) {
      bgColor = "#fef3c7";
      textColor = "#d97706";
    }

    return (
      <span
        style={{
          backgroundColor: bgColor,
          color: textColor,
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "10.5px",
          fontWeight: "bold",
          letterSpacing: "0.02em",
          flexShrink: 0
        }}
      >
        {extUpper}
      </span>
    );
  };

  // 파일 크기 포맷 변환
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // 각 댓글별 첨부파일 조회
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

  // 댓글 및 파일 등록
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

  // 수정 모드 진입
  const handleStartEdit = (comment) => {
    setEditingCommentNo(comment.taskCommentNo);
    setEditInputContent(comment.taskCommentContent === "(파일 첨부)" ? "" : comment.taskCommentContent);
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingCommentNo(null);
    setEditInputContent("");
  };

  // 수정 내용 서버 저장
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

  // 댓글 삭제
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

  // 파일 다운로드
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

      {/* 댓글 작성 폼 */}
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

      {/* 댓글 목록 */}
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
                    {/* 일반 텍스트 본문 */}
                    {comment.taskCommentContent && comment.taskCommentContent !== "(파일 첨부)" && (
                      <div style={{ fontSize: "13px", color: "#334155", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                        {comment.taskCommentContent}
                      </div>
                    )}

                    {/* 댓글 첨부파일 영역 */}
                    {files.length > 0 && (
                      <div className="comment-files-wrapper" style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {/* 1. 이미지 파일 썸네일 그리드 */}
                        {files.some(isImageFile) && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "6px" }}>
                            {files.filter(isImageFile).map((file) => {
                              const fileUrl = `http://localhost:8080/api/attach/${file.attachNo}`;
                              return (
                                <div
                                  key={file.attachNo}
                                  style={{
                                    position: "relative",
                                    borderRadius: "6px",
                                    overflow: "hidden",
                                    border: "1px solid #cbd5e1",
                                    aspectRatio: "1/1",
                                    backgroundColor: "#000"
                                  }}
                                >
                                  <img
                                    src={fileUrl}
                                    alt={file.attachName}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                                    onClick={() => setPreviewModalUrl(fileUrl)}
                                    title={`${file.attachName} (클릭하여 확대)`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadFile(file.attachNo)}
                                    style={{
                                      position: "absolute",
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      backgroundColor: "rgba(15, 23, 42, 0.65)",
                                      color: "#ffffff",
                                      border: "none",
                                      fontSize: "10px",
                                      padding: "3px 4px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Download size={11} style={{ marginRight: "2px" }} /> 다운로드
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. 일반 문서 파일 목록 (확장자 배지 + 다운로드 버튼) */}
                        {files.filter((f) => !isImageFile(f)).map((file) => (
                          <div
                            key={file.attachNo}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              backgroundColor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              padding: "6px 10px"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                              {renderFileTypeBadge(file)}
                              <span
                                style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                title={file.attachName}
                              >
                                {file.attachName}
                              </span>
                              <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                                ({formatFileSize(file.attachSize)})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDownloadFile(file.attachNo)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                padding: "3px 7px",
                                backgroundColor: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                fontSize: "10.5px",
                                fontWeight: "600",
                                color: "#334155",
                                cursor: "pointer"
                              }}
                            >
                              <Download size={11} /> 다운로드
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 이미지 확대 모달 */}
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