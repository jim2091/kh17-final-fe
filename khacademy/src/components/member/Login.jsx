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
import { socketState } from "@utils/storage";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { heartbeatState } from "@utils/storage";
import { onlineState } from "@utils/storage";

export default function Login() {

    //state
    const [emp, setEmp] = useState({
        empEmail : "",
        empPassword : ""
    });

    //WebSocket state
    // const [client, setClient] = useState(null);
    // const[socket, setSocket] = useAtom(socketState);

    // const[heartbeatInterval, setHeartbeatInterval] = useAtom(heartbeatState);

    // const[online, setOnline] = useAtom(onlineState);

    
    const loginAction = useSetAtom(loginActionState);

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

            connectToServer();

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

    // console.log("socket : " , socket);

    // const connectToServer = useCallback(()=>{
    //     const socket = new SockJS(`${import.meta.env.VITE_SERVER_URL}/ws`);

    //     const client = new Client({

    //         webSocketFactory : () => socket,

    //         onConnect: ()=>{
                

    //             setSocket(client);

    //             client.subscribe("/public/online", (message)=>{

    //                 const data = JSON.parse(message.body);

    //                 console.log("온라인 상태 : ", data);

    //                 setOnline(data);
    //             });
                

    //             //10초마다 연결 확인
    //             const intervalId = setInterval(()=>{
    //                 if(client.connected){
    //                     client.publish({
    //                         destination: "/app/heartbeat",
    //                         body:""
    //                     });
    //                     console.log("heartbeat 전송");
    //                 }
    //             }, 10000);

    //             setHeartbeatInterval(intervalId);
    //         },

    //         debug:(str)=>console.log(str)

    //     });


    //     client.activate();

    // }, []);

    
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