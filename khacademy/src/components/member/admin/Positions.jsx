import { useCallback, useEffect, useState, useMemo } from "react";
import { Button, Col, Row, Table, Form, Card } from "react-bootstrap";
import { FaPlus } from "react-icons/fa6";
import { apiClient } from "@utils/reaxios";
import Modal from 'react-bootstrap/Modal';
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Pagination from 'react-bootstrap/Pagination';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { BiSolidDownArrow, BiSolidUpArrow } from "react-icons/bi";

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
        positionOrder: 0,
        positionBlock: "",
    });
    const [show, setShow] = useState(false);

    const [page, setPage] = useState({
        page: 1,
        size: 10,
        sort: "positionNo",
        direction : "asc",

    });
    const [count, setCount] = useState(0);



    const loadData = useCallback(async () => {
        const { data } = await apiClient.post("/position/", page);

        setPositionList(data.list);
        setCount(data.count);
    }, [page]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setSelectedPosition(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);
    const changeNumericValue = useCallback((e) => {
        const { name, value } = e.target;

        setSelectedPosition({
            ...selectedPosition,//나머지 유지
            [name]: value
        });
    }, [selectedPosition]);



    const changeData = useCallback(async () => {
        const result = await Swal.fire({
            title: "직급 정보를 수정하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "수정",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;
        try {

            await apiClient.put("/position/edit", selectedPosition);
            toast.success("직급 정보가 수정되었습니다");

            setShow(false);

            loadData();

        }
        catch (e) {
            console.log("e : ", e);
            toast.error("수정에 실패하였습니다. \n 잠시후 다시 시도해주세요");
        }
        setSelectedPosition({});

    }, [selectedPosition, loadData]);

    const totalPage = useMemo(() => {
        return Math.ceil(count / page.size);
    }, [count, page]);

    const pageGroup = useMemo(() => {
        return Math.ceil(page.page / 5);
    }, [page]);

    const startPage = useMemo(() => {
        return (pageGroup - 1) * 5 + 1;
    }, [pageGroup]);

    const endPage = useMemo(() => {
        return Math.min(pageGroup * 5, totalPage);
    }, [pageGroup, totalPage]);
    return (<>

        <Col className="d-flex justify-content-between align-items-center p-5">
            <div>
                <h3>직급 목록</h3>
                <span className="text-muted">총 직급 : {count}개</span>
            </div>
            <Button variant="primary" onClick={() => setModalShow(true)}>
                <FaPlus />추가
            </Button>
            <MyVerticallyCenteredModal
                show={modalShow}
                onHide={() => setModalShow(false)}
                onAdd={loadData}
            />
        </Col>
        <Table className="member-table">
            <thead>
                <tr>
                    <th onClick={() => setPage(prev => ({
                        ...prev,
                        page: 1,
                        sort: "positionNo",
                        direction: prev.sort === "positionNo" && prev.direction === "asc" ? "desc" : "asc",
                    }))}>
                        <span>직급번호</span>
                        {page.sort === "positionNo" && page.direction === "asc" ? (
                            <BiSolidDownArrow className="ms-2" />
                        ) : (
                            <BiSolidUpArrow className="ms-2" />
                        )}
                    </th>
                    <th onClick={() => setPage(prev => ({
                        ...prev,
                        page: 1,
                        sort: "positionName",
                        direction: prev.sort === "positionName" && prev.direction === "asc" ? "desc" : "asc",
                    }))}>
                        <span>직급이름</span>
                        {page.sort === "positionName" && page.direction === "asc" ? (
                            <BiSolidDownArrow className="ms-2" />
                        ) : (
                            <BiSolidUpArrow className="ms-2" />
                        )}
                    </th>
                    <th>직급설명</th>
                    <th onClick={() => setPage(prev => ({
                        ...prev,
                        page: 1,
                        sort: "positionOrder",
                        direction: prev.sort === "positionOrder" && prev.direction === "asc" ? "desc" : "asc",
                    }))}>
                        <span>직급순서</span>
                        {page.sort === "positionOrder" && page.direction === "asc" ? (
                            <BiSolidDownArrow className="ms-2" />
                        ) : (
                            <BiSolidUpArrow className="ms-2" />
                        )}
                    </th>
                    <th onClick={() => setPage(prev => ({
                        ...prev,
                        page: 1,
                        sort: "positionBlock",
                        direction: prev.sort === "positionBlock" && prev.direction === "asc" ? "desc" : "asc",
                    }))}>
                        <span>상태</span>
                        {page.sort === "positionBlock" && page.direction === "asc" ? (
                            <BiSolidDownArrow className="ms-2" />
                        ) : (
                            <BiSolidUpArrow className="ms-2" />
                        )}
                    </th>
                </tr>
            </thead>
            <tbody>
                {positionList.map((position) => (
                    <tr key={position.positionNo} className="member-table-item"
                        onClick={() => {
                            setShow(true);
                            setSelectedPosition(position);
                        }}>
                        <td>{position.positionNo}</td>
                        <td>{position.positionName}</td>
                        <td>{position.positionInfo}</td>
                        <td>{position.positionOrder}</td>
                        <td>{position.positionBlock}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
        <Offcanvas show={show}
            onHide={() => setShow(false)}
            placement="end"
            style={{ width: "800px" }}
        >
            {selectedPosition && (<>
                <Offcanvas.Header closeButton>
                    <div>
                        <div>
                            <Offcanvas.Title>직급 정보</Offcanvas.Title>
                        </div>

                        <div className="profile-line"></div>
                    </div>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <Row className="mt-4">
                        <Form.Label column sm={3}>직급명</Form.Label>
                        <Col sm={9}>
                            <Form.Control type="text" name="positionName"
                                value={selectedPosition.positionName}
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
                        <Form.Label column sm={3}>직급 순서</Form.Label>
                        <Col sm={9}>
                            <Form.Control type="text" name="positionOrder"
                                value={selectedPosition.positionOrder}
                                onChange={changeNumericValue} className="w-100">
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
                </Offcanvas.Body>
            </>)}
        </Offcanvas>

        <Pagination size="lg" className="mt-5 justify-content-center my-pagination">
            <Pagination.Prev
                disabled={pageGroup === 1}
                onClick={() =>
                    setPage(prev => ({
                        ...prev,
                        page: startPage - 1
                    }))
                }
            />
            {Array.from(
                { length: endPage - startPage + 1 },
                (_, index) => startPage + index)
                .map(pageNumber => (

                    <Pagination.Item
                        key={pageNumber}
                        active={page.page === pageNumber}
                        onClick={() =>
                            setPage(prev => ({
                                ...prev,
                                page: pageNumber
                            }))}
                    >{pageNumber}</Pagination.Item>

                ))}


            <Pagination.Next
                disabled={endPage === totalPage}
                onClick={() =>
                    setPage(prev => ({
                        ...prev,
                        page: endPage + 1
                    }))
                }
            />
        </Pagination>


    </>)
}