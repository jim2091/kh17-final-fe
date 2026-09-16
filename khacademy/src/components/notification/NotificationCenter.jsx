import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, CheckSquare, MessageSquare, ExternalLink, Calendar } from "lucide-react";
import { toast } from "react-toastify";
import { apiClient } from "@utils/reaxios";
import { getWebSocketClient, onWebSocketConnect } from "@utils/websocket";
import "./NotificationCenter.css";

// 1. 안전한 사번(empNo) 추출 함수
function getLoginEmpNo() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const val = localStorage.getItem(key);
      if (val && (val.includes("empNo") || val.includes("memberNo"))) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && (parsed.empNo || parsed.memberNo)) {
            return Number(parsed.empNo || parsed.memberNo);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  return Number(
    localStorage.getItem("empNo") ||
    sessionStorage.getItem("empNo") ||
    0
  );
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const myEmpNo = getLoginEmpNo();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // 2. 알림 목록 조회
  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get("/notification/");
      const data = res.data || {};

      let listData = [];
      if (Array.isArray(data)) {
        listData = data;
      } else if (Array.isArray(data.list)) {
        listData = data.list;
      } else if (Array.isArray(data.notifications)) {
        listData = data.notifications;
      } else if (Array.isArray(data.items)) {
        listData = data.items;
      } else if (Array.isArray(data.summary)) {
        listData = data.summary;
      }

      setNotifications(listData);

      let count = 0;
      if (typeof data.unreadCount === "number") {
        count = data.unreadCount;
      } else if (typeof data.count === "number") {
        count = data.count;
      } else {
        count = listData.filter(
          (item) => item.notificationRead === "N" || item.isRead === "N"
        ).length;
      }
      setUnreadCount(count);

    } catch (e) {
      console.error("❌ 알림 목록 조회 실패:", e);
    }
  }, []);

  // 3. 웹소켓 실시간 구독
  useEffect(() => {
    loadNotifications();

    if (!myEmpNo || myEmpNo <= 0) return;

    let subscription = null;

    const doSubscribe = (client) => {
      if (!client || !client.connected) return;

      subscription?.unsubscribe();
      subscription = client.subscribe(
        `/public/user/${myEmpNo}/notify`,
        (message) => {
          try {
            const newNoti = JSON.parse(message.body);
            
            setUnreadCount((prev) => prev + 1);
            setNotifications((prev) => [newNoti, ...prev]);

            if (newNoti.notificationContent) {
              toast.info(newNoti.notificationContent);
            }
          } catch (err) {
            console.error("❌ 실시간 알림 메시지 파싱 실패:", err);
          }
        }
      );
    };

    const client = getWebSocketClient();
    if (client && client.connected) {
      doSubscribe(client);
    }

    const unregister = onWebSocketConnect(() => {
      const currentClient = getWebSocketClient();
      doSubscribe(currentClient);
    });

    return () => {
      subscription?.unsubscribe();
      if (typeof unregister === "function") unregister();
    };
  }, [myEmpNo, loadNotifications]);

  // + 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. 단건 읽음 처리 및 이동 (일정, 업무, 일반 분기)
  const handleItemClick = async (item) => {
    const isUnread = item.notificationRead === "N" || item.isRead === "N";

    console.log("알림 원본 데이터 :", item);
    
    if (isUnread) {
      try {
        await apiClient.patch(`/notification/${item.notificationNo}/read`);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationNo === item.notificationNo
              ? { ...n, notificationRead: "Y", isRead: "Y" }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        console.error("❌ 단건 읽음 처리 실패:", e);
      }
    }

    setIsOpen(false);

    if (item.notificationUrl) {
      let targetUrl = item.notificationUrl;

      const isTaskNotification = item.notificationType?.includes("TASK") || item.notificationUrl.includes("/task");
      const isScheduleNotification = item.notificationType?.includes("SCHEDULE") || item.notificationUrl.includes("/calendar") || item.notificationUrl.includes("/schedule");



      // + 일정(SCHEDULE) 알림 클릭 시 달력 페이지 + scheduleNo 파라미터 전송 로직
      if (isScheduleNotification) {
        let targetScheduleNo = item.notificationTarget;
        if (!targetScheduleNo) {
          const match = item.notificationUrl.match(/[?&]scheduleNo=(\d+)/) || item.notificationUrl.match(/\/\/(\d+)/);
          if (match && match[1]) targetScheduleNo = match[1];
        }
        let targetProjectNo = item.projectNo;
        if (!targetProjectNo) {
          const pMatch = item.notificationUrl.match(/\/projects\/(\d+)/);
          if (pMatch && pMatch[1]) targetProjectNo = pMatch[1];
        }
        if (targetProjectNo && targetScheduleNo) {
          targetUrl = `/projects/${targetProjectNo}/calendar?scheduleNo=${targetScheduleNo}`;
        } else if (targetProjectNo) {
          targetUrl = `/projects/${targetProjectNo}/calendar`;
        }
      } 
      // 업무(TASK) 알림 클릭 시 로직
      else if (isTaskNotification) {
        let targetTaskNo = item.notificationTarget;
        if (!targetTaskNo) {
          const match = item.notificationUrl.match(/[?&]taskNo=(\d+)/) || item.notificationUrl.match(/\/task\/(\d+)/);
          if (match && match[1]) targetTaskNo = match[1];
        }
        let targetProjectNo = item.projectNo;
        if (!targetProjectNo) {
          const pMatch = item.notificationUrl.match(/\/projects\/(\d+)/);
          if (pMatch && pMatch[1]) targetProjectNo = pMatch[1];
        }
        if (targetProjectNo && targetTaskNo) {
          targetUrl = `/projects/${targetProjectNo}/task?taskNo=${targetTaskNo}`;
        }
      }

      console.log("최종 이동할 URL:" , targetUrl);
      navigate(targetUrl);
    }
  };

  // 5. 전체 읽음 처리
  const handleReadAll = async () => {
    try {
      await apiClient.patch("/notification/read-all");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, notificationRead: "Y", isRead: "Y" }))
      );
      setUnreadCount(0);
    } catch (e) {
      console.error("❌ 전체 읽음 처리 실패:", e);
    }
  };

  return (
    <div className="noti-center-container" ref={dropdownRef}>
      {/* 벨 아이콘 트리거 버튼 */}
      <button
        type="button"
        className="noti-bell-trigger"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) loadNotifications();
        }}
        title="알림"
      >
        <Bell size={20} color="#334155" />
        {unreadCount > 0 && (
          <span className="noti-badge-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 패널 */}
      {isOpen && (
        <div className="noti-dropdown-panel">
          {/* 헤더 */}
          <div className="noti-dropdown-header">
            <div className="noti-title">
              알림 <span className="noti-count-num">{unreadCount}</span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="noti-read-all-btn"
                onClick={handleReadAll}
              >
                <CheckCheck size={14} /> 모두 읽음
              </button>
            )}
          </div>

          {/* 목록 */}
          <div className="noti-list-container">
            {notifications.length === 0 ? (
              <div className="noti-empty-text">
                도착한 새 알림이 없습니다.
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = item.notificationRead === "N" || item.isRead === "N";

                return (
                  <div
                    key={item.notificationNo}
                    onClick={() => handleItemClick(item)}
                    className={`noti-item ${isUnread ? "unread" : "read"}`}
                  >
                    <div className="noti-icon-box">
                      {item.notificationType?.includes("TASK") ? (
                        <CheckSquare size={16} />
                      ) : item.notificationType?.includes("SCHEDULE") ? (
                        <Calendar size={16} />
                      ) : (
                        <MessageSquare size={16} />
                      )}
                    </div>

                    <div className="noti-content-box">
                      <div className={`noti-text ${isUnread ? "unread" : ""}`}>
                        {item.notificationContent}
                      </div>
                      <div className="noti-time">
                        {item.notificationCtime
                          ? String(item.notificationCtime).replace("T", " ").slice(0, 16)
                          : ""}
                      </div>
                    </div>

                    <ExternalLink size={14} color="#cbd5e1" className="noti-external-icon" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}