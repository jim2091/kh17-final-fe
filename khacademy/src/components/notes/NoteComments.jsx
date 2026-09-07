import React, { useState, useEffect, useCallback, useRef } from "react";
import { renderAsync } from "docx-preview";
import {
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  Check,
  X,
  Paperclip,
  Download,
  Eye,
  FileText,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { apiClient } from "@utils/reaxios";
import "./NoteComments.css";

// 이미지 파일 판별 헬퍼
const isImageFile = (fileName = "") => {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
};

export default function NoteComments({ noteNo, projectNo }) {
  // 스토리지 전수 검사로 실제 로그인 사번 및 이름 추출
  const getLoginUserInfo = () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (val && (val.includes("empNo") || val.includes("empName"))) {
          try {
            const parsed = JSON.parse(val);
            if (parsed && (parsed.empNo || parsed.empName)) {
              return {
                empNo: Number(parsed.empNo || parsed.memberNo || 0),
                empName: String(parsed.empName || "").trim()
              };
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    return {
      empNo: Number(localStorage.getItem("empNo") || sessionStorage.getItem("empNo") || 0),
      empName: String(localStorage.getItem("empName") || sessionStorage.getItem("empName") || "").trim()
    };
  };

  const { empNo: myEmpNo, empName: myEmpName } = getLoginUserInfo();
  const [myProjectMemberNo, setMyProjectMemberNo] = useState(0);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // 수정 상태 및 원본 내용 보관[cite: 1, 2]
  const [editingCommentNo, setEditingCommentNo] = useState(null);
  const [editInputContent, setEditInputContent] = useState("");
  const [originalEditContent, setOriginalEditContent] = useState("");

  // 워드 모달 및 이미지 미리보기 모달 상태
  const [previewDocx, setPreviewDocx] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState(null);
  const docxContainerRef = useRef(null);

  // 프로젝트 멤버 번호 매핑[cite: 1, 2]
  useEffect(() => {
    if (!projectNo || isNaN(Number(projectNo)) || myEmpNo === 0) return;

    const fetchMyMemberNo = async () => {
      try {
        const res = await apiClient.get(`/project/${projectNo}/member`);
        const members = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const me = members.find((m) => Number(m.empNo) === myEmpNo);
        if (me && me.projectMemberNo) {
          setMyProjectMemberNo(Number(me.projectMemberNo));
        }
      } catch (err) {
        console.warn("프로젝트 멤버 조회 실패:", err);
      }
    };

    fetchMyMemberNo();
  }, [projectNo, myEmpNo]);

  // 댓글 목록 조회[cite: 1, 2]
  const fetchComments = useCallback(async (isSilent = false) => {
    if (!noteNo || isNaN(Number(noteNo))) {
      setLoading(false);
      return;
    }

    try {
      if (!isSilent) setLoading(true);
      const res = await apiClient.get(`/note/comment/list/${noteNo}`);
      const commentList = Array.isArray(res.data) ? res.data : (res.data?.data || []);

      const listWithFiles = await Promise.all(
        commentList.map(async (c) => {
          try {
            const f = await apiClient.get(`/note/file/comment/${c.noteCommentNo}`);
            return { ...c, files: f.data || [] };
          } catch {
            return { ...c, files: [] };
          }
        })
      );
      setComments(listWithFiles);
    } catch (error) {
      console.error("노트 댓글 목록 조회 실패:", error);
      if (!isSilent) toast.error("댓글을 불러오지 못했습니다.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [noteNo]);

  useEffect(() => {
    fetchComments(false);
    setEditingCommentNo(null);
    setInputContent("");
    setSelectedFile(null);
  }, [noteNo, fetchComments]);

  // 워드 뷰어 렌더링
  useEffect(() => {
    if (!previewDocx) return;
    let isSubscribed = true;

    const renderDocxOnline = async () => {
      try {
        setViewerLoading(true);
        setViewerError(null);
        const res = await apiClient.get(`/attach/${previewDocx.attachNo}`, {
          responseType: "arraybuffer"
        });

        if (!isSubscribed) return;

        if (docxContainerRef.current) {
          docxContainerRef.current.innerHTML = "";
          await renderAsync(res.data, docxContainerRef.current, null, {
            className: "docx-doc-page",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true
          });
        }
      } catch (err) {
        console.error("워드 문서 렌더링 실패:", err);
        if (isSubscribed) {
          setViewerError("워드 문서 양식을 웹 화면으로 불러오지 못했습니다.");
        }
      } finally {
        if (isSubscribed) setViewerLoading(false);
      }
    };

    renderDocxOnline();
    return () => { isSubscribed = false; };
  }, [previewDocx]);

  // 댓글 등록[cite: 1, 2]
  const handleAddComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputContent.trim() && !selectedFile) return;

    try {
      const payloadContent = inputContent.trim() || `[첨부파일] ${selectedFile?.name}`;
      const res = await apiClient.post(`/note/comment/?projectNo=${projectNo || 0}`, {
        noteNo: Number(noteNo),
        noteCommentContent: payloadContent
      });

      const newCommentNo = typeof res.data === "number" ? res.data : res.data?.noteCommentNo;

      if (selectedFile && newCommentNo) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("projectNo", projectNo || 0);

        await apiClient.post(`/note/file/comment/${newCommentNo}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setInputContent("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("댓글이 등록되었습니다.");
      fetchComments(true);
    } catch (error) {
      console.error("댓글 등록 실패:", error);
      toast.error("댓글 등록에 실패했습니다.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputContent.trim() || selectedFile) handleAddComment();
    }
  };

  // 수정 시작 및 취소[cite: 1, 2]
  const handleStartEdit = (comment) => {
    setEditingCommentNo(comment.noteCommentNo);
    setEditInputContent(comment.noteCommentContent || "");
    setOriginalEditContent(comment.noteCommentContent || "");
  };

  const handleCancelEdit = () => {
    setEditingCommentNo(null);
    setEditInputContent("");
    setOriginalEditContent("");
  };

  // 수정 저장[cite: 1, 2]
  const handleSaveEdit = async (commentNo) => {
    if (!editInputContent.trim()) return;

    try {
      await apiClient.put("/note/comment/", {
        noteCommentNo: Number(commentNo),
        noteNo: Number(noteNo),
        noteCommentContent: editInputContent.trim()
      });
      setEditingCommentNo(null);
      setEditInputContent("");
      setOriginalEditContent("");
      toast.success("댓글이 수정되었습니다.");
      fetchComments(true);
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      toast.error("댓글 수정에 실패했습니다.");
    }
  };

  // 댓글 삭제[cite: 1, 2]
  const handleDeleteComment = async (commentNo) => {
    const result = await Swal.fire({
      title: "댓글 삭제",
      text: "댓글을 삭제하시겠습니까?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "삭제",
      cancelButtonText: "취소"
    });

    if (!result.isConfirmed) return;

    try {
      await apiClient.delete(`/note/comment/${commentNo}`);
      toast.success("댓글이 삭제되었습니다.");
      fetchComments(true);
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
      toast.error("댓글 삭제에 실패했습니다.");
    }
  };

  // 첨부파일 다운로드
  const handleDownloadFile = async (attachNo, attachName) => {
    try {
      const res = await apiClient.get(`/attach/${attachNo}`, {
        responseType: "blob"
      });
      const blob = new Blob([res.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", attachName || `file_${attachNo}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("다운로드 실패:", err);
      toast.error("파일 다운로드에 실패했습니다.");
    }
  };

  return (
    <div className="note-comments-section">
      <div className="comments-title">
        <MessageSquare size={16} />
        <span>댓글 ({comments.length})</span>
      </div>

      {/* 등록 폼[cite: 1, 2] */}
      <form className="comment-form" onSubmit={handleAddComment}>
        <textarea
          className="comment-input"
          rows="2"
          placeholder="노트에 대한 피드백이나 의견을 남겨주세요... (Enter: 등록, Shift+Enter: 줄바꿈)"
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {selectedFile && (
          <div className="file-preview-tag">
            <Paperclip size={12} />
            <span>{selectedFile.name}</span>
            <button
              type="button"
              className="btn-remove-file"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="comment-form-footer">
          <input
            type="file"
            ref={fileInputRef}
            className="file-hidden-input"
            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
          />
          <button
            type="button"
            className="btn-attach"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={14} /> 파일 첨부
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={!inputContent.trim() && !selectedFile}
          >
            <Send size={13} /> 등록
          </button>
        </div>
      </form>

      {/* 댓글 목록[cite: 1, 2] */}
      <div className="comments-list">
        {loading ? (
          <div className="comment-empty">댓글을 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">등록된 댓글이 없습니다.</div>
        ) : (
          comments.map((comment) => {
            const commentMemberNo = Number(comment.projectMemberNo || 0);
            const commentEmpNo = Number(comment.empNo || comment.writerEmpNo || 0);
            const author = String(comment.empName || comment.writerName || comment.memberName || "").trim();

            const isMemberMatch = myProjectMemberNo > 0 && commentMemberNo > 0 && myProjectMemberNo === commentMemberNo;
            const isEmpMatch = myEmpNo > 0 && commentEmpNo > 0 && myEmpNo === commentEmpNo;
            const isNameMatch = Boolean(myEmpName && author && myEmpName === author);

            const isMyComment = isMemberMatch || isEmpMatch || isNameMatch;
            const isEditing = editingCommentNo === comment.noteCommentNo;

            // 수정 시 내용 변경 여부 확인 (전과 같거나 공백이면 비활성화)[cite: 1, 2]
            const isSaveDisabled =
              !editInputContent.trim() || editInputContent.trim() === originalEditContent.trim();

            return (
              <div key={comment.noteCommentNo} className="comment-bubble">
                <div className="comment-bubble-head">
                  <div className="comment-author-info">
                    <span className="author-name">{author || myEmpName || "사원"}</span>
                    <span className="comment-date">
                      {comment.noteCommentCtime
                        ? String(comment.noteCommentCtime).replace("T", " ").slice(0, 16)
                        : ""}
                    </span>
                    {/* 댓글 utime이 존재할 때 수정됨 태그 노출 */}
                    {comment.noteCommentUtime && (
                      <span className="comment-edited-tag">(수정됨)</span>
                    )}
                  </div>

                  {isMyComment && !isEditing && (
                    <div className="bubble-actions">
                      <button
                        type="button"
                        className="btn-action-icon"
                        onClick={() => handleStartEdit(comment)}
                        title="수정"
                      >
                        <Edit2 size={12} />
                        <span>수정</span>
                      </button>
                      <button
                        type="button"
                        className="btn-action-icon btn-danger"
                        onClick={() => handleDeleteComment(comment.noteCommentNo)}
                        title="삭제"
                      >
                        <Trash2 size={12} />
                        <span>삭제</span>
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="inline-edit">
                    <textarea
                      className="comment-input edit"
                      value={editInputContent}
                      onChange={(e) => setEditInputContent(e.target.value)}
                      rows={2}
                      autoFocus
                    />
                    <div className="inline-btns">
                      <button type="button" className="btn-edit-cancel" onClick={handleCancelEdit}>
                        <X size={12} /> 취소
                      </button>
                      <button
                        type="button"
                        className="btn-edit-save"
                        onClick={() => handleSaveEdit(comment.noteCommentNo)}
                        disabled={isSaveDisabled}
                      >
                        <Check size={12} /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bubble-text">{comment.noteCommentContent}</div>
                )}

                {/* 첨부파일 칩 목록 및 사진/워드 미리보기 버튼[cite: 1] */}
                {comment.files && comment.files.length > 0 && (
                  <div className="comment-files-row">
                    {comment.files.map((file) => {
                      const isDocx = file.attachName?.toLowerCase().endsWith(".docx");
                      const isImg = isImageFile(file.attachName);

                      return (
                        <div key={file.attachNo} className="comment-file-chip">
                          <Paperclip size={11} />
                          <span
                            className="comment-file-name"
                            onClick={() => handleDownloadFile(file.attachNo, file.attachName)}
                          >
                            {file.attachName}
                          </span>

                          {/* 이미지 파일 미리보기 버튼[cite: 1] */}
                          {isImg && (
                            <button
                              type="button"
                              className="btn-img-tag"
                              onClick={() => setPreviewImage({ attachNo: file.attachNo, fileName: file.attachName })}
                              title="사진 크게 보기"
                            >
                              <ImageIcon size={10} /> 미리보기
                            </button>
                          )}

                          {/* 워드 파일 양식 보기 버튼 */}
                          {isDocx && (
                            <button
                              type="button"
                              className="btn-docx-tag"
                              onClick={() => setPreviewDocx({ attachNo: file.attachNo, fileName: file.attachName })}
                              title="브라우저에서 워드 양식 열기"
                            >
                              <Eye size={10} /> 양식
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn-icon-dl"
                            onClick={() => handleDownloadFile(file.attachNo, file.attachName)}
                            title="다운로드"
                          >
                            <Download size={11} color="#64748b" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 사진 원본 미리보기 모달[cite: 1] */}
      {previewImage && (
        <div className="notes-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="notes-image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="notes-modal-header image-modal-header">
              <span className="modal-filename">{previewImage.fileName}</span>
              <div className="modal-actions-right">
                <button
                  type="button"
                  className="btn-submit modal-dl-btn"
                  onClick={() => handleDownloadFile(previewImage.attachNo, previewImage.fileName)}
                >
                  <Download size={13} /> 다운로드
                </button>
                <button type="button" className="btn-modal-close" onClick={() => setPreviewImage(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="image-render-viewport">
              <img
                src={`http://localhost:8080/api/attach/${previewImage.attachNo}`}
                alt={previewImage.fileName}
                className="modal-full-img"
              />
            </div>
          </div>
        </div>
      )}

      {/* 워드 뷰어 모달 */}
      {previewDocx && (
        <div className="notes-modal-backdrop" onClick={() => setPreviewDocx(null)}>
          <div className="notes-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="notes-modal-header">
              <div className="modal-title-left">
                <FileText size={18} color="#60a5fa" />
                <span className="modal-filename">{previewDocx.fileName}</span>
                <span className="modal-view-badge">댓글 양식 뷰어</span>
              </div>

              <div className="modal-actions-right">
                <button
                  type="button"
                  className="btn-submit modal-dl-btn"
                  onClick={() => handleDownloadFile(previewDocx.attachNo, previewDocx.fileName)}
                >
                  <Download size={13} /> 다운로드
                </button>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setPreviewDocx(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="notes-modal-body">
              {viewerLoading && (
                <div className="modal-state-msg">
                  <Loader2 size={20} className="animate-spin" />
                  <span>문서 양식을 변환 중입니다...</span>
                </div>
              )}

              {viewerError && (
                <div className="modal-state-msg error">{viewerError}</div>
              )}

              <div
                ref={docxContainerRef}
                className={`docx-render-container ${viewerLoading || viewerError ? "hidden" : ""}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}