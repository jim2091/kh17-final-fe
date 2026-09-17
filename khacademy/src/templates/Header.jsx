import { Link, useNavigate } from "react-router-dom";
import "./Header.css";
import { Button, Card, Col, Row } from "react-bootstrap";
import Image from "react-bootstrap/Image";

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";

import { useAtomValue, useSetAtom } from "jotai";
import NotificationCenter from "../components/notification/NotificationCenter";

import { loginUserState, isLoginState, isAdminState, logoutActionState } from "@utils/storage";
import { useState, useCallback } from "react";
import { authClient } from "@utils/reaxios";

import NoImage from "@assets/noimages.png";
import "./Project.css";
import { getWebSocketClient } from "../utils/websocket";
import { useWebSocket } from "../websocket/WebSocketProvider";

// NotificationCenter 및 Task/Note 컴포넌트와 동일한 로그인 유저 추출 헬퍼[cite: 8, 9]
function getDynamicLoginUser() {
    try {
        const keys = ["로그인 유저의 정보", "user", "loginUser"];
        for (const k of keys) {
            const item = localStorage.getItem(k);
            if (item) {
                const parsed = JSON.parse(item);
                if (parsed && (parsed.empNo || parsed.memberNo)) return parsed;
            }
        }
    } catch (e) { }
    return null;
}

