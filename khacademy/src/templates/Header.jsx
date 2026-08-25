import { Link } from "react-router-dom";
import "./Header.css";
import { Button } from 'react-bootstrap';
import Image from 'react-bootstrap/Image';
import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';



import { useAtom, useAtomValue, useSetAtom } from "jotai";
import Container from 'react-bootstrap/Container';
import { loginUserState } from "@utils/storage";
import { useCallback, useMemo } from "react";
import { RESET } from "jotai/utils";
import { isLoginState, isAdminState } from "@utils/storage";
import { logoutActionState } from "@utils/storage";
import axios from "axios";
import { loginActionState } from "@utils/storage";
import { authClient } from "@utils/reaxios";



export default function Header({ openSidebar }) {

    const [loginUser, setLoginUser] = useAtom(loginUserState);

    //읽기전용 atom을 불러오는법
    //const [isLogin] = useAtom(isLoginState);
    console.log(isLoginState);
    const isLogin = useAtomValue(isLoginState);
    const isAdmin = useAtomValue(isAdminState);

    const loginAction = useSetAtom(loginActionState);
    const logoutAction = useSetAtom(logoutActionState);


    const logout = useCallback(async ()=>{
        try {
            //await axios.delete("/service/auth/logout");//쿠키 삭제 요청
            await authClient.delete("/logout");//쿠키 삭제 요청
        }
        catch(e){
            console.error(e);
        }
        finally {
            logoutAction();//에러여부와 관계없이 화면상의 데이터는 삭제
        }
    }, []);



    return (<>
        <div className="header">

            <button
                type="button"
                className="header-menu-button"
                onClick={openSidebar}
            >
                ☰
            </button>
            <div className="header-logo">\
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

                        <OverlayTrigger trigger="click" placement="bottom"
                            overlay={
                                <Popover id="popover-positioned-bottom">
                                    <Popover.Header as="h3">프로필</Popover.Header>
                                    <Popover.Body>
                                        <strong>
                                            <Button onClick={logout} >로그아웃</Button>
                                        </strong> Check this info.
                                    </Popover.Body>
                                </Popover>
                            }
                        >

                            <Image src="https://placehold.co/50x50"
                                
                                roundedCircle />
                        </OverlayTrigger>
                    </>)}

                </div>

            </div>
        </div>




    </>
    )
}