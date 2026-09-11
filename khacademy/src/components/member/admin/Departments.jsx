import { useCallback, useEffect, useState, useMemo } from "react";
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
import Pagination from 'react-bootstrap/Pagination';
import Offcanvas from 'react-bootstrap/Offcanvas';
// import "../member.css";
import { BiSolidDownArrow, BiSolidUpArrow } from "react-icons/bi";

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

    const [show, setShow] = useState(false);

    const [page, setPage] = useState({
        page: 1,
        size: 10,
        sort: "deptNo",
        direction:"asc",
    });
    const [count, setCount] = useState(0);



    const loadData = useCallback(async () => {
        const { data } = await apiClient.post("/dept/", page);

        setDeptList(data.list);
        setCount(data.count);

    }, [page]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setSelectedDept(prev => ({
            ...prev,
            [name]: value
        }));
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
        try {
            await apiClient.put("/dept/edit", selectedDept);
            toast.success("수정되었습니다.");
            setShow(false);
            loadData();

        }
        catch (e) {
            console.log("e : ", e);
            toast.error("수정에 실패하였습니다. \n 잠시후 다시 시도해주세요");
        }
        setSelectedDept({});

    }, [selectedDept, loadData]);


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
                <h3>부서 목록</h3>
                <span className="text-muted">총 부서 : {count}개</span>
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
                        sort: "deptNo",
                        direction: prev.sort === "deptNo" && prev.direction === "asc" ? "desc" : "asc",
                    }))}>
                        <span>부서번호</span>
                        {page.sort === "deptNo" && page.direction === "asc" ? (
                            <BiSolidDownArrow className="ms-2" />
                        ) : (
                            <BiSolidUpArrow className="ms-2" />
                        )}
                    </th>
                    <th onClick={() => setPage(prev => ({
                        ...prev,
                        page: 1,
                        sort: "deptName",
                        direction: prev.sort === "deptName" && prev.direction === "asc" ? "desc" : "asc",
                    }))}>
                        <span>부서이름</span>
                        {page.sort === "deptName" && page.direction === "asc" ? (
                            <BiSolidDownArrow className="ms-2" />
                        ) : (
                            <BiSolidUpArrow className="ms-2" />
                        )}
                    </th>
                    <th>부서설명</th>
                    <th onClick={() => setPage(prev => ({
                        ...prev,
                        page: 1,
                        sort: "deptBlock",
                        direction: prev.sort === "deptBlock" && prev.direction === "asc" ? "desc" : "asc",
                    }))}>
                        <span>상태</span>
                        {page.sort === "deptBlock" && page.direction === "asc" ? (
                            <BiSolidDownArrow className="ms-2" />
                        ) : (
                            <BiSolidUpArrow className="ms-2" />
                        )}
                    </th>
                </tr>
            </thead>
            <tbody>
                {deptList.map((dept) => (
                    <tr key={dept.deptNo} className="member-table-item"
                        onClick={() => {
                            setShow(true);
                            setSelectedDept(dept);
                        }}>
                        <td>{dept.deptNo}</td>
                        <td>{dept.deptName}</td>
                        <td>{dept.deptInfo}</td>
                        <td>{dept.deptBlock}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
        <Offcanvas show={show}
            onHide={() => setShow(false)}
            placement="end"
            style={{ width: "800px" }}
        >
            {selectedDept && (<>
                <Offcanvas.Header closeButton>
                    <div>
                        <div>
                            <Offcanvas.Title>부서 정보</Offcanvas.Title>
                        </div>

                        <div className="profile-line"></div>
                    </div>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <Row className="mt-4">
                        <Form.Label column sm={3}>부서명</Form.Label>
                        <Col sm={9}>
                            <Form.Control type="text" name="deptName"
                                value={selectedDept.deptName}
                                onChange={changeStringValue} className="w-100">
                            </Form.Control>
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <Form.Label column sm={3}>하는 일</Form.Label>
                        <Col sm={9}>
                            <Form.Control type="text" name="deptInfo"
                                value={selectedDept.deptInfo}
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