import { Link } from "react-router-dom";
import "./Header.css";
import { Button, Card, Col, Row } from 'react-bootstrap';
import Image from 'react-bootstrap/Image';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { loginUserState } from "@utils/storage";
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isLoginState, isAdminState } from "@utils/storage";
import { logoutActionState } from "@utils/storage";
import { authClient, apiClient } from "@utils/reaxios";
// import { useWebSocket } from "@websocket/WebSocketProvider";
// import { FaCircle } from "react-icons/fa6";
import NoImage from "@assets/noimages.png";
import "./Project.css";
import { getWebSocketClient } from "../utils/websocket";
import { useWebSocket } from "../websocket/WebSocketProvider";




export default function Header({ toggleSidebar }) {

    const { attachNo, empName, empEmail, empNo } = useAtomValue(loginUserState) || {};


    const profileUrl = `${import.meta.env.VITE_SERVER_URL}/api/attach/${attachNo}`;

    //읽기전용 atom을 불러오는법
    const isLogin = useAtomValue(isLoginState);
    const isAdmin = useAtomValue(isAdminState);

    const logoutAction = useSetAtom(logoutActionState);

    

    // const { users } = useWebSocket();


    const logout = useCallback(async () => {

        try {
            await authClient.delete("/logout");//쿠키 삭제 요청
        }
        catch (e) {
            console.error(e);
        }
        finally {
            logoutAction();//에러여부와 관계없이 화면상의 데이터는 삭제
        }
    }, []);

    const navigate = useNavigate();
    const [keyword, setKeyword] = useState("");

    const handleSearch = (e) => {

        if (e.key !== "Enter") return;

        const value = keyword.trim();

        if (!value) return;

        navigate(`/search?keyword=${encodeURIComponent(value)}`);

    };

    const changePresence = (status) => {
        const client = getWebSocketClient();

        if(client == null || client.connected !== true) return;

        client.publish({
            destination: "/app/presence/status",
            body: JSON.stringify({
                status: status
            })
        });
    };

    const {presenceMap} = useWebSocket();
    const myPresence = presenceMap[empNo] || "ONLINE";


    return (<>
        <div className="header">

            <button
                type="button"
                className="header-menu-button"
                onClick={toggleSidebar}
            >
                ☰
            </button>

            <div className="header-logo">
                LOGO
            </div>

            <div className="header-search">
                <input
                    type="text"
                    placeholder="검색어를 입력하세요"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleSearch}
                />
            </div>

            <div className="header-actions">

                <div className="header-notification">
                    알림
                </div>

                <div className="header-profile">
                    {isLogin !== true && (<>
                        <Button as={Link} to="/login" className="primary">
                            로그인
                        </Button>
                    </>)}
                    {isLogin === true && (<>

                        <OverlayTrigger trigger="click" placement="bottom" rootClose={true}
                            overlay={
                                <Popover id="popover-positioned-bottom">
                                    <Popover.Body>
                                        <Card>
                                            <Card.Body>
                                                <Row className="align-items-center">
                                                    <Col xs="auto">
                                                        <Link to="/me">
                                                            <Image className="header-img rounded-3"
                                                             src={attachNo === null ? NoImage : profileUrl}
                                                               />
                                                        </Link>
                                                    </Col>
                                                    <Col>
                                                        <Link to="/me" className="text-decoration-none">
                                                            <div>{empName}</div>
                                                        </Link>
                                                        <Link to="/me" className="text-decoration-none">
                                                            <div>{empEmail}</div>
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
                                                onClick={() => changePresence("ONLINE")}
                                            >
                                                <span className="header-presence-dot online"></span>
                                                온라인
                                            </button>
                                            <button
                                                type="button"
                                                className={`header-presence-option ${myPresence === "AWAY" ? "selected" : ""}`}
                                                onClick={() => changePresence("AWAY")}
                                            >
                                                <span className="header-presence-dot away"></span>
                                                자리비움
                                            </button>
                                        </div>
                    

                                        <Card className="mt-2">
                                            <Card.Body>
                                                <Row className="mt-2">
                                                    {isAdmin === true && (<>
                                                        <div className="header-presence-title">
                                                                <button type="botton" 
                                                                 onClick={() => navigate("/invite")}
                                                                    className="header-presence-option">
                                                                        <span className="header-dot"></span>
                                                                    사용자 초대하기
                                                                </button>
                                                        </div>
                                                        <div className="header-presence-title">
                                                                <button type="button" 
                                                                 onClick={() => navigate("/users")}
                                                                    className="header-presence-option">
                                                                        <span className="header-dot"></span>
                                                                    관리
                                                                </button>
                                                        </div>
                                                    </>)}
                                                    <div className="header-presence-title">
                                                            <button type="button" onClick={logout}
                                                                className="header-presence-option">
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
                            <div className="position-relative d-inline-block">

                                <Image className="header-img"
                                 src={attachNo === null ? NoImage : profileUrl}
                                    roundedCircle />
                                <span className={`header-my-presence-dot ${myPresence.toLowerCase()}`}/>
                            </div>
                        </OverlayTrigger>


                    </>)}

                </div>

            </div>
        </div>




    </>
    )
}