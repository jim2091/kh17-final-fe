import { useCallback, useEffect, useState } from "react";
import { Button, Col, Row, Table, Form } from "react-bootstrap";
import Nav from 'react-bootstrap/Nav';
import { FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import Modal from 'react-bootstrap/Modal';
import { toast } from "react-toastify";

function MyVerticallyCenteredModal(props) {
    const [dept, setDept] = useState({
        deptName : "",
        deptInfo : "", 
        deptBlock : "",
    });

    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setDept(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const navigate = useNavigate();
    const sendData = useCallback(async()=>{
        await apiClient.post("/dept/add", dept);
        setDept(null);
        toast.success("부서가 추가되었습니다.");

        navigate("/departments");

    }, [dept]);

    if(dept === null){
        return(<h1>로딩중...</h1>);
    }


  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          부서 추가
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="mt-4">
            <Form.Label column sm={3}>부서명</Form.Label>
            <Col sm={9}>
                <Form.Control type="text" name="deptName" value={dept.deptName} 
                onChange={changeStringValue} className="w-50 d-inline-block">
                </Form.Control>
            </Col>
        </Row>
        <Row className="mt-4">
            <Form.Label column sm={3}>부서설명</Form.Label>
            <Col sm={9}>
                <Form.Control type="text" name="deptInfo" value={dept.deptInfo}
                onChange={changeStringValue} className="w-50 d-inline-block">
                </Form.Control>
            </Col>
        </Row>
        <Row className="mt-4">
            <Form.Label column sm={3}>활성화여부</Form.Label>
            <Col sm={9}>
                <Form.Check type="radio"
                 name="deptBlock" 
                 value="Y"
                className="d-inline-block" 
                label="Y"
                checked={dept.deptBlock === "Y"}
                onChange={changeStringValue}
                >
                </Form.Check>
                <Form.Check type="radio"
                 name="deptBlock" 
                 value="N"
                className="d-inline-block" 
                label="N"
                checked={dept.deptBlock === "N"}
                onChange={changeStringValue}
                >
                </Form.Check>
                </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={() => (props.onHide(), sendData())}>Add</Button>
        <Button onClick={props.onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function Departments() {

    const [deptList, setDeptList] = useState(null);

    const [modalShow, setModalShow] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/dept/");

        setDeptList(data);
    }, []);

    if (deptList === null) {
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
        <Col className="d-flex justify-content-between align-items-center">
            <h1>부서관리</h1>
            <Button variant="primary" onClick={() => setModalShow(true)}>
                <FaPlus />추가
            </Button>
            <MyVerticallyCenteredModal
                show={modalShow}
                onHide={() => setModalShow(false)}
            />
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
                        {deptList.map((dept) => (
                            <tr key={dept.deptNo}>
                                <td>{dept.deptNo}</td>
                                <td>{dept.deptName}</td>
                                <td>{dept.deptInfo}</td>
                                <td>{dept.deptBlock}</td>
                                <td>
                                    <FaMagnifyingGlass />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Col>
        </Row>
        
    </>)
}