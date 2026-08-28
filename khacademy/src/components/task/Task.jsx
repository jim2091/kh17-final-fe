import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { apiClient } from "@utils/reaxios";
import { toast } from "react-toastify";

import { KanbanComponent, ColumnsDirective, ColumnDirective } from "@syncfusion/ej2-react-kanban";
import "@syncfusion/ej2-base/styles/material.css";
import "@syncfusion/ej2-react-kanban/styles/material.css";
import "./Task.css";

export default function Task() {
  const { projectNo } = useParams();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectNo) {
      fetchTasks(projectNo);
    }
  }, [projectNo]);

  const fetchTasks = async (pNo) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      const response = await apiClient.get(`/task/list/${pNo}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : ""
        }
      });

      const mappedData = (response.data || []).map((item) => ({
        Id: `TASK-${item.taskNo}`,
        RawTaskNo: item.taskNo,
        Status: item.taskStatus || "TODO",
        Summary: item.taskTitle || "제목 없음",
        Content: item.taskContent || "",
        Category: item.taskCategory || "일반",
        Priority: item.taskPriority || "낮음",
        DueDate: item.taskEnd ? String(item.taskEnd).slice(0, 10) : "-",
        Progress: item.taskProgress || 0,
        Assignee: item.assignedMemberName || "미배정",
        Dept: item.assignedMemberDept || "부서없음"
      }));

      setTasks(mappedData);
    } catch (error) {
      toast.error("업무 목록 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStop = async (args) => {
    const movedCard = args.data[0];
    if (!movedCard) return;

    try {
      await apiClient.patch("/task/move", {
        taskNo: movedCard.RawTaskNo,
        targetStatus: movedCard.Status,
        projectNo: Number(projectNo)
      });

      //이후 제거 처리할 예정
      toast.success("이동 성공");

    } catch (error) {
      console.error("이동 실패:", error);
      toast.error("업무 이동에 실패했습니다.");
      fetchTasks(projectNo);
    }
  }
    const cardTemplate = (props) => {
      const priorityClass = {
        긴급: "badge-urgent",
        높음: "badge-high",
        보통: "badge-normal",
        낮음: "badge-low"
      }[props.Priority] || "badge-low";

      return (
        <div className={`custom-task-card priority-border-${priorityClass}`}>
          <div className="card-top">
            <span className="task-category">#{props.Category}</span>
            <span className={`task-priority ${priorityClass}`}>{props.Priority}</span>
          </div>
          <div className="card-title">{props.Summary}</div>
          <div className="progress-wrap">
            <div className="progress-header">
              <span>진행률</span>
              <span>{props.Progress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${props.Progress}%` }} />
            </div>
          </div>
          <div className="card-footer">
            <div className="assignee-wrap">
              <div className="avatar">{props.Assignee.slice(0, 1)}</div>
              <span className="assignee-name">{props.Assignee}</span>
            </div>
            <span className="due-date">
              {props.DueDate}
            </span>
          </div>
        </div>
      );
    };

    if (loading) return <div className="p-6">업무 데이터를 불러오는 중입니다...</div>;




    return (
      <div className="kanban-container">
        <div className="kanban-header-bar">
          <h2>프로젝트 #{projectNo} 업무 안내</h2>
          <p>드래그 앤 드롭으로 업무 진행 상태를 실시간 변경하세요.</p>
        </div>
        <div className="kanban-board-wrapper">
          <KanbanComponent
            id="kanban"
            keyField="Status"
            dataSource={tasks}
            cardSettings={{ headerField: "Id", template: cardTemplate }}
            dragStop={handleDragStop}
          >
            <ColumnsDirective>
              <ColumnDirective headerText="To Do" keyField="TODO" />
              <ColumnDirective headerText="In Progress" keyField="IN_PROGRESS" />
              <ColumnDirective headerText="Done" keyField="DONE" />
            </ColumnsDirective>
          </KanbanComponent>
        </div>
      </div>
    );
  }