import { Button, Col, Row, Table } from "react-bootstrap";
import Nav from 'react-bootstrap/Nav';
import { FaPlus } from "react-icons/fa6";
import { Link } from "react-router-dom";

export default function departments(){
    return(<>
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
        <h1>부서관리</h1>
        <Button>
            <FaPlus/>추가
        </Button>
        </Col>

        <Row className="mt-5">
            <Col>
                <Table responsive hover striped className="text-nowrap">
                    <thead>
                        <tr>
                            <th>부서번호</th>
                            <th>부서명</th>
                            <th>설명</th>
                            <th>활성화여부</th>
                            <th>수정</th>
                        </tr>
                    </thead>
                    <tbody>

                        <tr>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                    </tbody>
                </Table>
            </Col>
        </Row>
    </>)
}