export default function Header({ toggleSidebar }) {
    // 1. Jotai 상태 및 스토리지 백업 데이터 병합[cite: 8]
    const atomUser = useAtomValue(loginUserState) || {};
    const storageUser = getDynamicLoginUser() || {};

    const empNo = atomUser.empNo || storageUser.empNo || storageUser.memberNo || 0;
    const empName = atomUser.empName || storageUser.empName || "";
    const empEmail = atomUser.empEmail || storageUser.empEmail || "";
    const attachNo = atomUser.attachNo !== undefined ? atomUser.attachNo : (storageUser.attachNo || null);

    const profileUrl = `${import.meta.env.VITE_SERVER_URL}/api/attach/p/${attachNo}`;

    // 읽기 전용 상태
    const isLogin = useAtomValue(isLoginState);
    const isAdmin = useAtomValue(isAdminState);
    const logoutAction = useSetAtom(logoutActionState);

    const [showProfile, setShowProfile] = useState(false);
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState("");

    const logout = useCallback(async () => {
        try {
            await authClient.delete("/logout"); // 쿠키 삭제 요청
        } catch (e) {
            console.error(e);
        } finally {
            logoutAction(); // 화면 데이터 초기화
        }
    }, [logoutAction]);

    const handleSearch = (e) => {
        if (e.key !== "Enter") return;
        const value = keyword.trim();
        if (!value) return;
        navigate(`/search?keyword=${encodeURIComponent(value)}`);
    };

    const changePresence = (status) => {
        const client = getWebSocketClient();
        if (client == null || client.connected !== true) return;

        client.publish({
            destination: "/app/presence/status",
            body: JSON.stringify({ status: status })
        });
    };

    const { presenceMap = {} } = useWebSocket() || {};
    const myPresence = presenceMap[empNo] || "ONLINE";

    return (
        <div className="header">
            {/* 좌측 사이드바 토글 버튼 */}
            <button
                type="button"
                className="header-menu-button"
                onClick={toggleSidebar}
            >
                ☰
            </button>

            {/* 로고 */}
            <div className="header-logo">
                <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
                    LOGO
                </Link>
            </div>

            {/* 검색창 */}
            <div className="header-search">
                <input
                    type="text"
                    placeholder="검색어를 입력하세요"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleSearch}
                />
            </div>

            {/* 우측 액션 영역 (알림 센터 + 프로필) */}
            <div className="header-actions" style={{ overflow: "visible" }}>
                
                {/* 실시간 웹소켓 연동 알림 센터 드롭다운 */}
                <div className="header-notification" style={{ overflow: "visible" }}>
                    {isLogin === true && <NotificationCenter />}
                </div>

                {/* 프로필 및 상태 변경 영역 */}
                <div className="header-profile">
                    {isLogin !== true && (
                        <Button as={Link} to="/login" className="primary">
                            로그인
                        </Button>
                    )}

                    {isLogin === true && (
                        <OverlayTrigger
                            trigger="click"
                            placement="bottom"
                            rootClose={true}
                            show={showProfile}
                            onToggle={setShowProfile}
                            overlay={
                                <Popover id="popover-positioned-bottom">
                                    <Popover.Body>
                                        <Card>
                                            <Card.Body>
                                                <Row className="align-items-center">
                                                    <Col xs="auto">
                                                        <Link to="/me" onClick={() => setShowProfile(false)}>
                                                            <Image
                                                                className="header-img rounded-3"
                                                                src={attachNo === null ? NoImage : profileUrl}
                                                            />
                                                        </Link>
                                                    </Col>
                                                    <Col>
                                                        <Link to="/me" className="text-decoration-none" onClick={() => setShowProfile(false)}>
                                                            <div>{empName}</div>
                                                        </Link>
                                                        <Link to="/me" className="text-decoration-none" onClick={() => setShowProfile(false)}>
                                                            <div style={{ fontSize: "12px", color: "#64748b" }}>{empEmail}</div>
                                                        </Link>
                                                    </Col>
                                                </Row>
                                            </Card.Body>
                                        </Card>

                                        {/* Presence 상태 선택 */}
                                        <div className="header-presence-menu">
                                            <div className="header-presence-title">
                                                상태
                                            </div>

                                            <button
                                                type="button"
                                                className={`header-presence-option ${myPresence === "ONLINE" ? "selected" : ""}`}
                                                onClick={() => {
                                                    changePresence("ONLINE");
                                                    setShowProfile(false);
                                                }}
                                            >
                                                <span className="header-presence-dot online"></span>
                                                온라인
                                            </button>
                                            <button
                                                type="button"
                                                className={`header-presence-option ${myPresence === "AWAY" ? "selected" : ""}`}
                                                onClick={() => {
                                                    changePresence("AWAY");
                                                    setShowProfile(false);
                                                }}
                                            >
                                                <span className="header-presence-dot away"></span>
                                                자리비움
                                            </button>
                                        </div>

                                        {/* 관리자 및 로그아웃 카드 */}
                                        <Card className="mt-2">
                                            <Card.Body>
                                                <Row className="mt-2">
                                                    {isAdmin === true && (
                                                        <>
                                                            <div className="header-presence-title">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigate("/invite");
                                                                        setShowProfile(false);
                                                                    }}
                                                                    className="header-presence-option"
                                                                >
                                                                    <span className="header-dot"></span>
                                                                    사용자 초대하기
                                                                </button>
                                                            </div>
                                                            <div className="header-presence-title">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigate("/users");
                                                                        setShowProfile(false);
                                                                    }}
                                                                    className="header-presence-option"
                                                                >
                                                                    <span className="header-dot"></span>
                                                                    관리
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className="header-presence-title">
                                                        <button
                                                            type="button"
                                                            onClick={logout}
                                                            className="header-presence-option"
                                                        >
                                                            <span className="header-dot"></span>
                                                            로그아웃
                                                        </button>
                                                    </div>
                                                </Row>
                                            </Card.Body>
                                        </Card>
                                    </Popover.Body>
                                </Popover>
                            }
                        >
                            <div className="position-relative d-inline-block" style={{ cursor: "pointer" }}>
                                <Image
                                    className="header-img"
                                    src={attachNo === null ? NoImage : profileUrl}
                                    roundedCircle
                                />
                                <span className={`header-my-presence-dot ${myPresence.toLowerCase()}`} />
                            </div>
                        </OverlayTrigger>
                    )}
                </div>
            </div>
        </div>
    );
}