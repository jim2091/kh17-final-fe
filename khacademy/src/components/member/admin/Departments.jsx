import { useCallback, useEffect, useState } from "react";
import { Button, Col, Row, Table, Form } from "react-bootstrap";
import Nav from 'react-bootstrap/Nav';
import { FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import Modal from 'react-bootstrap/Modal';
import { toast } from "react-toastify";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
// import "../member.css";

function MyVerticallyCenteredModal(props) {
    const [dept, setDept] = useState({
        deptName: "",
        deptInfo: "",
        deptBlock: "",
    });

    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setDept(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const navigate = useNavigate();
    const sendData = useCallback(async () => {
        await apiClient.post("/dept/add", dept);
        toast.success("부서가 추가되었습니다.");

        setDept({
            deptName: "",
            deptInfo: "",
            deptBlock: "",
        });

        // 부모에게 "추가 완료"를 알림
        props.onAdd();

        // 모달 닫기
        props.onHide();

    }, [dept, props]);




    return (
        <Modal
            {...props}
            onHide={() => {
                setDept({
                    deptName: "",
                    deptInfo: "",
                    deptBlock: "",
                });

                props.onHide();
            }}
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
                <Button onClick={sendData}>Add</Button>
                <Button onClick={() => {
                    setDept({
                        deptName: "",
                        deptInfo: "",
                        deptBlock: "",
                    });
                    props.onHide();
                }}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default function Departments() {

    const [deptList, setDeptList] = useState([]);

    const [modalShow, setModalShow] = useState(false);

    const [selectedDept, setSelectedDept] = useState({

        deptNo : null,
        deptName : "",
        deptInfo : "",
        deptBlock : "",
    });

    const[showPopover, setShowPopover] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/dept/");

        setDeptList(data);
    }, []);

    // if (deptList === null) {
    //     return (<h1>로딩중인 화면</h1>);
    // }
    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setSelectedDept(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const setData = useCallback((dept)=>{

        setSelectedDept(dept);
    }, []);

    const changeData = useCallback(async()=>{
        await apiClient.put("/dept/edit", selectedDept);

        loadData();

        setShowPopover(null);
        
    }, [selectedDept, loadData]);

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
        <Col className="d-flex justify-content-between align-items-center p-5">
            <h1>부서관리</h1>
            <Button variant="primary" onClick={() => setModalShow(true)}>
                <FaPlus />추가
            </Button>
            <MyVerticallyCenteredModal
                show={modalShow}
                onHide={() => setModalShow(false)}
                onAdd={loadData}
            />
        </Col>

        <Row className="mt-5 p-5">
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
                                <td className="text-center">{dept.deptNo}</td>
                                <td>{dept.deptName}</td>
                                <td>{dept.deptInfo}</td>
                                <td>{dept.deptBlock}</td>
                                <td>
                                    <OverlayTrigger
                                        trigger="click"
                                        placement="left"
                                        rootClose={true}
                                        show={showPopover === dept.deptNo}
                                        onToggle={(nextShow)=>{
                                            setShowPopover(nextShow? dept.deptNo : null);
                                        }}
                                        overlay={
                                            <Popover id={`popover-positioned-left`}>
                                                <Popover.Header as="h3">{dept.deptName}</Popover.Header>
                                                <Popover.Body>
                                                    <Row className="mt-4">
                                                        <Form.Label column sm={3}>부서명</Form.Label>
                                                        <Col sm={9}>
                                                            <Form.Control type="text" name="deptName" value={selectedDept.deptName}
                                                                onChange={changeStringValue} className="w-100">
                                                            </Form.Control>
                                                        </Col>
                                                    </Row>
                                                    <Row className="mt-4">
                                                        <Form.Label column sm={3}>하는 일</Form.Label>
                                                        <Col sm={9}>
                                                            <Form.Control type="text" name="deptInfo" value={selectedDept.deptInfo}
                                                                onChange={changeStringValue} className="w-100">
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
                                                                checked={selectedDept.deptBlock === "Y"}
                                                                onChange={changeStringValue}
                                                            >
                                                            </Form.Check>
                                                            <Form.Check type="radio"
                                                                name="deptBlock"
                                                                value="N"
                                                                className="d-inline-block"
                                                                label="N"
                                                                checked={selectedDept.deptBlock === "N"}
                                                                onChange={changeStringValue}
                                                            >
                                                            </Form.Check>
                                                        </Col>
                                                    </Row>
                                                    <Row className="mt-4">
                                                        <Button onClick={changeData}>
                                                            <span>수정</span>
                                                        </Button>
                                                    </Row>

                                                </Popover.Body>
                                            </Popover>
                                        }
                                    >
                                        <Button variant="secondary" onClick={()=>{
                                            setData(dept);
                                            setShowPopover(
                                                showPopover === dept.deptNo? null : dept.deptNo
                                            )
                                        }}>
                                            <FaMagnifyingGlass />
                                        </Button>
                                    </OverlayTrigger>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Col>
        </Row>

    </>)
}