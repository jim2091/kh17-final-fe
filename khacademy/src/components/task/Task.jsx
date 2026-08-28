import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import "./Task.css";

// 3단 컬럼 정의 (TODO, IN_PROGRESS, DONE)
const COLUMNS = [
  { id: "TODO", title: "📋 할 일 (To Do)", colorClass: "col-todo" },
  { id: "IN_PROGRESS", title: "⚡ 진행 중 (In Progress)", colorClass: "col-progress" },
  { id: "DONE", title: "✅ 완료 (Done)", colorClass: "col-done" }
];

export default function Task() {
  const { projectNo } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // DND 상태
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 드로어(Drawer) 상태
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // 1. 초기 업무 목록 조회
  useEffect(() => {
    if (projectNo) {
      fetchTasks(projectNo);
    }
  }, [projectNo]);

  const fetchTasks = async (pNo) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/task/list/${pNo}`);
      setTasks(res.data || []);
    } catch (error) {
      console.error("조회 실패:", error);
      toast.error("업무 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 2. 카드 클릭 시 상세 드로어 열기 (로컬 즉시 반영 + 서버 데이터 병합)
  const handleCardClick = async (taskNo) => {
    if (isDragging) return; // 드래그 중인 도중의 클릭만 방지

    // 1단계: 현재 로컬 tasks 배열에서 찾아 드로어를 즉시 열어 딜레이 방지
    const localTarget = tasks.find((t) => t.taskNo === taskNo);
    if (localTarget) {
      setSelectedTask(localTarget);
      setDrawerOpen(true);
    }

    // 2단계: 백엔드 단건 상세 API 호출로 최신 정보(협업자 목록 등) 가져오기
    try {
      setDrawerLoading(true);
      const res = await apiClient.get(`/task/${taskNo}`);
      if (res.data) {
        setSelectedTask(res.data);
      }
    } catch (error) {
      console.warn("단건 상세 API 호출 실패 (로컬 데이터 유지):", error);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedTask(null);
  };

  // 3. HTML5 Drag & Drop 핸들러
  const handleDragStart = (e, taskNo) => {
    setIsDragging(true);
    setDraggedTaskId(taskNo);
    e.dataTransfer.setData("text/plain", String(taskNo));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    // 드래그 종료 후 150ms 뒤에 클릭 가능 상태로 전환
    setTimeout(() => {
      setIsDragging(false);
      setDraggedTaskId(null);
    }, 150);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== columnId) setDragOverCol(columnId);
  };

  const handleDragLeave = (e, columnId) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverCol === columnId) setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);

    if (!draggedTaskId) {
      setIsDragging(false);
      return;
    }

    const targetTaskId = draggedTaskId;
    const targetTask = tasks.find((t) => t.taskNo === targetTaskId);

    // 드롭 즉시 드래그 상태 초기화 및 해제
    setDraggedTaskId(null);
    setTimeout(() => setIsDragging(false), 150);

    if (!targetTask || targetTask.taskStatus === targetStatus) return;

    // 1) 낙관적 업데이트: 기존 객체 필드 보존(...t)하며 상태만 변경
    const backupTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) =>
        t.taskNo === targetTaskId ? { ...t, taskStatus: targetStatus } : t
      )
    );

    // 2) 백엔드 DB UPDATE 요청 전송
    try {
      await apiClient.patch("/task/move", {
        taskNo: targetTaskId,
        targetStatus: targetStatus,
        projectNo: Number(projectNo)
      });
      toast.success(`[${targetStatus}] 상태로 이동되었습니다.`);
    } catch (error) {
      console.error("이동 실패:", error);
      toast.error("이동에 실패하여 복구합니다.");
      setTasks(backupTasks); // 실패 시 롤백
    }
  };

  // 우선순위 뱃지 클래스
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "긴급":
        return "badge-urgent";
      case "높음":
        return "badge-high";
      case "낮음":
        return "badge-low";
      default:
        return "badge-normal";
    }
  };

  // 상태 텍스트 변환
  const getStatusLabel = (status) => {
    switch (status) {
      case "TODO":
        return "할 일 (To Do)";
      case "IN_PROGRESS":
        return "진행 중 (In Progress)";
      case "DONE":
        return "완료 (Done)";
      default:
        return status;
    }
  };

  if (loading) return <div className="kanban-loading">칸반 보드를 불러오는 중...</div>;

  return (
    <div className="custom-kanban-page">
      <div className="kanban-title-bar">
        <h2>프로젝트 #{projectNo} 업무 보드</h2>
        <p>카드를 드래그하여 상태를 변경하고, 클릭하여 상세 내역을 열람하세요.</p>
      </div>

      {/* 3단 칸반 그리드 */}
      <div className="custom-kanban-board">
        {COLUMNS.map((col) => {
          const columnTasks = tasks.filter((t) => (t.taskStatus || "TODO") === col.id);
          const isOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              className={`kanban-column ${col.colorClass} ${isOver ? "drag-over" : ""}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="column-header">
                <span className="column-title">{col.title}</span>
                <span className="task-count-badge">{columnTasks.length}</span>
              </div>

              <div className="card-list-area">
                {columnTasks.length === 0 ? (
                  <div className="empty-dropzone">업무를 여기에 놓으세요</div>
                ) : (
                  columnTasks.map((task) => {
                    const isDraggingThis = draggedTaskId === task.taskNo;
                    const pClass = getPriorityBadge(task.taskPriority);

                    return (
                      <div
                        key={task.taskNo}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.taskNo)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleCardClick(task.taskNo)}
                        className={`direct-task-card ${pClass} ${
                          isDraggingThis ? "is-dragging" : ""
                        }`}
                      >
                        <div className="card-top-info">
                          <span className="category-tag">#{task.taskCategory || "일반"}</span>
                          <span className={`priority-tag ${pClass}`}>
                            {task.taskPriority || "보통"}
                          </span>
                        </div>

                        <div className="card-main-title">{task.taskTitle}</div>

                        <div className="card-progress-box">
                          <div className="progress-labels">
                            <span>진행률</span>
                            <span>{task.taskProgress || 0}%</span>
                          </div>
                          <div className="progress-track">
                            <div
                              className="progress-bar"
                              style={{ width: `${task.taskProgress || 0}%` }}
                            />
                          </div>
                        </div>

                        <div className="card-bottom-info">
                          <div className="assignee-info">
                            <div className="avatar-circle">
                              {(task.assignedMemberName || "미").slice(0, 1)}
                            </div>
                            <span>{task.assignedMemberName || "미배정"}</span>
                          </div>
                          <span className="due-date-text">
                            📅 {task.taskEnd ? String(task.taskEnd).slice(5, 10) : "-"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 우측 슬라이드 상세 정보 드로어 (Read-Only) */}
      <div className={`drawer-backdrop ${drawerOpen ? "open" : ""}`} onClick={handleCloseDrawer} />
      <aside className={`task-drawer ${drawerOpen ? "open" : ""}`}>
        {drawerLoading && !selectedTask ? (
          <div className="drawer-loading">상세 정보를 불러오는 중...</div>
        ) : selectedTask ? (
          <div className="drawer-container">
            {/* 드로어 헤더 */}
            <div className="drawer-header">
              <div className="drawer-header-left">
                <span className="task-id-badge">TASK #{selectedTask.taskNo}</span>
                <span className={`priority-tag ${getPriorityBadge(selectedTask.taskPriority)}`}>
                  {selectedTask.taskPriority || "보통"}
                </span>
                <span className="task-status-pill">
                  {getStatusLabel(selectedTask.taskStatus)}
                </span>
              </div>
              <button className="drawer-close-btn" onClick={handleCloseDrawer}>
                ✕
              </button>
            </div>

            {/* 드로어 본문: 상세 정보 열람 뷰 */}
            <div className="drawer-body view-mode">
              {/* 업무 제목 */}
              <div className="view-title-section">
                <span className="view-category-badge">#{selectedTask.taskCategory || "일반"}</span>
                <h3 className="view-task-title">{selectedTask.taskTitle}</h3>
              </div>

              {/* 주요 메타 정보 카드 그리드 */}
              <div className="view-meta-grid">
                <div className="meta-card-item">
                  <span className="meta-label">담당자</span>
                  <div className="meta-user-val">
                    <div className="avatar-circle small">
                      {(selectedTask.assignedMemberName || "미").slice(0, 1)}
                    </div>
                    <span className="meta-bold-val">
                      {selectedTask.assignedMemberName || "미배정"}
                    </span>
                    {selectedTask.assignedMemberDept && (
                      <span className="meta-sub-val">({selectedTask.assignedMemberDept})</span>
                    )}
                  </div>
                </div>

                <div className="meta-card-item">
                  <span className="meta-label">작성자</span>
                  <span className="meta-bold-val">
                    {selectedTask.taskWriterName || "등록 사원"}
                  </span>
                </div>

                <div className="meta-card-item">
                  <span className="meta-label">시작일자</span>
                  <span className="meta-text-val">
                    {selectedTask.taskStart ? String(selectedTask.taskStart).slice(0, 10) : "미정"}
                  </span>
                </div>

                <div className="meta-card-item">
                  <span className="meta-label">마감일자</span>
                  <span className="meta-text-val">
                    {selectedTask.taskEnd ? String(selectedTask.taskEnd).slice(0, 10) : "미정"}
                  </span>
                </div>
              </div>

              {/* 진척도 (Progress) 게이지 */}
              <div className="view-section">
                <div className="section-header-flex">
                  <span className="section-title">진행률 (Progress)</span>
                  <span className="section-highlight-val">{selectedTask.taskProgress || 0}%</span>
                </div>
                <div className="view-progress-track">
                  <div
                    className="view-progress-fill"
                    style={{ width: `${selectedTask.taskProgress || 0}%` }}
                  />
                </div>
              </div>

              {/* 지정된 협업자 목록 */}
              <div className="view-section">
                <span className="section-title">
                  함께하는 협업자 (
                  {selectedTask.collaborators ? selectedTask.collaborators.length : 0}명)
                </span>
                <div className="collab-tag-list">
                  {selectedTask.collaborators && selectedTask.collaborators.length > 0 ? (
                    selectedTask.collaborators.map((c, idx) => (
                      <div key={idx} className="collab-chip">
                        <span className="chip-icon">👤</span>
                        <span className="chip-name">{c.memberName || `멤버 #${c.projectMemberNo}`}</span>
                        {c.deptName && <span className="chip-dept">({c.deptName})</span>}
                      </div>
                    ))
                  ) : (
                    <span className="empty-hint-text">지정된 협업자가 없습니다.</span>
                  )}
                </div>
              </div>

              {/* 업무 상세 설명 본문 */}
              <div className="view-section">
                <span className="section-title">업무 세부 내용</span>
                <div className="view-content-box">
                  {selectedTask.taskContent || "등록된 상세 내용이 없습니다."}
                </div>
              </div>

              {/* 등록 및 수정 일시 */}
              <div className="view-timestamps">
                <span>등록일시: {selectedTask.taskCtime ? String(selectedTask.taskCtime).replace("T", " ").slice(0, 19) : "-"}</span>
                {selectedTask.taskUtime && (
                  <span>최종수정: {String(selectedTask.taskUtime).replace("T", " ").slice(0, 19)}</span>
                )}
              </div>
            </div>

            {/* 드로어 하단 닫기 푸터 */}
            <div className="drawer-footer">
              <button className="btn-cancel" onClick={handleCloseDrawer}>
                닫기
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}