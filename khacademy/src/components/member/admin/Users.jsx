import { Button, Col, Form, Row, Table } from "react-bootstrap";
import { FaMagnifyingGlass } from "react-icons/fa6";
import Nav from 'react-bootstrap/Nav';
import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@utils/reaxios";


export default function Users() {
    const [empList, setEmpList] = useState(null);

    useEffect(()=>{
        loadData();
    }, []);

    const loadData = useCallback( async()=>{
        const {data} = await apiClient.get("/admin/");

        setEmpList(data);
    }, []);

    console.log("empList : ", empList);

    if (empList === null) {
        return (<h1>로딩중인 화면</h1>);
    }
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
        <h1>회원관리</h1>

        <Row className="mt-4">
            <Col className="text-end">부서</Col>
            <Col>
                <Form.Select>

                </Form.Select>
            </Col>
            <Col className="text-end">직급</Col>
            <Col>
                <Form.Select></Form.Select>
            </Col>
            <Col className="text-end">재직상태</Col>
            <Col>
                <Form.Select></Form.Select>
            </Col>
            <Col>
                <Form.Control type="text" placeholder="사원명 입력">

                </Form.Control>
            </Col>
            <Col>
                <Button>
                    <FaMagnifyingGlass />
                </Button>
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
                            <th>재직여부</th>
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