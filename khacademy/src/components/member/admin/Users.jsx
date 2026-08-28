import { Button, Col, Form, Row, Table } from "react-bootstrap";
import { FaCircle, FaMagnifyingGlass, FaPlus, FaRegCircle } from "react-icons/fa6";
import Nav from 'react-bootstrap/Nav';
import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@utils/reaxios";


export default function Users() {
    const [empList, setEmpList] = useState([]);

    //부서목록 불러오기(부서명검색선택에서 쓰임)
    const [deptList, setDeptList] = useState([]);

    const deptNameSearch = useCallback(async()=>{

        const {data} = await apiClient.get("/dept/");
        setDeptList(data);
        
    }, [deptList]);

    //직급목록 불러오기(직급명검색선택에서 쓰임)
    const [positionList, setPositionList] = useState([]);

    const positionNameSearch = useCallback(async()=>{

        const {data} = await apiClient.get("/position/");
        setPositionList(data);
    }, [positionList]);

    useEffect(()=>{
        loadData();
    }, []);

    const loadData = useCallback( async()=>{
        const {data} = await apiClient.get("/admin/");

        setEmpList(data);
    }, []);

    // console.log("empList : ", empList);

    // if (empList === null) {
    //     return (<h1>로딩중인 화면</h1>);
    // }
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
            <FaPlus/>
            사용자 초대하기
        </Button>
        </Col>

        <Row className="mt-4">
            <Col className="d-flex">
            <div className="flex-fill">
                <Form.Select onClick={deptNameSearch}>
                    <option value="">부서명 검색</option>
                    {deptList.map(dept=>(
                        <option key={dept.deptNo} value={dept.deptNo}>
                            {dept.deptName}
                        </option>
                    ))}
                </Form.Select>
            </div>
            <div className="flex-fill">
                <Form.Select onClick={positionNameSearch}>
                    <option value="">직급명 검색</option>
                    {positionList.map(position=>(
                        <option key={position.positionNo} value={position.positionNo}>
                            {position.positionName}
                        </option>
                    ))}
                </Form.Select>
            </div>
            <div className="flex-fill">
                <Form.Select>
                    <option value="">활성화 여부</option>
                    
                </Form.Select>
            </div>
            <div className="flex-fill">
                <div className="d-flex">
                <Form.Control
                placeholder="사원명검색"
                ></Form.Control>
                <Button><FaMagnifyingGlass/></Button>
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
                            <th>활성화여부</th>
                            <th>상세보기</th>
                        </tr>
                    </thead>
                    <tbody>
                    {empList.map((emp)=>(

                        <tr key={emp.empNo}>
                            <td>{emp.empNo}</td>
                            <td>{emp.empName}</td>
                            <td>{emp.deptName}</td>
                            <td>{emp.positionName}</td>
                            <td>{emp.state}</td>
                            <td>
                                <FaMagnifyingGlass/>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </Col>
        </Row>


    </>)
}