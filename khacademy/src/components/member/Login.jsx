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

export default function Login() {

    //state
    const [emp, setEmp] = useState({
        empEmail : "",
        empPassword : ""
    });
    //jotai state
    //const [loginUser, setLoginUser] = useAtom(loginUserState);

    //쓰기 전용 atom
    //const [_, loginAction] = useAtom(loginActionState);
    const loginAction = useSetAtom(loginActionState);

    //navigate
    const navigate = useNavigate();

    //입력
    const changeStringValue = useCallback(e=>{
        const { name, value } = e.target;
        setEmp(prev=>({
            ...prev,
            [name] : value
        }));
    }, []);
    //로그인
    const sendLogin = useCallback(async ()=>{
        //미입력 시 차단
        if(emp.empEmail === "" && emp.empPassword === "") {
            await Swal.fire("모든 정보를 입력하세요");
            return;
        }

        try {
            const {data} = await authClient.post("/login", emp);

            loginAction(data);

            navigate("/");

        }
        catch(e){
           
            if(e.status === 403) {
                navigate("/emp/inactive");
            }
            else if(e.status === 404) {
                await Swal.fire("정보가 일치하지 않습니다");
            }
            else {//500
                await Swal.fire("일시적인 서버 오류입니다.\n잠시 후 실행해주세요");
            }
        }
    }, [emp, loginAction]);

    
    return (<>

    <Row className="mt-4">
            <Form.Label column sm={3}>이메일</Form.Label>
            <Col sm={9}>
                <Form.Control type="text" name="empEmail" value={emp.empEmail}
                        onChange={changeStringValue} placeholder="User EMAIL"
                        autoFocus/>
            </Col>
        </Row>
        <Row className="mt-4">
            <Form.Label column sm={3}>비밀번호</Form.Label>
            <Col sm={9}>
                <Form.Control type="password" name="empPassword" 
                        value={emp.empPassword}
                        onChange={changeStringValue} placeholder="User Password"/>
            </Col>
        </Row>
        

        <Row className="mt-5">
            <Col className="text-end">
                <Button variant="success" size="lg" onClick={sendLogin}>
                    <FaRightToBracket/>
                    <span className="ms-2">로그인</span>
                </Button>
            </Col>
        </Row>
       
    </>)
}