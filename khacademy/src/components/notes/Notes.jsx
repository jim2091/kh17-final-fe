import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import { Plus, Search, FileText, Calendar, ArrowRight } from "lucide-react";
import "./Notes.css";

export default function Notes() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [noteList, setNoteList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("all");
  const [keyword, setKeyword] = useState("");

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.post(`/note/project/${projectNo}/list`, {
        lastNo: null,
        size: 50,
        type: searchType,
        keyword: keyword.trim()
      });
      setNoteList(res.data?.noteList || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [projectNo, searchType, keyword]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  return (
    <div className="notes-page-wrapper">
      {/* 상단 툴바 */}
      <div className="notes-top-header">
        <div className="notes-title-group">
          <h2>프로젝트 노트</h2>
          <p>회의록, 공유 문서 및 아이디어를 독립 문서로 기록하고 관리합니다.</p>
        </div>
        <button
          className="btn-notes-primary"
          onClick={() => navigate(`/projects/${projectNo}/note/insert`)}
        >
          <Plus size={16} /> 새 노트 작성
        </button>
      </div>

      {/* 검색 바 */}
      <div className="notes-search-box">
        <select
          className="notes-select-type"
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
        >
          <option value="all">전체 검색</option>
          <option value="title">제목</option>
          <option value="content">내용</option>
        </select>
        <div className="notes-search-input-wrap">
          <input
            type="text"
            className="notes-search-input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadList(); }}
            placeholder="노트 제목 또는 본문 검색..."
          />
          <button className="btn-notes-outline" onClick={loadList}>
            <Search size={14} /> 검색
          </button>
        </div>
      </div>

      {/* 카드 스택 목록 */}
      <div className="notes-cards-stack">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            노트를 불러오는 중...
          </div>
        ) : noteList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            등록된 노트가 없습니다.
          </div>
        ) : (
          noteList.map((n) => (
            <div
              key={n.noteNo}
              className="note-list-card"
              onClick={() => navigate(`/projects/${projectNo}/note/${n.noteNo}`)}
            >
              <div className="note-card-header">
                <span className="note-category-tag">#{n.noteCategory || "일반"}</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  ID #{n.noteNo}
                </span>
              </div>
              <h3 className="note-card-title">{n.noteTitle}</h3>
              <p className="note-card-preview">{n.noteContent}</p>
              <div className="note-card-footer">
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Calendar size={13} /> {n.noteCtime ? String(n.noteCtime).slice(0, 10) : "-"}
                </span>
                <span style={{ color: "#2563eb", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                  상세보기 <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}