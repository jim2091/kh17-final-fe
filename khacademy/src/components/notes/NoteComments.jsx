import React, { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Paperclip, Send, Edit2, Trash2, X, Download } from "lucide-react";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";

export default function NoteComments({ noteNo, projectNo }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // 인라인 수정 상태
  const [editingCommentNo, setEditingCommentNo] = useState(null);
  const [editInputContent, setEditInputContent] = useState("");

  const fileInputRef = useRef(null);

  // 로컬스토리지에서 로그인 사번 추출
  const getLoginEmpNo = () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (val && val.includes("empNo")) {
          const parsed = JSON.parse(val);
          if (parsed && parsed.empNo) return Number(parsed.empNo);
        }
      }
    } catch (e) {}
    return Number(localStorage.getItem("empNo") || sessionStorage.getItem("empNo") || 0);
  };

  const currentEmpNo = getLoginEmpNo();

  // 1. 댓글 및 댓글별 첨부파일 조회
  const loadComments = useCallback(async () => {
    if (!noteNo) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/note/comment/list/${noteNo}`);
      const list = Array.isArray(res.data) ? res.data : [];

      // 각 댓글에 달린 첨부파일 병렬 조회
      const listWithFiles = await Promise.all(
        list.map(async (c) => {
          try {
            const fRes = await apiClient.get(`/note/file/comment/${c.noteCommentNo}`);
            return { ...c, files: fRes.data || [] };
          } catch {
            return { ...c, files: [] };
          }
        })
      );
      setComments(listWithFiles);
    } catch (e) {
      console.error("댓글 조회 실패:", e);
      toast.error("댓글 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [noteNo]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // 2. 댓글 등록 (텍스트 등록 후 파일 있을 시 파일 업로드)
  const handleAddComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputContent.trim() && !selectedFile) return;

    try {
      let contentPayload = inputContent.trim();
      if (!contentPayload && selectedFile) {
        contentPayload = `[첨부파일] ${selectedFile.name}`;
      }

      // 댓글 본문 등록
      const res = await apiClient.post(`/note/comment/?projectNo=${projectNo || 0}`, {
        noteNo: Number(noteNo),
        noteCommentContent: contentPayload,
      });

      const newCommentNo = typeof res.data === "number" ? res.data : res.data?.noteCommentNo;

      // 댓글 첨부파일 업로드
      if (selectedFile && newCommentNo) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("projectNo", projectNo || 0);

        await apiClient.post(`/note/file/comment/${newCommentNo}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setInputContent("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("댓글이 등록되었습니다.");
      loadComments();
    } catch (e) {
      console.error("댓글 등록 실패:", e);
      toast.error("댓글 등록에 실패했습니다.");
    }
  };

  // 3. 댓글 삭제
  const handleDeleteComment = async (commentNo) => {
    if (!window.confirm("댓글을 삭제하시겠습니까? 첨부파일도 함께 삭제됩니다.")) return;
    try {
      await apiClient.delete(`/note/comment/${commentNo}`);
      toast.success("댓글이 삭제되었습니다.");
      loadComments();
    } catch (e) {
      toast.error("댓글 삭제 실패");
    }
  };

  // 4. 댓글 수정 저장
  const handleSaveEdit = async (commentNo) => {
    if (!editInputContent.trim()) return;
    try {
      await apiClient.put(`/note/comment/`, {
        noteCommentNo: commentNo,
        noteCommentContent: editInputContent.trim(),
      });
      setEditingCommentNo(null);
      setEditInputContent("");
      toast.success("댓글이 수정되었습니다.");
      loadComments();
    } catch (e) {
      toast.error("댓글 수정 실패");
    }
  };

  return (
    <div className="note-comments-section">
      <div className="comments-title">
        <MessageSquare size={16} /> 댓글 ({comments.length})
      </div>

      {/* 댓글 작성 폼 */}
      <form className="comment-form" onSubmit={handleAddComment}>
        <textarea
          className="comment-input"
          placeholder="노트에 대한 피드백이나 추가 자료를 남겨주세요..."
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          rows={2}
        />

        {selectedFile && (
          <div className="file-preview-tag">
            <Paperclip size={12} /> {selectedFile.name}
            <button type="button" onClick={() => setSelectedFile(null)}>
              <X size={12} />
            </button>
          </div>
        )}

        <div className="comment-form-footer">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
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

      {/* 댓글 목록 */}
      <div className="comments-list">
        {loading ? (
          <div className="comment-empty">댓글을 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="comment-empty">등록된 댓글이 없습니다.</div>
        ) : (
          comments.map((c) => {
            const commentEmpNo = Number(c.empNo || 0);
            const isMy = currentEmpNo > 0 && commentEmpNo === currentEmpNo;
            const isEdit = editingCommentNo === c.noteCommentNo;
            const author = c.empName || c.memberName || "사원";

            return (
              <div key={c.noteCommentNo} className="comment-bubble">
                <div className="comment-bubble-head">
                  <span className="author-name">{author}</span>
                  <span className="comment-date">
                    {c.noteCommentCtime ? String(c.noteCommentCtime).replace("T", " ").slice(0, 16) : ""}
                  </span>
                  {isMy && !isEdit && (
                    <div className="bubble-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentNo(c.noteCommentNo);
                          setEditInputContent(c.noteCommentContent);
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button type="button" onClick={() => handleDeleteComment(c.noteCommentNo)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {isEdit ? (
                  <div className="inline-edit">
                    <textarea
                      value={editInputContent}
                      onChange={(e) => setEditInputContent(e.target.value)}
                    />
                    <div className="inline-btns">
                      <button type="button" onClick={() => setEditingCommentNo(null)}>
                        취소
                      </button>
                      <button type="button" onClick={() => handleSaveEdit(c.noteCommentNo)}>
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bubble-text">{c.noteCommentContent}</div>
                )}

                {/* 댓글 첨부파일 목록 */}
                {c.files && c.files.length > 0 && (
                  <div className="comment-files-row">
                    {c.files.map((file) => (
                      <a
                        key={file.attachNo}
                        href={`/api/attach/download/${file.attachNo}`}
                        target="_blank"
                        rel="noreferrer"
                        className="comment-file-chip"
                      >
                        <Download size={11} /> {file.attachName}
                      </a>
                    ))}
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