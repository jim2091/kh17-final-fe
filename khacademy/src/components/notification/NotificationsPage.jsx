import React, { useState, useEffect, useCallback } from "react";
import { Button, Table, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { apiClient } from "../../utils/reaxios";
import "./NotificationsPage.css";

// 
function resolveNotificationTargetUrl(item) {
    if (!item?.notificationUrl) return null;
    let targetUrl = item.notificationUrl;

    const isTaskNotification =
        item.notificationType?.includes("TASK") ||
        item.notificationUrl.includes("/task");
    const isScheduleNotification =
        item.notificationType?.includes("SCHEDULE") ||
        item.notificationUrl.includes("/calendar") ||
        item.notificationUrl.includes("/schedule");

    if (isScheduleNotification) {
        let targetScheduleNo = item.notificationTarget;
        if (!targetScheduleNo) {
            const match =
                item.notificationUrl.match(/[?&]scheduleNo=(\d+)/) ||
                item.notificationUrl.match(/\/\/(\d+)/);
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
    } else if (isTaskNotification) {
        let targetTaskNo = item.notificationTarget;
        if (!targetTaskNo) {
            const match =
                item.notificationUrl.match(/[?&]taskNo=(\d+)/) ||
                item.notificationUrl.match(/\/task\/(\d+)/);
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
        else if (isNoteNotification) {
            let targetNoteNo = item.notificationTarget;
            if (!targetNoteNo) {
                const match = item.notificationUrl.match(/[?&]noteNo=(\d+)/) || item.notificationUrl.match(/\/note\/(\d+)/);
                if (match && match[1]) targetNoteNo = match[1];
            }
            let targetProjectNo = item.projectNo;
            if (!targetProjectNo) {
                const pMatch = item.notificationUrl.match(/\/projects\/(\d+)/);
                if (pMatch && pMatch[1]) targetProjectNo = pMatch[1];
            }

            if (targetProjectNo && targetNoteNo) {
                targetUrl = `/projects/${targetProjectNo}/note/${targetNoteNo}`;
            }
        }

    }
    return targetUrl;
}

function getNotificationTypeLabel(type) {
    if (type.includes("SCHEDULE")) return "일정";
    if (type.includes("TASK")) return "업무";
    if (type.includes("NOTE")) return "노트";
    if (type.includes("TASK")) return "업무";
    if (type.includes("PROJECT")) return "프로젝트";
    if (!type) return "기타";
    return "기타";
}

function isNotificationUnread(item) {
    return item.notificationRead === "N" || item.isRead === "N";
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notificationList, setNotificationList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState("all"); // 'all' | 'unread'

    // 페이징 관련 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 10; // 한 페이지당 10개씩 노출

    // 알림 목록 조회 (백엔드 페이징/필터 API 연동)
    const loadNotifications = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const { data } = await apiClient.get("/notification/", {
                params: { page, size: pageSize, filter: filterType }
            });

            let listData = [];
            let count = 0;

            if (Array.isArray(data)) {
                listData = data;
                count = data.length;
            } else {
                listData = data.list || data.notifications || data.data || [];
                count = data.totalCount || data.count || listData.length;
            }

            setNotificationList(listData);
            setTotalCount(count);
            setCurrentPage(page);
        } catch (e) {
            console.error("❌ 알림 목록 조회 실패:", e);
            toast.error("알림 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    useEffect(() => {
        loadNotifications(1); // 필터가 바뀌면 1페이지부터 다시 조회
    }, [loadNotifications]);

    // 개별 알림 클릭 핸들러
    const handleNotificationClick = async (item) => {
        try {
            const notificationNo = item.notificationNo || item.no;
            if (isNotificationUnread(item)) {
                await apiClient.patch(`/notification/${notificationNo}/read`);
                setNotificationList(prev =>
                    prev.map(n =>
                        (n.notificationNo === notificationNo || n.no === notificationNo)
                            ? { ...n, notificationRead: "Y", isRead: "Y" }
                            : n
                    )
                );
            }

            const targetUrl = resolveNotificationTargetUrl(item);
            if (targetUrl) {
                navigate(targetUrl);
            } else {
                toast.info("이동할 수 없는 알림입니다.");
            }
        } catch (e) {
            console.error("❌ 알림 클릭 처리 오류:", e);
            toast.error("알림 처리 중 오류가 발생했습니다.");
        }
    };

    // 모두 읽음 처리
    const handleMarkAllAsRead = async () => {
        try {
            await apiClient.patch("/notification/read-all");
            toast.success("모든 알림이 읽음 처리되었습니다.");
            loadNotifications(currentPage);
        } catch (e) {
            console.error("❌ 전체 읽음 처리 실패:", e);
            toast.error("일괄 읽음 처리에 실패했습니다.");
        }
    };

    const formatDate = (value) => {
        if (!value) return "";
        return String(value).replace("T", " ").slice(0, 16);
    };

    // 총 페이지 수 및 페이지 번호 배열 계산
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="notifications-page-container">
            <div className="notifications-header">
                <h2>전체 알림 센터</h2>
                <div className="notifications-controls">
                    <Form.Select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="notifications-filter-select"
                    >
                        <option value="all">전체 보기</option>
                        <option value="unread">안 읽은 알림</option>
                    </Form.Select>
                    <Button variant="outline-primary" onClick={handleMarkAllAsRead}>
                        모두 읽음
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="notifications-empty">알림을 불러오는 중...</div>
            ) : notificationList.length === 0 ? (
                <div className="notifications-empty">
                    확인할 알림이 없습니다.
                </div>
            ) : (
                <>
                    <div className="notifications-table-wrapper">
                        <Table hover responsive className="align-middle mb-0">
                            <thead>
                                <tr>
                                    <th style={{ width: "10%" }}>분류</th>
                                    <th style={{ width: "60%" }}>내용</th>
                                    <th style={{ width: "20%" }}>시간</th>
                                    <th style={{ width: "10%" }}>상태</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notificationList.map((item) => {
                                    const unread = isNotificationUnread(item);
                                    const typeLabel = getNotificationTypeLabel(item.notificationType);
                                    const content = item.notificationContent || item.content || "알림 내용이 없습니다.";
                                    const time = item.notificationCtime || item.ctime || item.regDate;

                                    return (
                                        <tr
                                            key={item.notificationNo || item.no}
                                            onClick={() => handleNotificationClick(item)}
                                            className={`notification-row ${unread ? "unread" : ""}`}
                                        >
                                            <td>
                                                <span className={`badge ${typeLabel === "일정" ? "bg-info" : typeLabel === "업무" ? "bg-success" : "bg-secondary"}`}>
                                                    {typeLabel}
                                                </span>
                                            </td>
                                            <td>{content}</td>
                                            <td className="text-muted small">{formatDate(time)}</td>
                                            <td>
                                                {unread ? (
                                                    <span className="text-danger small font-weight-bold">안 읽음</span>
                                                ) : (
                                                    <span className="text-muted small">읽음</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>

                    {/* 전통적인 페이지 번호 UI (Pagination Bar) */}
                    <div className="notifications-pagination-bar">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => loadNotifications(currentPage - 1)}
                        >
                            이전
                        </Button>

                        {pageNumbers.map((num) => (
                            <Button
                                key={num}
                                size="sm"
                                variant={currentPage === num ? "primary" : "outline-secondary"}
                                onClick={() => loadNotifications(num)}
                                className={currentPage === num ? "fw-bold" : ""}
                            >
                                {num}
                            </Button>
                        ))}

                        <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => loadNotifications(currentPage + 1)}
                        >
                            다음
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}