import React, { useState, useEffect, useCallback, useRef } from "react";
import DocxPreview from "../docx-preview/DocxPreview";
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
  Image as ImageIcon
} from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { apiClient } from "@utils/reaxios";
import "./NoteComments.css";

// 첨부파일 최대 허용 용량 (1MB)
const MAX_FILE_SIZE = 1 * 1024 * 1024;

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

  // 수정 상태 및 원본 내용 보관
  const [editingCommentNo, setEditingCommentNo] = useState(null);
  const [editInputContent, setEditInputContent] = useState("");
  const [originalEditContent, setOriginalEditContent] = useState("");

  // 워드 모달 및 이미지 원본 뷰어 상태
  const [previewDocx, setPreviewDocx] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // 프로젝트 멤버 번호 매핑
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

  // 댓글 목록 조회
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

  // 파일 선택 시 용량 검증 (toast.warn 알림)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      const currentMB = (file.size / (1024 * 1024)).toFixed(1);
      const limitMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);

      toast.warn(`첨부파일은 최대 ${limitMB}MB까지만 업로드할 수 있습니다. (선택: ${currentMB}MB)`);
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // 댓글 등록 제출 핸들러
  const handleAddComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputContent.trim() && !selectedFile) return;

    // 전송 직전 파일 용량 재검사
    if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
      toast.warn("용량을 초과한 파일은 등록할 수 없습니다. 파일을 다시 선택해 주세요.");
      return;
    }

    let createdCommentNo = null;

    try {
      const payloadContent = inputContent.trim() || `[첨부파일] ${selectedFile?.name}`;
      
      // 1단계: 댓글 텍스트 등록
      const res = await apiClient.post(`/note/comment/?projectNo=${projectNo || 0}`, {
        noteNo: Number(noteNo),
        noteCommentContent: payloadContent
      });

      createdCommentNo = typeof res.data === "number" ? res.data : res.data?.noteCommentNo;

      // 2단계: 파일 업로드
      if (selectedFile && createdCommentNo) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("projectNo", projectNo || 0);

        await apiClient.post(`/note/file/comment/${createdCommentNo}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setInputContent("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("댓글이 등록되었습니다.");
      fetchComments(true);
    } catch (error) {
      console.error("댓글 등록/파일 업로드 실패:", error);

      // 파일 업로드 실패 시 방금 등록된 빈 댓글 롤백 삭제
      if (createdCommentNo) {
        try {
          await apiClient.delete(`/note/comment/${createdCommentNo}`);
        } catch (delErr) {
          console.error("댓글 롤백 삭제 실패:", delErr);
        }
      }

      if (error.response?.status === 413) {
        toast.error("서버에서 허용하는 최대 파일 용량을 초과했습니다.");
      } else {
        toast.error("댓글 등록 또는 파일 업로드에 실패했습니다.");
      }
      fetchComments(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (inputContent.trim() || selectedFile) handleAddComment();
    }
  };

  // 수정 시작 및 취소
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

  // 수정 저장
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

  // 댓글 삭제 (삭제 확인 모달 유지)
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

      {/* 댓글 작성 폼 */}
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
            <span>
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
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
            onChange={handleFileChange}
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

      {/* 댓글 목록 */}
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

                {/* 첨부파일 칩 목록 */}
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

                          {/* 이미지 미리보기 버튼 */}
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

      {/* 사진 원본 미리보기 모달 */}
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

      {/* 공통 DocxPreview 컴포넌트 호출 */}
      {previewDocx && (
        <DocxPreview
          attachNo={previewDocx.attachNo}
          fileName={previewDocx.fileName}
          onClose={() => setPreviewDocx(null)}
        />
      )}
    </div>
  );
}