import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import { ArrowLeft, Edit3, Trash2, Paperclip, Download, MessageSquare, Send, X, FileText } from "lucide-react";
import "./Notes.css";

export default function NoteDetail() {
  const { projectNo, noteNo } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [files, setFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentFile, setCommentFile] = useState(null);
  const fileInputRef = React.useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [noteRes, fileRes, commRes] = await Promise.all([
        apiClient.get(`/note/${noteNo}`),
        apiClient.get(`/note/file/list/${noteNo}`),
        apiClient.get(`/note/comment/list/${noteNo}`)
      ]);
      setNote(noteRes.data);
      setFiles(fileRes.data || []);

      const commList = commRes.data || [];
      const withFiles = await Promise.all(
        commList.map(async (c) => {
          try {
            const f = await apiClient.get(`/note/file/comment/${c.noteCommentNo}`);
            return { ...c, files: f.data || [] };
          } catch {
            return { ...c, files: [] };
          }
        })
      );
      setComments(withFiles);
    } catch (e) {
      console.error(e);
    }
  }, [noteNo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteNote = async () => {
    if (!window.confirm("노트를 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/note/${noteNo}`);
      navigate(`/projects/${projectNo}/note`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && !commentFile) return;

    try {
      const res = await apiClient.post(`/note/comment/?projectNo=${projectNo}`, {
        noteNo: Number(noteNo),
        noteCommentContent: commentText.trim() || `[첨부파일] ${commentFile?.name}`
      });
      const newCommentNo = typeof res.data === "number" ? res.data : res.data?.noteCommentNo;

      if (commentFile && newCommentNo) {
        const formData = new FormData();
        formData.append("file", commentFile);
        formData.append("projectNo", projectNo);
        await apiClient.post(`/note/file/comment/${newCommentNo}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }

      setCommentText("");
      setCommentFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteComment = async (commentNo) => {
    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      await apiClient.delete(`/note/comment/${commentNo}`);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!note) return <div className="notes-page-wrapper">노트를 불러오는 중...</div>;

  return (
    <div className="notes-page-wrapper">
      {/* 상단 액션 바 */}
      <div className="notes-top-header">
        <button className="btn-notes-outline" onClick={() => navigate(`/projects/${projectNo}/note`)}>
          <ArrowLeft size={15} /> 목록으로
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-notes-outline"
            onClick={() => navigate(`/projects/${projectNo}/note/${noteNo}/edit`)}
          >
            <Edit3 size={14} /> 수정
          </button>
          <button className="btn-notes-danger" onClick={handleDeleteNote}>
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      </div>

      {/* 본체 상세 카드 */}
      <div className="note-detail-box">
        <div className="note-detail-header">
          <div>
            <span className="note-category-tag">#{note.noteCategory || "일반"}</span>
            <h1 className="note-detail-title">{note.noteTitle}</h1>
          </div>
        </div>

        <div className="note-detail-meta">
          <span>작성일: {note.noteCtime ? String(note.noteCtime).slice(0, 10) : "-"}</span>
          <span>문서번호: #{note.noteNo}</span>
        </div>

        {/* 본문 첨부파일 목록 */}
        {files.length > 0 && (
          <div className="note-files-card">
            <div className="note-files-card-title"><FileText size={15} /> 첨부된 문서 ({files.length})</div>
            <div className="attached-chips-row">
              {files.map((f) => (
                <a
                  key={f.attachNo}
                  href={`/api/attach/download/${f.attachNo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="attached-chip"
                  style={{ textDecoration: "none" }}
                >
                  <Download size={12} /> {f.attachName} ({(f.attachSize / 1024).toFixed(1)} KB)
                </a>
              ))}
            </div>
          </div>
        )}

        {/* 본문 내용 */}
        <div className="note-detail-content">
          {note.noteContent}
        </div>
      </div>

      {/* 댓글 영역 */}
      <div className="note-comments-container">
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <MessageSquare size={16} /> 댓글 ({comments.length})
        </div>

        {/* 댓글 작성창 */}
        <form onSubmit={handleAddComment} className="comment-input-box">
          <textarea
            rows={2}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="피드백이나 의견을 남겨주세요..."
          />

          {commentFile && (
            <div className="attached-chip" style={{ alignSelf: "flex-start" }}>
              <Paperclip size={12} /> {commentFile.name}
              <button type="button" onClick={() => setCommentFile(null)}><X size={12} /></button>
            </div>
          )}

          <div className="comment-input-actions">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={(e) => setCommentFile(e.target.files[0] || null)}
            />
            <button
              type="button"
              className="btn-notes-outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={13} /> 파일 첨부
            </button>
            <button type="submit" className="btn-notes-primary" disabled={!commentText.trim() && !commentFile}>
              <Send size={13} /> 등록
            </button>
          </div>
        </form>

        {/* 댓글 목록 */}
        <div>
          {comments.map((c) => (
            <div key={c.noteCommentNo} className="comment-bubble-item">
              <div className="comment-user-row">
                <span className="comment-user-name">{c.empName || c.memberName || "사원"}</span>
                <button
                  className="btn-notes-outline"
                  style={{ padding: "2px 6px", fontSize: 11 }}
                  onClick={() => handleDeleteComment(c.noteCommentNo)}
                >
                  삭제
                </button>
              </div>
              <div className="comment-text-body">{c.noteCommentContent}</div>

              {c.files && c.files.length > 0 && (
                <div className="attached-chips-row" style={{ marginTop: 6 }}>
                  {c.files.map((f) => (
                    <a
                      key={f.attachNo}
                      href={`/api/attach/download/${f.attachNo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="attached-chip"
                      style={{ fontSize: 11, textDecoration: "none" }}
                    >
                      <Download size={11} /> {f.attachName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}