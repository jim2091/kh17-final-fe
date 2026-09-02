import { useCallback, useEffect, useState } from "react";
import { Button, Col, Row, Table, Form, Card } from "react-bootstrap";
import Nav from 'react-bootstrap/Nav';
import { FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "@utils/reaxios";
import Modal from 'react-bootstrap/Modal';
import { toast } from "react-toastify";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';

function MyVerticallyCenteredModal(props) {
    const [position, setPosition] = useState({
        positionName: "",
        positionInfo: "",
        positionBlock: "",
    });

    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setPosition(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const sendData = useCallback(async () => {
        await apiClient.post("/position/add", position);
        toast.success("직급이 추가되었습니다.");

        setPosition({
            positionName: "",
            positionInfo: "",
            positionBlock: "",
        });

        // 부모에게 "추가 완료"를 알림
        props.onAdd();

        // 모달 닫기
        props.onHide();

    }, [position, props]);




    return (
        <Modal
            {...props}
            onHide={() => {
                setPosition({
                    positionName: "",
                    positionInfo: "",
                    positionBlock: "",
                });

                props.onHide();
            }}
            size="lg"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    직급 추가
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row className="mt-4">
                    <Form.Label column sm={3}>직급명</Form.Label>
                    <Col sm={9}>
                        <Form.Control type="text" name="positionName" value={position.positionName}
                            onChange={changeStringValue} className="w-50 d-inline-block">
                        </Form.Control>
                    </Col>
                </Row>
                <Row className="mt-4">
                    <Form.Label column sm={3}>직급설명</Form.Label>
                    <Col sm={9}>
                        <Form.Control type="text" name="positionInfo" value={position.positionInfo}
                            onChange={changeStringValue} className="w-50 d-inline-block">
                        </Form.Control>
                    </Col>
                </Row>
                <Row className="mt-4">
                    <Form.Label column sm={3}>활성화여부</Form.Label>
                    <Col sm={9}>
                        <Form.Check type="radio"
                            name="positionBlock"
                            value="Y"
                            className="d-inline-block"
                            label="Y"
                            checked={position.positionBlock === "Y"}
                            onChange={changeStringValue}
                        >
                        </Form.Check>
                        <Form.Check type="radio"
                            name="positionBlock"
                            value="N"
                            className="d-inline-block"
                            label="N"
                            checked={position.positionBlock === "N"}
                            onChange={changeStringValue}
                        >
                        </Form.Check>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={sendData}>Add</Button>
                <Button onClick={() => {
                    setPosition({
                        positionName: "",
                        positionInfo: "",
                        positionBlock: "",
                    });
                    props.onHide();
                }}
                >
                    Close</Button>
            </Modal.Footer>
        </Modal>
    );
}
export default function Positions() {

    const [positionList, setPositionList] = useState([]);

    const [modalShow, setModalShow] = useState(false);

    const [selectedPosition, setSelectedPosition] = useState({

        positionNo: null,
        positionName: "",
        positionInfo: "",
        positionBlock: "",
    });

    const [showPopover, setShowPopover] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = useCallback(async () => {
        const { data } = await apiClient.get("/position/");

        setPositionList(data);
    }, []);

    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setSelectedPosition(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const setData = useCallback((position) => {

        setSelectedPosition(position);
    }, []);

    const changeData = useCallback(async () => {
        await apiClient.put("/position/edit", selectedPosition);

        loadData();

        setShowPopover(null);

    }, [selectedPosition, loadData]);
    return (<>

        <Col className="d-flex justify-content-between align-items-center p-5">
            <h1>직급관리</h1>
            <Button variant="primary" onClick={() => setModalShow(true)}>
                <FaPlus />추가
            </Button>
            <MyVerticallyCenteredModal
                show={modalShow}
                onHide={() => setModalShow(false)}
                onAdd={loadData}
            />
        </Col>

        {positionList.map((position) => (
            <Card className="mt-2 card">
                <Card.Body>
                    <Row>
                        <Col>{position.positionNo}</Col>
                        <Col>{position.positionName}</Col>
                        <Col>{position.positionInfo}</Col>
                        <Col>{position.positionBlock}</Col>
                        <Col>
                            <OverlayTrigger
                                trigger="click"
                                placement="left"
                                rootClose={true}
                                show={showPopover === position.positionNo}
                                onToggle={(nextShow) => {
                                    setShowPopover(nextShow ? position.positionNo : null);
                                }}
                                overlay={
                                    <Popover id={`popover-positioned-left`}>
                                        <Popover.Header as="h3">{position.positionName}</Popover.Header>
                                        <Popover.Body>
                                            <Row className="mt-4">
                                                <Form.Label column sm={3}>직급명</Form.Label>
                                                <Col sm={9}>
                                                    <Form.Control type="text" name="positionName" value={selectedPosition.positionName}
                                                        onChange={changeStringValue} className="w-100">
                                                    </Form.Control>
                                                </Col>
                                            </Row>
                                            <Row className="mt-4">
                                                <Form.Label column sm={3}>하는 일</Form.Label>
                                                <Col sm={9}>
                                                    <Form.Control type="text" name="positionInfo" value={selectedPosition.positionInfo}
                                                        onChange={changeStringValue} className="w-100">
                                                    </Form.Control>
                                                </Col>
                                            </Row>
                                            <Row className="mt-4">
                                                <Form.Label column sm={3}>활성화여부</Form.Label>
                                                <Col sm={9}>
                                                    <Form.Check type="radio"
                                                        name="positionBlock"
                                                        value="Y"
                                                        className="d-inline-block"
                                                        label="Y"
                                                        checked={selectedPosition.positionBlock === "Y"}
                                                        onChange={changeStringValue}
                                                    >
                                                    </Form.Check>
                                                    <Form.Check type="radio"
                                                        name="positionBlock"
                                                        value="N"
                                                        className="d-inline-block"
                                                        label="N"
                                                        checked={selectedPosition.positionBlock === "N"}
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
                                <Button variant="secondary" onClick={() => {
                                    setData(position);
                                    setShowPopover(
                                        showPopover === position.positionNo ? null : position.positionNo
                                    )
                                }}>
                                    <FaMagnifyingGlass />
                                </Button>
                            </OverlayTrigger>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        ))}


    </>)
}