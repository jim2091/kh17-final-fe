import axios from "axios";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import { Button, Col, Form, Row } from "react-bootstrap";
import { FaRightToBracket } from "react-icons/fa6";
import Swal from "sweetalert2";
import { loginUserState } from "@utils/storage";
import { useNavigate } from "react-router-dom";
import { loginActionState } from "@utils/storage";
import { authClient, apiClient } from "@utils/reaxios";

import Card from 'react-bootstrap/Card';
import './member.css';


export default function Login() {

    //state
    const [emp, setEmp] = useState({
        empEmail: "",
        empPassword: ""
    });

    //비밀번호 표시
    const [showPassword, setShowPassword] = useState(false);





    const loginAction = useSetAtom(loginActionState);

    const navigate = useNavigate();

    //입력
    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setEmp(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);
    //로그인
    const sendLogin = useCallback(async () => {
        //미입력 시 차단
        if (emp.empEmail === "" && emp.empPassword === "") {
            await Swal.fire("모든 정보를 입력하세요");
            return;
        }

        try {
            const { data } = await authClient.post("/login", emp);

            loginAction(data);

            // connectToServer();

            navigate("/");

        }
        catch (e) {

            if (e.status === 403) {
                navigate("/emp/inactive");
            }
            else if (e.status === 404) {
                await Swal.fire("정보가 일치하지 않습니다");
            }
            else {//500
                await Swal.fire("일시적인 서버 오류입니다.\n잠시 후 실행해주세요");
                // console.log("무슨에러? :", e);
            }
        }
    }, [emp, loginAction]);




    return (<>



<div className="spacing">


        <Card className="bg-light w-80">
            
            <Card.Body>
                <Row>
                <Col>
                    <span className="large-font ps-4 ">시작하기</span>
                </Col>
                <Col>
                
               
                    <Row className="mt-4">
                        
                        {/* <Form.Label column sm={3}>이메일</Form.Label> */}
                        <Col>
                            <Form.Control type="text" size="lg" name="empEmail" value={emp.empEmail}
                                onChange={changeStringValue} placeholder="이메일 입력"
                                autoFocus />
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        {/* <Form.Label column sm={3}>비밀번호</Form.Label> */}
                        <Col>
                            <Form.Control type={showPassword? "text" : "password"} 
                                size="lg" name="empPassword"
                                value={emp.empPassword}
                                onChange={changeStringValue} placeholder="비밀번호 입력" />
                            <Form.Check type="checkbox" label="비밀번호 표시" 
                            className="mt-2" checked={showPassword} 
                            onClick={(e)=>setShowPassword(e.target.checked)}></Form.Check>
                        </Col>
                    </Row>


                    <Row className="mt-5">
                        <Col className="text-end">
                            <Button variant="primary" size="lg" onClick={sendLogin}>
                                <FaRightToBracket />
                                <span className="ms-2 d-none d-md-inline">로그인</span>
                            </Button>
                        </Col>
                    </Row>
                    </Col>
                 </Row>
            </Card.Body>
        </Card>
        <Row className="mt-3">
            <Col>
                <Form.Select style={{ width: "100px" }}>
                    <option>한국어</option>
                </Form.Select>
            </Col>

            <Col className="text-end">
                <span>도움말</span>
                <span className="mx-3">개인정보처리방침</span>
                <span>약관</span>
            </Col>
        </Row>
        </div>
        

    </>)
}