import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import "./Task.css";
import TaskComments from "./TaskComments";

const COLUMNS = [
  { id: "TODO", title: "To Do", colorClass: "col-todo" },
  { id: "IN_PROGRESS", title: "In Progress", colorClass: "col-progress" },
  { id: "DONE", title: "Done", colorClass: "col-done" }
];

export default function Task() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // 프로젝트 전체 멤버 목록 (담당자/협업자 선택용)
  const [projectMembers, setProjectMembers] = useState([]);

  // DND 상태
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 드로어(Drawer) 상태
  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // 수정 모드 토글 및 폼 상태
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    taskTitle: "",
    taskContent: "",
    assignedMemberNo: "",
    taskStatus: "TODO",
    taskPriority: "보통",
    taskCategory: "",
    taskProgress: 0,
    taskStart: "",
    taskEnd: ""
  });
  const [editCollaborators, setEditCollaborators] = useState([]);
  const [updating, setUpdating] = useState(false);

  // 1. 초기 업무 목록 & 프로젝트 멤버 목록 조회
  useEffect(() => {
    if (projectNo) {
      fetchTasks(projectNo);
      fetchProjectMembers(projectNo);
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

  const fetchProjectMembers = async (pNo) => {
    try {
      const res = await apiClient.get(`/projects/${pNo}/members`);
      setProjectMembers(res.data || []);
    } catch (error) {
      console.warn("프로젝트 멤버 목록 로딩 실패:", error);
    }
  };

  // 2. 카드 클릭 시 상세 드로어 열기
  const handleCardClick = async (taskNo) => {
    if (isDragging) return;

    setIsEditing(false); // 새로 열릴 때는 항상 열람 모드

    // 로컬 데이터 선반영
    const localTarget = tasks.find((t) => t.taskNo === taskNo);
    if (localTarget) {
      setSelectedTask(localTarget);
      setDrawerOpen(true);
    }

    // 서버 단건 상세 비동기 조회
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
    setIsEditing(false);
  };

  // 수정 모드로 전환
  const handleStartEdit = () => {
    if (!selectedTask) return;

    setEditFormData({
      taskTitle: selectedTask.taskTitle || "",
      taskContent: selectedTask.taskContent || "",
      assignedMemberNo: selectedTask.assignedMemberNo || "",
      taskStatus: selectedTask.taskStatus || "TODO",
      taskPriority: selectedTask.taskPriority || "보통",
      taskCategory: selectedTask.taskCategory || "",
      taskProgress: selectedTask.taskProgress || 0,
      taskStart: selectedTask.taskStart ? String(selectedTask.taskStart).slice(0, 10) : "",
      taskEnd: selectedTask.taskEnd ? String(selectedTask.taskEnd).slice(0, 10) : ""
    });

    const existingCollabNos = (selectedTask.collaborators || []).map(
      (c) => c.projectMemberNo
    );
    setEditCollaborators(existingCollabNos);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCollabToggle = (memberNo) => {
    setEditCollaborators((prev) =>
      prev.includes(memberNo)
        ? prev.filter((id) => id !== memberNo)
        : [...prev, memberNo]
    );
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (!editFormData.taskTitle.trim()) {
      toast.warn("업무 제목은 필수 입력 항목입니다.");
      return;
    }

    if (editFormData.taskStart && editFormData.taskEnd && editFormData.taskStart > editFormData.taskEnd) {
      toast.warn("마감일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    const payload = {
      taskNo: selectedTask.taskNo,
      projectNo: Number(projectNo),
      taskTitle: editFormData.taskTitle.trim(),
      taskContent: editFormData.taskContent ? editFormData.taskContent.trim() : null,
      assignedMemberNo:
        editFormData.assignedMemberNo && Number(editFormData.assignedMemberNo) > 0
          ? Number(editFormData.assignedMemberNo)
          : null,
      taskStatus: editFormData.taskStatus || "TODO",
      taskPriority: editFormData.taskPriority || "보통",
      taskCategory: editFormData.taskCategory ? editFormData.taskCategory.trim() : null,
      taskProgress: Number(editFormData.taskProgress) || 0,
      taskStart: editFormData.taskStart ? `${editFormData.taskStart} 00:00:00` : null,
      taskEnd: editFormData.taskEnd ? `${editFormData.taskEnd} 23:59:59` : null,
      collaboratorMemberNos: editCollaborators
    };

    try {
      setUpdating(true);
      await apiClient.put("/task/", payload);
      toast.success("업무 내용이 성공적으로 수정되었습니다.");

      // 단건 상세 및 보드 목록 최신화
      const detailRes = await apiClient.get(`/task/${selectedTask.taskNo}`);
      if (detailRes.data) {
        setSelectedTask(detailRes.data);
      }
      fetchTasks(projectNo);
      setIsEditing(false);
    } catch (error) {
      console.error("업무 수정 실패:", error);
      toast.error("업무 수정에 실패했습니다.");
    } finally {
      setUpdating(false);
    }
  };

  // 3. Drag & Drop 핸들러
  const handleDragStart = (e, taskNo) => {
    setIsDragging(true);
    setDraggedTaskId(taskNo);
    e.dataTransfer.setData("text/plain", String(taskNo));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
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

    setDraggedTaskId(null);
    setTimeout(() => setIsDragging(false), 150);

    if (!targetTask || targetTask.taskStatus === targetStatus) return;

    const backupTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) =>
        t.taskNo === targetTaskId ? { ...t, taskStatus: targetStatus } : t
      )
    );

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
      setTasks(backupTasks);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "긴급": return "badge-urgent";
      case "높음": return "badge-high";
      case "낮음": return "badge-low";
      default: return "badge-normal";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "TODO": return "할 일 (To Do)";
      case "IN_PROGRESS": return "진행 중 (In Progress)";
      case "DONE": return "완료 (Done)";
      default: return status;
    }
  };

  if (loading) return <div className="kanban-loading">칸반 보드를 불러오는 중...</div>;

  return (
    <div className="custom-kanban-page">
      {/* 상단 헤더 */}
      <div className="kanban-title-bar">
        <div className="kanban-title-text">
          <h2>프로젝트 #{projectNo} 업무 보드</h2>
          <p>카드를 드래그하여 상태를 변경하고, 클릭하여 상세 내역을 열람하세요.</p>
        </div>

        <button
          type="button"
          className="btn-create-task"
          onClick={() => navigate(`/projects/${projectNo}/taskInsert`)}
        >
          <span className="plus-icon">+</span> 새 업무 등록
        </button>
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
                        className={`direct-task-card ${pClass} ${isDraggingThis ? "is-dragging" : ""
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
                            <span>{task.assignedMemberName || "미배정"}</span>
                          </div>
                          <span className="due-date-text">
                            (대충달력){task.taskEnd ? String(task.taskEnd).slice(5, 10) : "-"}
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

      {/* 우측 슬라이드 드로어 */}
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
                {!isEditing && (
                  <>
                    <span className={`priority-tag ${getPriorityBadge(selectedTask.taskPriority)}`}>
                      {selectedTask.taskPriority || "보통"}
                    </span>
                    <span className="task-status-pill">
                      {getStatusLabel(selectedTask.taskStatus)}
                    </span>
                  </>
                )}
                {isEditing && <span className="editing-badge">편집 중</span>}
              </div>
              <button className="drawer-close-btn" onClick={handleCloseDrawer}>
                ✕
              </button>
            </div>

            {/* ========================================================
                [MODE 1] 열람 모드 (View Mode)
               ======================================================== */}
            {!isEditing && (
              <>
                <div className="drawer-body view-mode">
                  <div className="view-title-section">
                    <span className="view-category-badge">#{selectedTask.taskCategory || "일반"}</span>
                    <h3 className="view-task-title">{selectedTask.taskTitle}</h3>
                  </div>

                  <div className="view-meta-grid">
                    <div className="meta-card-item">
                      <span className="meta-label">담당자</span>
                      <div className="meta-user-val">
                        <span className="meta-bold-val">
                          {selectedTask.assignedMemberName || "미입력"}
                        </span>
                        {selectedTask.assignedMemberDept && (
                          <span className="meta-sub-val">({selectedTask.assignedMemberDept})</span>
                        )}
                      </div>
                    </div>

                    <div className="meta-card-item">
                      <span className="meta-label">작성자</span>
                      <span className="meta-bold-val">
                        {selectedTask.taskWriterName || "미입력"}
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

                  <div className="view-section">
                    <span className="section-title">
                      함께하는 협업자 (
                      {selectedTask.collaborators ? selectedTask.collaborators.length : 0}명)
                    </span>
                    <div className="collab-tag-list">
                      {selectedTask.collaborators && selectedTask.collaborators.length > 0 ? (
                        selectedTask.collaborators.map((c, idx) => (
                          <div key={idx} className="collab-chip">
                            <span className="chip-name">{c.memberName || `멤버 #${c.projectMemberNo}`}</span>
                            {c.deptName && <span className="chip-dept">({c.deptName})</span>}
                          </div>
                        ))
                      ) : (
                        <span className="empty-hint-text">지정된 협업자가 없습니다.</span>
                      )}
                    </div>
                  </div>

                  <div className="view-section">
                    <span className="section-title">업무 세부 내용</span>
                    <div className="view-content-box">
                      {selectedTask.taskContent || "등록된 상세 내용이 없습니다."}
                    </div>
                  </div>

                  <div className="view-timestamps">
                    <span>등록일시: {selectedTask.taskCtime ? String(selectedTask.taskCtime).replace("T", " ").slice(0, 19) : "-"}</span>
                    {selectedTask.taskUtime && (
                      <span>최종수정: {String(selectedTask.taskUtime).replace("T", " ").slice(0, 19)}</span>
                    )}
                  </div>

                  {/*  댓글 CRUD 컴포넌트 연동 지점 */}
                  <TaskComments
                    taskNo={selectedTask.taskNo}
                    // 현재 프로젝트 멤버 목록의 첫 번째 유효한 projectMemberNo 전달 (또는 로그인 사용자 매핑)
                    currentProjectMemberNo={
                      projectMembers.length > 0 ? projectMembers[0].projectMemberNo : null
                    }
                    currentMemberName={
                      projectMembers.length > 0 ? projectMembers[0].empName : "작성자"
                    }
                  />
                </div>

                {/* 열람 모드 푸터 */}
                <div className="drawer-footer">
                  <button className="btn-cancel" onClick={handleCloseDrawer}>
                    닫기
                  </button>
                  <button className="btn-edit-trigger" onClick={handleStartEdit}>
                     수정하기
                  </button>
                </div>
              </>
            )}

            {/* ========================================================
                [MODE 2] 수정 모드 (Edit Mode Form)
               ======================================================== */}
            {isEditing && (
              <form className="drawer-edit-form" onSubmit={handleSaveEdit}>
                <div className="drawer-body edit-mode">
                  <div className="form-group full-width">
                    <label className="form-label required">업무 제목</label>
                    <input
                      type="text"
                      name="taskTitle"
                      value={editFormData.taskTitle}
                      onChange={handleEditChange}
                      className="form-input title-input"
                      maxLength={200}
                      required
                    />
                  </div>

                  <div className="form-grid-row">
                    <div className="form-group">
                      <label className="form-label">주 담당자</label>
                      <select
                        name="assignedMemberNo"
                        value={editFormData.assignedMemberNo}
                        onChange={handleEditChange}
                        className="form-select"
                      >
                        <option value="">담당자 미지정</option>
                        {projectMembers.map((m) => (
                          <option key={m.projectMemberNo} value={m.projectMemberNo}>
                            {m.empName} ({m.empDeptNo || "부서미정"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">진행 상태</label>
                      <select
                        name="taskStatus"
                        value={editFormData.taskStatus}
                        onChange={handleEditChange}
                        className="form-select"
                      >
                        <option value="TODO">할 일 (To Do)</option>
                        <option value="IN_PROGRESS">진행 중 (In Progress)</option>
                        <option value="DONE">완료 (Done)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">우선순위</label>
                      <select
                        name="taskPriority"
                        value={editFormData.taskPriority}
                        onChange={handleEditChange}
                        className="form-select"
                      >
                        <option value="낮음">낮음</option>
                        <option value="보통">보통</option>
                        <option value="높음">높음</option>
                        <option value="긴급">긴급</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">카테고리</label>
                      <input
                        type="text"
                        name="taskCategory"
                        value={editFormData.taskCategory}
                        onChange={handleEditChange}
                        placeholder="예: 백엔드, 프론트, 디자인"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-grid-row">
                    <div className="form-group">
                      <label className="form-label">시작일</label>
                      <input
                        type="date"
                        name="taskStart"
                        value={editFormData.taskStart}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">마감일</label>
                      <input
                        type="date"
                        name="taskEnd"
                        value={editFormData.taskEnd}
                        onChange={handleEditChange}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group full-width-sm">
                      <div className="label-with-val">
                        <label className="form-label">진척도 (Progress)</label>
                        <span className="progress-num-badge">{editFormData.taskProgress}%</span>
                      </div>
                      <input
                        type="range"
                        name="taskProgress"
                        min="0"
                        max="100"
                        step="5"
                        value={editFormData.taskProgress}
                        onChange={handleEditChange}
                        className="form-range"
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">함께할 협업자 (다중 선택)</label>
                    <div className="collab-chips-box">
                      {projectMembers.map((m) => {
                        const isSelected = editCollaborators.includes(m.projectMemberNo);
                        return (
                          <button
                            key={m.projectMemberNo}
                            type="button"
                            onClick={() => handleCollabToggle(m.projectMemberNo)}
                            className={`collab-chip-btn ${isSelected ? "selected" : ""}`}
                          >
                            <span className="chip-avatar">{(m.empName || "사").slice(0, 1)}</span>
                            <span className="chip-name">{m.empName}</span>
                            {m.empDeptNo && <span className="chip-dept">({m.empDeptNo})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">업무 세부 내용</label>
                    <textarea
                      name="taskContent"
                      value={editFormData.taskContent}
                      onChange={handleEditChange}
                      className="form-textarea"
                      rows={6}
                    />
                  </div>
                </div>

                {/* 수정 모드 푸터 */}
                <div className="drawer-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCancelEdit}
                    disabled={updating}
                  >
                    취소
                  </button>
                  <button type="submit" className="btn-save-edit" disabled={updating}>
                    {updating ? "저장 중..." : "수정 완료"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}