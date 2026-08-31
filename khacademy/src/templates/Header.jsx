import { Link } from "react-router-dom";
import "./Header.css";
import { Button, Col, Row } from 'react-bootstrap';
import Image from 'react-bootstrap/Image';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { loginUserState } from "@utils/storage";
import { useCallback } from "react";
import { isLoginState, isAdminState } from "@utils/storage";
import { logoutActionState } from "@utils/storage";
import { authClient, apiClient } from "@utils/reaxios";
import { useWebSocket } from "@websocket/WebSocketProvider";
import { FaCircle } from "react-icons/fa6";
// import { socketState } from "@utils/storage";
// import { heartbeatState } from "@utils/storage";    

// import { onlineState } from "@utils/storage";
// import { FaCircle } from "react-icons/fa6";



export default function Header({ toggleSidebar }) {

    const { empName, empEmail } = useAtomValue(loginUserState) || {};

    // const [socket, setSocket] = useAtom(socketState);

    // const [heartbeatInterval, setHeartbeatInterval] = useAtom(heartbeatState);

    // const [online, setOnline] = useAtom(onlineState);

    //읽기전용 atom을 불러오는법
    //const [isLogin] = useAtom(isLoginState);
    // console.log(isLoginState);
    const isLogin = useAtomValue(isLoginState);
    // console.log("isLogin : ", isLogin);
    const isAdmin = useAtomValue(isAdminState);

    const logoutAction = useSetAtom(logoutActionState);

    const { users } = useWebSocket();


    const logout = useCallback(async () => {

        // if (heartbeatInterval) {
        //     clearInterval(heartbeatInterval);
        //     setHeartbeatInterval(null);
        // }
        // console.log("heartbeat전송 끝");

        // if (socket) {
        //     await socket.deactivate();
        //     setSocket(null);
        // }

        try {
            //await axios.delete("/service/auth/logout");//쿠키 삭제 요청
            await authClient.delete("/logout");//쿠키 삭제 요청



        }
        catch (e) {
            console.error(e);
        }
        finally {
            logoutAction();//에러여부와 관계없이 화면상의 데이터는 삭제
        }
    }, []);


    const online = users.some(user=>user.empName === empName);

    // console.log(socket?.readyState);

    // console.log("online:", online);



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
                                    <Popover.Header as="h3">프로필</Popover.Header>
                                    <Popover.Body>

                                        <Row className="align-items-center">
                                            <Col xs="auto">
                                                <Link to="/me">
                                                    <Image src="https://placehold.co/50x50"
                                                        roundedCircle />
                                                </Link>
                                            </Col>
                                            <Col>
                                                <Link to="/me">
                                                    <div>{empName}</div>
                                                </Link>
                                                <Link to="/me">
                                                    <div>{empEmail}</div>
                                                </Link>
                                            </Col>
                                        </Row>
                                        <Row className="mt-2">
                                            {isAdmin === true && (<>
                                                <Row>
                                                    <strong>
                                                        <Button as={Link} to="/invite" >사용자 초대하기</Button>
                                                    </strong>
                                                </Row>
                                                <Row className="mt-2">
                                                    <strong>
                                                        <Button as={Link} to="/users" >관리</Button>
                                                    </strong>
                                                </Row>
                                            </>)}
                                            <Row className="mt-2">
                                                <strong>
                                                    <Button onClick={logout} >로그아웃</Button>
                                                </strong>
                                            </Row>
                                        </Row>


                                    </Popover.Body>
                                </Popover>
                            }
                        >

                            <Image src="https://placehold.co/50x50"

                                roundedCircle />
                        </OverlayTrigger>


                            <FaCircle className={online ? "text-success" : ""}/>
                            <span>online</span>
                    </>)}

                </div>

            </div>
        </div>




    </>
    )
}