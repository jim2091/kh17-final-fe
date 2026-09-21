import { useCallback, useEffect, useState, useMemo } from "react";
import { Button, Col, Row, Table, Form, Card, Badge } from "react-bootstrap";
import { apiClient } from "@utils/reaxios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Pagination from 'react-bootstrap/Pagination';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { BiSolidDownArrow, BiSolidUpArrow } from "react-icons/bi";
import '../member.css';



export default function Departments() {

    const [dept, setDept] = useState({
        deptName: "",
        deptInfo: "",
        deptBlock: "N",
    });

    const changeDeptValue = useCallback(e => {
        const { name, value } = e.target;
        setDept(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    // const sendData = useCallback(async () => {

    //     await apiClient.post("/dept/add", dept);
    //     toast.success("부서가 추가되었습니다.");

    //     setDept({
    //         deptName: "",
    //         deptInfo: "",
    //         deptBlock: "",
    //     });



    // }, [dept]);
    const sendData = async () => {
        console.log("sendData 실행");

        // 부서명
        if (!dept.deptName || dept.deptName.trim() === "") {
            Swal.fire({
                icon: "warning",
                title: "부서명을 입력해주세요.",
            });
            return;
        }

        if (!/^[가-힣]{3,10}$/.test(dept.deptName)) {
            Swal.fire({
                icon: "warning",
                title: "부서명을 확인해주세요.",
                text: "부서명은 한글 3~10자로 입력해주세요.",
            });
            return;
        }

        // 부서 설명
        if (dept.deptInfo && dept.deptInfo.length > 300) {
            Swal.fire({
                icon: "warning",
                title: "부서 설명이 너무 깁니다.",
                text: "부서 설명은 300자 이내로 입력해주세요.",
            });
            return;
        }

        // 활성화 여부
        if (dept.deptBlock !== "Y" && dept.deptBlock !== "N") {
            Swal.fire({
                icon: "warning",
                title: "활성화 여부를 선택해주세요.",
            });
            return;
        }

        try {

            await apiClient.post("/admin/departments", dept);

            Swal.fire({
                icon: "success",
                title: "부서가 추가되었습니다.",
            });

            // 등록 후 초기화
            setDept({
                deptName: "",
                deptInfo: "",
                deptBlock: "Y",
            });

        } catch (error) {

            console.error(error);

            Swal.fire({
                icon: "error",
                title: "부서 추가에 실패했습니다.",
                text: "잠시 후 다시 시도해주세요.",
            });
        }
    };

    const [deptList, setDeptList] = useState([]);

    // const [modalShow, setModalShow] = useState(false);

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
        direction: "asc",
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
        <div>
            <div className="department-main">
                <div className="department-card">
                    <Col className="d-flex justify-content-between align-items-center p-5">
                        <div>

                            <h3>부서 목록</h3>
                            <span className="text-muted">총 부서 : {count}개</span>
                        </div>

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
                                <tr key={dept.deptNo}
                                    className="member-table-item"
                                    onClick={() => {
                                        setShow(true);
                                        setSelectedDept(dept);
                                    }}>
                                    <td>{dept.deptNo}</td>
                                    <td>{dept.deptName}</td>
                                    <td>{dept.deptInfo}</td>
                                    <td>
                                        {dept.deptBlock}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

                <div className="department-side">
                    <div>
                        <div>
                            <h4>새 부서 추가</h4>
                        </div>

                        <div className="profile-line"></div>
                    </div>
                    <Row className="mt-4">
                        <Form.Label column sm={3}>부서명</Form.Label>
                        <Col sm={9}>
                            <Form.Control type="text" name="deptName" value={dept.deptName}
                                onChange={changeDeptValue} className="w-100 d-inline-block">
                            </Form.Control>
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <Form.Label column sm={3}>부서설명</Form.Label>
                        <Col sm={9}>
                            <Form.Control type="text" name="deptInfo" value={dept.deptInfo}
                                onChange={changeDeptValue} className="w-100 d-inline-block">
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
                                onChange={changeDeptValue}
                            >
                            </Form.Check>
                            <Form.Check type="radio"
                                name="deptBlock"
                                value="N"
                                className="d-inline-block"
                                label="N"
                                checked={dept.deptBlock === "N"}
                                onChange={changeDeptValue}
                            >
                            </Form.Check>
                        </Col>
                    </Row>
                    <Row>
                        <Col className="text-end">
                            <Button onClick={sendData}>Add</Button>
                        </Col>
                    </Row>
                </div>
                <Pagination size="lg" className="justify-content-center dept-pagination">
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
            </div>
        </div>
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


    </>)
}