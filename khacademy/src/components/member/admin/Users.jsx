import { Button, Col, Form, Row, Card } from "react-bootstrap";
import { FaArrowDown, FaCircle, FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@utils/reaxios";
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import "../member.css";
import "@templates/project.css";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import NoImage from "@assets/noimages.png";
import Pagination from 'react-bootstrap/Pagination';
import Offcanvas from 'react-bootstrap/Offcanvas';

function OffCanvasExample({ name, ...props }) {
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    return (
        <>
            <Button variant="primary" onClick={handleShow} className="me-2">
                {name}
            </Button>
            <Offcanvas show={show} onHide={handleClose} {...props}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Offcanvas</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    Some text as placeholder. In real life you can have the elements you
                    have chosen. Like, text, images, lists, etc.
                </Offcanvas.Body>
            </Offcanvas>
        </>
    );
}

export default function Users() {

    const [empList, setEmpList] = useState([]);


    const [keyword, setKeyword] = useState("");

    const [selectedEmp, setSelectedEmp] = useState({});

    const [page, setPage] = useState({
        page: 1,
        size: 10,
        sort: "empNo",
        direction: "asc",
    });

    const [count, setCount] = useState(0);

    const tabs = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ",
        "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

    const [isSearch, setIsSearch] = useState(false);

    const [show, setShow] = useState(false);




    //부서목록 불러오기(부서명검색선택에서 쓰임)
    const [deptList, setDeptList] = useState([]);

    const deptNameSearch = useCallback(async () => {

        const { data } = await apiClient.get("/dept/search");
        setDeptList(data);

    }, [deptList]);

    //직급목록 불러오기
    const [positionList, setPositionList] = useState([]);

    const positionNameSearch = useCallback(async () => {

        const { data } = await apiClient.get("/position/search");
        setPositionList(data);

    }, [positionList]);




    // console.log("page : ", page);
    const loadData = useCallback(async () => {
        if (isSearch) return;

        const { data } = await apiClient.post("/admin/", page);

        setEmpList(data.list);
        setCount(data.count);


    }, [page]);

    useEffect(() => {
        loadData();


    }, [loadData]);





    const changeStringValue = useCallback(e => {
        const { name, value } = e.target;
        setKeyword(prev => ({
            ...prev,
            [name]: value
        }));
    }, []);

    const changeNumericValue = useCallback((e) => {
        const { name, value } = e.target;

        setSelectedEmp({
            ...selectedEmp,//나머지 유지
            [name]: value
        });
    }, [selectedEmp]);

    const search = useCallback(async (e) => {

        e.preventDefault();

        const newPage = {
            ...page,
            page: 1,
            sort: "empNo",

        }
        setPage(newPage);
        setIsSearch(true);
        // loadData();

        const { data } = await apiClient.post("/admin/complexSearch",
            {
                keyword: keyword.keyword,
                pageVO: newPage,
            }
        );

        setEmpList(data.list);
        setCount(data.count);

    }, [keyword, page]);
    // console.log("count : ", count);


    const searchInitial = useCallback(async (tab) => {
        const newPage = {
            ...page,
            page: 1,
            sort: "empNo",

        }
        setPage(newPage);
        setIsSearch(true);

        const { data } = await apiClient.post("/admin/initial", {
            tab: tab,
            pageVO: newPage,
        });

        // setPage(prev=>({...prev, page : 1}));
        setEmpList(data.list);
        setCount(data.count);
    }, [page]);
    // console.log("list : ", empList);

    const changeState = useCallback(async (emp) => {
        const result = await Swal.fire({
            title: emp.empState === "active" ? "비활성화 하시겠습니까? " : "활성화하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: emp.empState === "active" ? "비활성화" : "활성화",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;

        try {
            await apiClient.patch(`/admin/active/${emp.empNo}`);
            toast.success(emp.empState === "active" ? "비활성화되었습니다" : "활성화되었습니다.");
            setIsSearch(false);
            setPage(prev => ({
                ...prev,
                page: 1,
                sort: "empNo",
                direction: "asc",
            }));
        }
        catch (e) {
            console.log("에러 : ", e);
            toast.error("실행이 실패하였습니다. \n 잠시 후 다시 시도해주세요");
        }

    }, []);

    const changeData = useCallback(async (selectedEmp) => {
        const result = await Swal.fire({
            title: "사원 정보를 수정하시겠습니까?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "수정",
            cancelButtonText: "취소"
        });

        if (result.isConfirmed === false) return;

        try {
            await apiClient.put(`/admin/memberEdit/`, {
                empNo: selectedEmp.empNo,
                empDeptNo: selectedEmp.empDeptNo,
                empPositionNo: selectedEmp.empPositionNo,
            });
            toast.success("수정되었습니다.");
            setIsSearch(false);
            setPage(prev => ({
                ...prev,
                page: 1,
                sort: "empNo",
                direction: "asc",
            }));

        }
        catch (error) {
            console.log("error : ", error);
            toast.error("수정이 실패하였습니다. \n잠시 후 다시 시도해주세요.");

        }
        setSelectedEmp({});
    }, [selectedEmp]);



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
        <div className="p-4">
            <Form autoComplete="off" onSubmit={search}>
                <Row className="mt-4">
                    <Col className="d-flex">
                        <Form.Control name="keyword"
                            placeholder="검색"
                            onChange={changeStringValue}
                            className="w-25"
                        ></Form.Control>
                        <Button type="submit"
                            className="ms-2"
                        ><FaMagnifyingGlass /></Button>
                    </Col>
                </Row>
            </Form>


            <Col className="text-end p-3">
                <Button as={Link} to="/invite">
                    <FaPlus />
                    사용자 초대하기
                </Button>
            </Col>

            <div className="tabs">
                <span className="tab" onClick={
                    () => {
                        setIsSearch(false);
                        setPage(prev => ({
                            ...prev,
                            sort: "empNo",
                            direction: "asc",
                        }));
                    }
                }>전체</span>
                {tabs.map((tab) => (
                    <div key={tab}
                        className="tab"
                        onClick={() => searchInitial(tab)}>
                        <span>{tab}</span>
                    </div>
                ))}
            </div>



            <Card className="user-header fw-bold border-0">
                <Card.Body>
                    <Row>
                        <Col className="text-nowrap" onClick={() => setPage(prev => ({
                            ...prev,
                            page: 1,
                            sort: "empName",
                        }))}>
                            <span>사번/이름</span>
                            <FaArrowDown className="ms-2" />
                        </Col>
                        <Col className="text-nowrap">접속상태</Col>
                        <Col className="d-none d-md-block text-nowrap"
                            onClick={() => setPage(prev => ({
                                ...prev,
                                page: 1,
                                sort: "empEmail",
                            }))}>
                            <span>이메일</span>
                            <FaArrowDown className="ms-2" />
                        </Col>
                        <Col className="text-nowrap"
                            onClick={() => setPage(prev => ({
                                ...prev,
                                page: 1,
                                sort: "deptName",
                            }))}>
                            <span>부서</span>
                            <FaArrowDown className="ms-2" />
                        </Col>
                        <Col className="text-nowrap"
                            onClick={() => setPage(prev => ({
                                ...prev,
                                page: 1,
                                sort: "positionName",
                            }))}>
                            <span>직급</span>
                            <FaArrowDown className="ms-2" />
                        </Col>
                        <Col className="d-none d-md-block text-nowrap">생년월일</Col>
                        <Col className="d-none d-md-block text-nowrap">연락처</Col>
                        <Col className="d-none d-md-block text-nowrap">주소</Col>
                        <Col className="text-nowrap">회원상태</Col>
                    </Row>
                </Card.Body>
            </Card>





            {empList.map((emp) => {


                return (
                    
                    <Card
                        onClick={() => {
                            setSelectedEmp(emp);
                            setShow(true);
                        }}
                        key={emp.empNo}
                        className="mt-2 card">

                        <Card.Body>
                            <Row>
                                <Col className="text-nowrap">
                                    
                                    {emp.attachNo ? (
                                        <img
                                            src={`${import.meta.env.VITE_SERVER_URL}/api/attach/${emp.attachNo}`}
                                            className="list-img"
                                        />
                                    ) : (
                                        <img
                                            src={NoImage}
                                            className="list-img"
                                        />
                                    )}
                                    <span className="ms-2">{emp.empNo}/{emp.empName}</span>
                                </Col>
                                <Col>
                                    <FaCircle />
                                    <span className="ms-2">offline</span>
                                </Col>
                                <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empEmail}</Col>
                                <Col className="text-truncate text-nowrap">{emp.deptName}</Col>
                                <Col className="text-truncate text-nowrap">{emp.positionName}</Col>
                                <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empBirth}</Col>
                                <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empContact}</Col>
                                <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empAddress1} {emp.empAddress2}</Col>
                                <Col>
                                    {emp.empState === "invited" && (
                                        <Button>
                                            <span>초대중</span>
                                        </Button>
                                    )}
                                    {emp.empState === "inactive" && (
                                        <Button onClick={() => changeState(emp)}>
                                            <span>비활성</span>
                                        </Button>
                                    )}
                                    {emp.empState === "active" && (
                                        <Button onClick={() => changeState(emp)}>
                                            <span>활성</span>
                                        </Button>
                                    )}
                                </Col>

                            </Row>
                        </Card.Body>

                    </Card>

                );
            })}
            <Offcanvas show={show}
                onHide={() => setShow(false)}
                placement="end"
                style={{ width: "800px" }}
            >
                {selectedEmp && (<>
                    <Offcanvas.Header closeButton>
                        <div>
                            <div>
                                <Offcanvas.Title>사용자 정보</Offcanvas.Title>
                            </div>
                            <div className="mt-2">
                                <img
                                    src={
                                        selectedEmp.attachNo
                                            ? `${import.meta.env.VITE_SERVER_URL}/api/attach/${selectedEmp.attachNo}`
                                            : NoImage
                                    }
                                    className="profile-img"
                                    alt="프로필"
                                />
                            </div>
                            <div className="mt-4">{selectedEmp.empName}</div>
                        </div>
                    </Offcanvas.Header>
                    <Offcanvas.Body>

                        <Row className="mt-4">
                            <Form.Label column sm={2}>부서</Form.Label>
                            <Col sm={10}>
                                <Form.Select onClick={deptNameSearch} name="empDeptNo"
                                    className="w-100 d-inline-block"
                                    value={selectedEmp.empDeptNo}
                                    onChange={changeNumericValue}
                                >
                                    <option value="">선택하세요</option>
                                    {deptList.map(dept => (
                                        <option key={dept.deptNo} value={dept.deptNo}>
                                            {dept.deptName}
                                        </option>
                                    ))}

                                </Form.Select>
                            </Col>
                        </Row>
                        <Row className="mt-4">
                            <Form.Label column sm={2}>직급</Form.Label>
                            <Col sm={10}>
                                <Form.Select onClick={positionNameSearch} name="empPositionNo"
                                    className="w-100 d-inline-block"
                                    value={selectedEmp.empPositionNo}
                                    onChange={changeNumericValue}
                                >
                                    <option value="">선택하세요</option>
                                    {positionList.map(position => (
                                        <option key={position.positionNo} value={position.positionNo}>
                                            {position.positionName}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>
                        </Row>
                        <Row className="mt-4">
                            <Col sm={2}>이메일</Col>
                            <Col sm={10}>{selectedEmp.empEmail}</Col>
                        </Row>
                        <Row className="mt-4">
                            <Col sm={2}>생일</Col>
                            <Col sm={10}>{selectedEmp.empBirth}</Col>
                        </Row>
                        <Row className="mt-4">
                            <Col sm={2}>연락처</Col>
                            <Col sm={10}>{selectedEmp.empContact}</Col>
                        </Row>
                        <Row className="mt-4">
                            <Col sm={2}>주소</Col>
                            <Col sm={10}>{selectedEmp.empPost} {selectedEmp.empAddress1} {selectedEmp.empAddress2}</Col>
                        </Row>
                        <Row className="mt-4">
                            <Col sm={2}>상태</Col>
                            <Col sm={10}>{selectedEmp.empState}</Col>
                        </Row>

                        <Row className="mt-4">
                            <Col className="text-end">
                                <Button onClick={async () => {
                                    await changeData(selectedEmp);
                                    setShow(false);
                                }}>
                                    <span>수정하기</span>
                                </Button>
                            </Col>
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

        </div>
    </>)
}