import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import {
  List,
  FileText,
  LayoutGrid,
  AlignLeft,
  Search,
  Plus,
  Calendar
} from "lucide-react";
import { toast } from "react-toastify";
import "./Notes.css";

// 1. 이미지 파일 판별 헬퍼
const isImageFile = (fileName = "") => {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName || "");
};

// 2. 문서 파일 판별 헬퍼 (워드, 한글, PDF, 엑셀, PPT, 텍스트 등 전체 지원)
const isDocFile = (fileName = "") => {
  return /\.(docx|doc|hwp|hwpx|pdf|xlsx|xls|pptx|ppt|txt|log|csv|md)$/i.test(fileName || "");
};

export default function Notes() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");

  // 필터 모드: 'ALL'(전체글) | 'DOC'(문서 파일 첨부글) | 'IMAGE'(사진 첨부글) | 'TEXT'(첨부파일 없는 일반글)
  const [fileFilter, setFileFilter] = useState("ALL");

  // 본문 20자 이상일 때 10자 말줄임 처리
  const truncateContent = (content) => {
    if (!content) return "내용이 없습니다.";
    if (content.length >= 20) {
      return content.slice(0, 10) + "...";
    }
    return content;
  };

  // 노트 목록 및 파일 정보 조회
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);

      const res = await apiClient.post(`/note/project/${projectNo}/list`, {
        lastNo: null,
        size: 100,
        type: "all",
        keyword: ""
      });

      const noteList = res.data?.noteList || (Array.isArray(res.data) ? res.data : []);

      const notesWithFiles = await Promise.all(
        noteList.map(async (n) => {
          try {
            const fRes = await apiClient.get(`/note/file/${n.noteNo}`);
            return { ...n, files: fRes.data || [] };
          } catch {
            return { ...n, files: [] };
          }
        })
      );

      setNotes(notesWithFiles);
    } catch (err) {
      console.error("노트 목록 로딩 실패:", err);
      toast.error("노트 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [projectNo]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // 검색어 및 첨부파일 조건 필터링
  const filteredNotes = notes.filter((note) => {
    // 1. 검색어 필터링 (제목 및 본문)
    const matchesKeyword =
      (note.noteTitle || "").toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (note.noteContent || "").toLowerCase().includes(searchKeyword.toLowerCase());

    if (!matchesKeyword) return false;

    const files = note.files || [];

    // 2. 문서 첨부글 필터 (워드, 한글, PDF, 엑셀 등 문서가 1개 이상 포함된 글)
    if (fileFilter === "DOC") {
      return files.some((f) => isDocFile(f.attachName));
    }

    // 3. 사진 첨부글 필터 (이미지가 1개 이상 포함된 글)
    if (fileFilter === "IMAGE") {
      return files.some((f) => isImageFile(f.attachName));
    }

    // 4. 일반 글 필터 (첨부파일이 하나도 없는 순수 텍스트 글)
    if (fileFilter === "TEXT") {
      return files.length === 0;
    }

    // 'ALL'은 전체 통과
    return true;
  });

  return (
    <div className="notes-page-wrapper">
      {/* 상단 헤더 */}
      <div className="notes-top-header">
        <div>
          <h2 className="notes-title">프로젝트 노트</h2>
          <p className="notes-subtitle">회의록, 아이디어 및 문서를 공유하고 관리하세요.</p>
        </div>
        <button
          type="button"
          className="btn-notes-primary"
          onClick={() => navigate(`/projects/${projectNo}/note/insert`)}
        >
          <Plus size={16} /> 새 노트 작성
        </button>
      </div>

      {/* 필터 탭 & 검색창 */}
      <div className="notes-search-bar-wrap">
        <div className="notes-icon-filter-group">
          <button
            type="button"
            className={`btn-icon-filter ${fileFilter === "ALL" ? "active" : ""}`}
            onClick={() => setFileFilter("ALL")}
            title="전체 노트"
          >
            <List size={18} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className={`btn-icon-filter ${fileFilter === "DOC" ? "active" : ""}`}
            onClick={() => setFileFilter("DOC")}
            title="문서(워드/한글/PDF) 첨부글"
          >
            <FileText size={17} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className={`btn-icon-filter ${fileFilter === "IMAGE" ? "active" : ""}`}
            onClick={() => setFileFilter("IMAGE")}
            title="사진/이미지 첨부글"
          >
            <LayoutGrid size={17} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className={`btn-icon-filter ${fileFilter === "TEXT" ? "active" : ""}`}
            onClick={() => setFileFilter("TEXT")}
            title="일반 글 (첨부파일 없음)"
          >
            <AlignLeft size={17} strokeWidth={2.2} />
          </button>
        </div>

        <div className="notes-search-input-box">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="노트 제목, 본문 검색..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* 노트 카드 리스트 */}
      {loading ? (
        <div className="notes-empty">노트를 불러오는 중...</div>
      ) : filteredNotes.length === 0 ? (
        <div className="notes-empty">조건에 해당하는 노트가 없습니다.</div>
      ) : (
        <div className="notes-card-grid">
          {filteredNotes.map((note) => {
            const firstImg = (note.files || []).find((f) => isImageFile(f.attachName));

            return (
              <div
                key={note.noteNo}
                className="note-card-item"
                onClick={() => navigate(`/projects/${projectNo}/note/${note.noteNo}`)}
              >
                <div className="note-card-top">
                  <span className="note-category-tag">#{note.noteCategory || "일반"}</span>
                  {note.noteUtime && <span className="note-list-edited-badge">수정됨</span>}
                </div>

                {/* 썸네일 영역 (이미지 로드 실패 시 깨진 이미지 아이콘 방어) */}
                {firstImg && (
                  <div className="note-card-thumb-wrap">
                    <img
                      src={`http://localhost:8080/api/attach/${firstImg.attachNo}`}
                      alt={firstImg.attachName}
                      className="note-card-thumb-img"
                      onError={(e) => {
                        e.currentTarget.parentElement.style.display = "none";
                      }}
                    />
                  </div>
                )}

                <h3 className="note-card-title">{note.noteTitle}</h3>

                {/* 20자 이상 10자 말줄임 본문 */}
                <p className="note-card-preview">{truncateContent(note.noteContent)}</p>

                <div className="note-card-footer">
                  <span className="note-card-author">{note.empName || "사원"}</span>
                  <span className="note-card-date">
                    <Calendar size={12} />
                    {note.noteUtime
                      ? `수정 ${String(note.noteUtime).slice(0, 10)}`
                      : note.noteCtime
                      ? String(note.noteCtime).slice(0, 10)
                      : "-"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}