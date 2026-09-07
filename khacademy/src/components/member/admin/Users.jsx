import { Button, Col, Form, Row, Table, Card } from "react-bootstrap";
import { FaCircle, FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import Nav from 'react-bootstrap/Nav';
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@utils/reaxios";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { useWebSocket } from "@websocket/WebSocketProvider";
import "../member.css";
import "@templates/project.css";


export default function Users() {

    const [empList, setEmpList] = useState([]);

    
    const [keyword, setKeyword] = useState("");

    const tabs = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", 
        "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];



    useEffect(() => {
        loadData();


    }, []);



    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/admin/");

        setEmpList(data);


        // console.log("전체 회원 목록 : ", data);
    }, []);

    const { users } = useWebSocket();

    // setUsers(users);
    // console.log("empList : ", empList);

    // if (empList === null) {
    //     return (<h1>로딩중인 화면</h1>);
    // }
    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setKeyword(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const search = useCallback(async () => {
        // console.log("검색 키워드:", condition);
        const { data } = await apiClient.post("/admin/complexSearch", keyword);

        setEmpList(data);
        // console.log("복합검색결과 : ", data);

    }, [keyword]);

    const searchInitial = useCallback(async (tab)=>{
        const{data} = await apiClient.post("/admin/initial", {
            tab : tab
        });

        setEmpList(data);
    }, []);


    return (<>
        <div className="p-4">
            <Row className="mt-4">
                <Col className="d-flex">
                    <Form.Control name="keyword"
                        placeholder="검색"
                        onChange={changeStringValue}
                        className="w-25"
                    ></Form.Control>
                    <Button onClick={search}
                        className="ms-2"
                    ><FaMagnifyingGlass /></Button>
                </Col>

            </Row>


            <Col className="d-flex justify-content-between align-items-center p-5">
                <h1>회원관리</h1>
                <Button as={Link} to="/invite">
                    <FaPlus />
                    사용자 초대하기
                </Button>
            </Col>


            <div className="tabs">
                <span className="tab" onClick={loadData}>전체</span>
                {tabs.map((tab)=>(
                    <div key={tab}
                            className="tab"
                            onClick={()=> searchInitial(tab)}>
                        <span>{tab}</span>
                    </div>
                ))}
                

            </div>


            {empList.map((emp) => {
                const online = users.some(user => user.empNo === emp.empNo);

                return (
                    <Card key={emp.empNo} className={`mt-2 card ${online ? "" : "text-muted"}`}>
                        <Card.Body>
                            <Row>
                                <Col>{emp.empNo}</Col>
                                <Col>
                                    <FaCircle className={online ? "text-info" : "text-secondary"} />
                                    <span className="ms-2">{online ? "online" : "offline"}</span>
                                </Col>
                                <Col>{emp.empName}</Col>
                                <Col>{emp.deptName}</Col>
                                <Col>{emp.positionName}</Col>
                                <Col>{emp.empState}</Col>
                                <Col>
                                    <OverlayTrigger
                                        trigger="click"
                                        placement="left"
                                        rootClose={true}
                                        overlay={
                                            <Popover id={`popover-positioned-left`}>
                                                <Popover.Header as="h3">{emp.empName}</Popover.Header>
                                                <Popover.Body>
                                                    <Row className="mt-4">
                                                        <Col>이메일</Col>
                                                        <Col>{emp.empEmail}</Col>
                                                    </Row>
                                                    <Row className="mt-4">
                                                        <Col>생년월일</Col>
                                                        <Col>{emp.empBirth}</Col>
                                                    </Row>
                                                    <Row className="mt-4">
                                                        <Col>연락처</Col>
                                                        <Col>{emp.empContact}</Col>
                                                    </Row>
                                                    <Row className="mt-4">
                                                        <Col>주소</Col>
                                                        <Col>{emp.empAddress1}</Col>
                                                    </Row>
                                                    <Row className="mt-4">
                                                        <Button>
                                                            <span>사용자관리</span>
                                                        </Button>
                                                    </Row>
                                                </Popover.Body>
                                            </Popover>
                                        }
                                    >
                                        <Button variant="secondary">
                                            <FaMagnifyingGlass />
                                        </Button>
                                    </OverlayTrigger>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                );
            })}


        </div>
    </>)
}