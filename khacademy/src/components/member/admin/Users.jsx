import { Button, Col, Form, Row, Table } from "react-bootstrap";
import { FaCircle, FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import Nav from 'react-bootstrap/Nav';
import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@utils/reaxios";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import { useWebSocket } from "@websocket/WebSocketProvider";


export default function Users() {

    const [empList, setEmpList] = useState([]);

    //부서목록 불러오기(부서명검색선택에서 쓰임)
    const [deptList, setDeptList] = useState([]);

    //직급목록 불러오기(직급명검색선택에서 쓰임)
    const [positionList, setPositionList] = useState([]);

    //검색 키워드 state
    const [condition, setCondition] = useState({
        deptNo: "",
        positionNo: "",
        empstate: "",
        empName: "",
    });

    //로그인 중인 사용자 목록
    // const [users, setUsers] = useState({});


    

    // console.log("관리자 페이지로 가져온 로그인사용자명단 : ", users);

    const deptNameSearch = useCallback(async () => {

        const { data } = await apiClient.get("/dept/");
        setDeptList(data);

    }, [deptList]);



    const positionNameSearch = useCallback(async () => {

        const { data } = await apiClient.get("/position/");
        setPositionList(data);
    }, [positionList]);

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
        setCondition(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const search = useCallback(async () => {
        // console.log("검색 키워드:", condition);
        const { data } = await apiClient.post("/admin/complexSearch", condition);

        setEmpList(data);
        // console.log("복합검색결과 : ", data);

    }, [condition]);

    // const detailUsers = useCallback(async()=>{

    // }, []);

    return (<>
        <Nav variant="tabs" defaultActiveKey="/users">
            <Nav.Item>
                <Nav.Link as={Link} to="/users">사용자관리</Nav.Link>
            </Nav.Item>
            <Nav.Item>
                <Nav.Link as={Link} to="/departments" eventKey="link-1">부서관리</Nav.Link>
            </Nav.Item>
            <Nav.Item>
                <Nav.Link as={Link} to="/positions" eventKey="link-2">
                    직급관리
                </Nav.Link>
            </Nav.Item>
        </Nav>
        <Col className="d-flex justify-content-between align-items-center">
            <h1>회원관리</h1>
            <Button as={Link} to="/invite">
                <FaPlus />
                사용자 초대하기
            </Button>
        </Col>

        <Row className="mt-4">
            <Col className="d-flex">
                <div className="flex-fill">
                    <Form.Select name="deptNo" onClick={deptNameSearch} onChange={changeStringValue}>
                        <option value="">부서명 검색</option>
                        {deptList.map(dept => (
                            <option key={dept.deptNo} value={dept.deptNo}>
                                {dept.deptName}
                            </option>
                        ))}
                    </Form.Select>
                </div>
                <div className="flex-fill">
                    <Form.Select name="positionNo" onClick={positionNameSearch} onChange={changeStringValue}>
                        <option value="">직급명 검색</option>
                        {positionList.map(position => (
                            <option key={position.positionNo} value={position.positionNo}>
                                {position.positionName}
                            </option>
                        ))}
                    </Form.Select>
                </div>
                <div className="flex-fill">
                    <Form.Select name="empState" onChange={changeStringValue}>
                        <option value="">활성화 여부</option>
                        <option value="invited">초대완료</option>
                        <option value="active">활성화</option>
                        <option value="inactive">비활성화</option>

                    </Form.Select>
                </div>
                <div className="flex-fill">
                    <div className="d-flex">
                        <Form.Control name="empName"
                            placeholder="사원명검색" onChange={changeStringValue}
                        ></Form.Control>
                        <Button onClick={search}><FaMagnifyingGlass /></Button>
                    </div>
                </div>
            </Col>

        </Row>

        <Row className="mt-5">
            <Col>
                <Table responsive hover striped className="text-nowrap">
                    <thead>
                        <tr>
                            <th>회원번호</th>
                            <th>회원명</th>
                            <th>부서</th>
                            <th>직급</th>
                            <th>활성화상태</th>
                            <th>상세보기</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empList.map((emp) => {
                            const online = users.some(user => user.empNo === emp.empNo);

                            return(

                            
                    <tr key={emp.empNo}>
                        <td>{emp.empNo}</td>
                        <td>{emp.empName}
                            
                                <span className="ms-2">

                                    <FaCircle className={online? "text-success" : ""}/>
                                </span>
                        </td>
                        <td>{emp.deptName}</td>
                        <td>{emp.positionName}</td>
                        <td>{emp.empState}</td>
                        <td>
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
                                        </Popover.Body>
                                    </Popover>
                                }
                            >
                                <Button variant="secondary">
                                    <FaMagnifyingGlass />
                                </Button>
                            </OverlayTrigger>

                        </td>
                    </tr>
                    );
})}
                </tbody>
            </Table>
        </Col>
    </Row >


    </>)
}