import { Button, Col, Form, Row, Card, Badge, Table } from "react-bootstrap";
import { FaArrowDown, FaArrowUp, FaCircle, FaMagnifyingGlass, FaPlus } from "react-icons/fa6";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@utils/reaxios";
import "../member.css";
import "@templates/project.css";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import NoImage from "@assets/noimages.png";
import Pagination from 'react-bootstrap/Pagination';
import Offcanvas from 'react-bootstrap/Offcanvas';



export default function Users() {

    const [empList, setEmpList] = useState([]);

    const [totalList, setTotalList] = useState([]);


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

    const [checked, setChecked] = useState([]);




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
        setChecked([]);



    }, [page]);


    const totalData = useCallback(async () => {
        const { data } = await apiClient.get("/admin/");
        setTotalList(data);
    }, []);

    useEffect(() => {
        loadData();
        totalData();


    }, [loadData, totalData]);




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


    const [activeTab, setActiveTab] = useState("전체");

    const searchInitial = useCallback(async (tab) => {
        setActiveTab(tab);

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

    const inactiveNumber = useMemo(() => {
        return totalList.filter(emp => emp.empState === "inactive").length;
    }, [totalList]);

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

            <div className="mt-2">
                <div>
                    <h3>사용자 목록</h3>
                </div>
                <div className="text-muted">
                    <span>사원 수 : {totalList.length}명</span>
                </div>
                <div className="text-muted">
                    <span>현재 비활성 사원 : {inactiveNumber}명</span>
                </div>
                <div className="text-muted">
                    <span>검색 결과 : {count}명</span>
                </div>
            </div>
            <Form autoComplete="off" onSubmit={search}>
                <Row className="mt-4">
                    <Col className="d-flex">
                        <Form.Control name="keyword"
                            placeholder="검색"
                            onChange={changeStringValue}
                            className="w-100"
                        ></Form.Control>
                        <Button type="submit"
                            className="ms-2"
                        ><FaMagnifyingGlass /></Button>
                    </Col>
                </Row>
            </Form>

            <div className="tabs mt-2">
                <span className={`tab ${activeTab === "전체" ? "active" : ""}`}
                    onClick={
                        () => {
                            setActiveTab("전체");
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
                        className={`tab ${activeTab === tab ? "active" : ""}`}
                        onClick={() => searchInitial(tab)}>
                        <span>{tab}</span>
                    </div>
                ))}
                <span className={`tab ${activeTab === "비활성" ? "active" : ""}`}
                    onClick={
                        () => {
                            setActiveTab("비활성");
                            setIsSearch(false);
                            setPage(prev => ({
                                ...prev,
                                sort: "empNo",
                                direction: "asc",
                            }));
                        }
                    }>활성화</span>
                <span className={`tab ${activeTab === "비활성" ? "active" : ""}`}
                    onClick={
                        () => {
                            setActiveTab("비활성");
                            setIsSearch(false);
                            setPage(prev => ({
                                ...prev,
                                sort: "empNo",
                                direction: "asc",
                            }));
                        }
                    }>부서변경</span>
                <span className={`tab ${activeTab === "비활성" ? "active" : ""}`}
                    onClick={
                        () => {
                            setActiveTab("비활성");
                            setIsSearch(false);
                            setPage(prev => ({
                                ...prev,
                                sort: "empNo",
                                direction: "asc",
                            }));
                        }
                    }>직급 변경</span>
            </div>

            <Table className="member-table">
                <thead>
                    <tr>
                        <th>
                            <Form.Check
                                checked={
                                    empList.length > 0 &&
                                    checked.length === empList.length
                                }
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setChecked(empList.map(emp=>emp.empNo));                                        
                                    } else {
                                        setChecked([]);
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                            ></Form.Check>
                        </th>
                        <th onClick={() => setPage(prev => ({
                            ...prev,
                            page: 1,
                            sort: "empName",
                            direction: prev.sort === "empName" && prev.direction === "asc" ? "desc" : "asc",
                        }))}>
                            <span>사번/이름</span>
                            {page.sort === "empName" && page.direction === "asc" ? (
                                <FaArrowDown className="ms-2" />
                            ) : (
                                <FaArrowUp className="ms-2" />
                            )}

                        </th>
                        <th>레벨</th>
                        <th>상태</th>
                        <th onClick={() => setPage(prev => ({
                            ...prev,
                            page: 1,
                            sort: "empEmail",
                            direction: prev.sort === "empEmail" && prev.direction === "asc" ? "desc" : "asc",
                        }))}>
                            <span>이메일</span>
                            {page.sort === "empEmail" && page.direction === "asc" ? (
                                <FaArrowDown className="ms-2" />
                            ) : (
                                <FaArrowUp className="ms-2" />
                            )}
                        </th>
                        <th onClick={() => setPage(prev => ({
                            ...prev,
                            page: 1,
                            sort: "deptName",
                            direction: prev.sort === "deptName" && prev.direction === "asc" ? "desc" : "asc",
                        }))}>
                            <span>부서</span>
                            {page.sort === "deptName" && page.direction === "asc" ? (
                                <FaArrowDown className="ms-2" />
                            ) : (
                                <FaArrowUp className="ms-2" />
                            )}
                        </th>
                        <th onClick={() => setPage(prev => ({
                            ...prev,
                            page: 1,
                            sort: "positionName",
                            direction: prev.sort === "positionName" && prev.direction === "asc" ? "desc" : "asc",
                        }))}>
                            <span>직급</span>
                            {page.sort === "positionName" && page.direction === "asc" ? (
                                <FaArrowDown className="ms-2" />
                            ) : (
                                <FaArrowUp className="ms-2" />
                            )}
                        </th>
                        <th>생일</th>
                        <th>연락처</th>
                        <th>주소</th>
                        <th onClick={() => setPage(prev => ({
                            ...prev,
                            page: 1,
                            sort: "empState",
                            direction: prev.sort === "empState" && prev.direction === "asc" ? "desc" : "asc",
                        }))}>
                            <span>계정상태</span>
                            {page.sort === "empState" && page.direction === "asc" ? (
                                <FaArrowDown className="ms-2" />
                            ) : (
                                <FaArrowUp className="ms-2" />
                            )}
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {empList.map((emp) => (
                        <tr onClick={() => {
                            setSelectedEmp(emp);
                            setShow(true);
                        }}
                            key={emp.empNo}
                            className="member-table-item">
                            <td className="d-flex align-items-center">
                                <Form.Check
                                    checked={checked.includes(emp.empNo)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setChecked(prev => [
                                                ...prev,
                                                emp.empNo
                                            ]);
                                        } else {
                                            setChecked(prev =>
                                                prev.filter(empNo => empNo !== emp.empNo)
                                            );
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                ></Form.Check>

                                {emp.attachNo ? (
                                    <img
                                        src={`${import.meta.env.VITE_SERVER_URL}/api/attach/${emp.attachNo}`}
                                        className="list-img ms-3"
                                    />
                                ) : (
                                    <img
                                        src={NoImage}
                                        className="list-img ms-3"
                                    />
                                )}</td>
                            <td>
                                {emp.empName === null ? (
                                    <span className="ms-2">{emp.empNo}/이름없음</span>
                                ) : (<>
                                    <span className="ms-2">{emp.empNo}/{emp.empName}</span>
                                </>)}
                            </td>
                            <td>{emp.empLevel}</td>
                            <td>offline</td>
                            <td>{emp.empEmail}</td>
                            <td>{emp.deptName}</td>
                            <td>{emp.positionName}</td>
                            <td>{emp.empBirth}</td>
                            <td>{emp.empContact}</td>
                            <td>{emp.empAddress1} {emp.empAddress2}</td>
                            <td>
                                {emp.empLevel === "admin" ? (
                                    <span>활성</span>
                                ) : (<>
                                    {emp.empState === "invited" && (
                                        <span>초대중</span>
                                    )}
                                    {emp.empState === "inactive" && (
                                        <span>비활성</span>
                                    )}
                                    {emp.empState === "active" && (
                                        <span>활성</span>
                                    )}
                                </>)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>



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
                            <div className="mt-4">
                                <span className="fs-3">{selectedEmp.empName}</span>
                                <span className="ms-2">{selectedEmp.deptName}</span>
                                <span className="ms-2">{selectedEmp.positionName}</span>
                                <Badge className="ms-2">{selectedEmp.empLevel}</Badge>
                                <Badge className="ms-2">{selectedEmp.empState}</Badge>



                            </div>
                            <div className="profile-line"></div>
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
                            <Col className="text-end">
                                {selectedEmp.empLevel === "admin" ? (
                                    <span className="text-muted">활성</span>
                                ) : (<>
                                    {selectedEmp.empState === "invited" && (
                                        <Button>
                                            <span>초대중</span>
                                        </Button>
                                    )}
                                    {selectedEmp.empState === "inactive" && (
                                        <Button onClick={async () => {
                                            await changeState(selectedEmp);
                                            setShow(false);
                                        }}>
                                            <span>비활성</span>
                                        </Button>
                                    )}
                                    {selectedEmp.empState === "active" && (
                                        <Button onClick={async () => {
                                            await changeState(selectedEmp);
                                            setShow(false);
                                        }}>
                                            <span>활성</span>
                                        </Button>
                                    )}
                                </>)}
                                <Button
                                    className="ms-3"
                                    onClick={async () => {
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