import { useCallback, useEffect, useState } from "react";
import { Button, Col, Row, Table, Form, Card } from "react-bootstrap";
import Nav from 'react-bootstrap/Nav';
import { FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
// import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import Modal from 'react-bootstrap/Modal';
import { toast } from "react-toastify";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Swal from "sweetalert2";
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

        deptNo: null,
        deptName: "",
        deptInfo: "",
        deptBlock: "",
    });

    const [showPopover, setShowPopover] = useState(null);

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

    const setData = useCallback((dept) => {

        setSelectedDept(dept);
    }, []);

    const changeData = useCallback(async () => {
        const result = await Swal.fire({
            title: "부서 정보를 수정하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "수정",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;
        try{
            await apiClient.put("/dept/edit", selectedDept);
            toast.success("수정되었습니다.");

        loadData();

        setShowPopover(null);

        }
        catch(e){
            console.log("e : ", e);
            toast.error("수정에 실패하였습니다. \n 잠시후 다시 시도해주세요");
        }
        setSelectedDept({});

    }, [selectedDept, loadData]);

    return (<>

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
        <Card className="user-header fw-bold border-0">
            <Card.Body>
                <Row>
                    <Col className="text-nowrap">부서번호</Col>
                    <Col className="text-nowrap">부서이름</Col>
                    <Col className="text-nowrap">부서설명</Col>
                    <Col className="text-nowrap">활성화상태</Col>

                </Row>
            </Card.Body>
        </Card>

        {deptList.map((dept) => (
            <Card key={dept.deptNo} className="mt-2 card">
                <OverlayTrigger
                    trigger="click"
                    placement="bottom"
                    rootClose={true}
                    show={showPopover === dept.deptNo}
                    onToggle={(nextShow) => {
                        setShowPopover(nextShow ? dept.deptNo : null);
                    }}
                    overlay={
                        <Popover id={`popover-positioned-bottom`} className="user-popover">
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
                    {/* <Button variant="secondary" onClick={() => {
                        setData(dept);
                        setShowPopover(
                            showPopover === dept.deptNo ? null : dept.deptNo
                        )
                    }}>
                        <FaMagnifyingGlass />
                    </Button> */}

                    <Card.Body onClick={() => {
                        setData(dept);
                        setShowPopover(
                            showPopover === dept.deptNo ? null : dept.deptNo
                        )
                    }}>
                        <Row>
                            <Col className="text-nowrap">{dept.deptNo}</Col>
                            <Col className="text-nowrap">{dept.deptName}</Col>
                            <Col className="text-nowrap text-truncate">{dept.deptInfo}</Col>
                            <Col className="text-nowrap">{dept.deptBlock}</Col>
                        </Row>
                    </Card.Body>
                </OverlayTrigger>
            </Card>
        ))}



    </>)
}