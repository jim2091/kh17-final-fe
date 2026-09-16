import { Col, Row, Card, Table } from "react-bootstrap";
import { useCallback, useEffect, useState, useMemo } from "react";
import { apiClient } from "@utils/reaxios";
import "./member.css";
import "@templates/project.css";
import Pagination from 'react-bootstrap/Pagination';
import { BiSolidDownArrow, BiSolidUpArrow } from "react-icons/bi";
import NoImage from "@assets/noimages.png";



//사용자 목록을 보여주는 컴포넌트

export default function Members() {

    const [empList, setEmpList] = useState([]);

    const [page, setPage] = useState({
        page: 1,
        size: 10,
        sort: "empNo",
        direction: "asc",
    });

    const [count, setCount] = useState(0);

    const tabs = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ",
        "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

    const [activeTab, setActiveTab] = useState("");

    const [isSearch, setIsSearch] = useState(false);

    const loadData = useCallback(async () => {
        if (isSearch) return;
        const { data } = await apiClient.post("/member/", page);

        setEmpList(data.list);
        setCount(data.count);
        setChecked([]);
    }, [page]);
    // console.log("empList : ", empList);
    useEffect(() => {
        loadData();
    }, [loadData]);

    const searchInitial = useCallback(async (tab) => {
        setActiveTab(tab);

        const newPage = {
            ...page,
            page: 1,
            sort: "empNo",

        }
        setPage(newPage);
        setIsSearch(true);

        const { data } = await apiClient.post("/member/initial", {
            tab: tab,
            pageVO: newPage,
        });

        // setPage(prev=>({...prev, page : 1}));
        setEmpList(data.list);
        setCount(data.count);
    }, [page]);

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

            <div className="tabs mt-2">
                <span className={`mb-1 tab ${activeTab === "전체" ? "active" : ""}`}
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
                        className={`mb-1 tab ${activeTab === tab ? "active" : ""}`}
                        onClick={() => searchInitial(tab)}>
                        <span>{tab}</span>
                    </div>
                ))}
                <span className="divider"></span>
            </div>
            <div className="member-table-wrapper">
                <Table className="member-table">
                    <thead>
                        <tr>
                            <th onClick={() => setPage(prev => ({
                                ...prev,
                                page: 1,
                                sort: "empName",
                                direction: prev.sort === "empName" && prev.direction === "asc" ? "desc" : "asc",
                            }))} className="sortable name-column">
                                <span>이름</span>
                                {page.sort === "empName" && page.direction === "asc" ? (
                                    <BiSolidDownArrow className="ms-2" />
                                ) : (
                                    <BiSolidUpArrow className="ms-2" />
                                )}

                            </th>
                            <th onClick={() => setPage(prev => ({
                                ...prev,
                                page: 1,
                                sort: "empEmail",
                                direction: prev.sort === "empEmail" && prev.direction === "asc" ? "desc" : "asc",
                            }))} className="sortable email-column">
                                <span>이메일</span>
                                {page.sort === "empEmail" && page.direction === "asc" ? (
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
                            }))} className="sortable dept-column">
                                <span>부서</span>
                                {page.sort === "deptName" && page.direction === "asc" ? (
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
                            }))} className="sortable position-column">
                                <span>직급</span>
                                {page.sort === "positionName" && page.direction === "asc" ? (
                                    <BiSolidDownArrow className="ms-2" />
                                ) : (
                                    <BiSolidUpArrow className="ms-2" />
                                )}
                            </th>
                            <th className="birth-column">생일</th>
                            <th className="contact-column">연락처</th>
                            <th className="address-column">주소</th>
                        </tr>
                    </thead>


                    <tbody>
                        {empList.map((emp) => (
                            <tr
                                key={emp.empNo}
                                className="member-table-item"
                                onClick={() => {
                                    setSelectedEmp(emp);
                                    setShow(true);
                                }}
                            >
                                {/* 이름 */}
                                <td className="name-column">
                                    <div className="member-info">
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
                                        )}

                                        <div>
                                            <div className="member-name ms-2">
                                                {emp.empName === null ? "이름없음" : emp.empName}
                                            </div>

                                            <div className="member-meta">
                                                {emp.deptName} · {emp.positionName}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* 이메일 */}
                                <td className="email-column">
                                    {emp.empEmail}
                                </td>

                                {/* 부서 */}
                                <td className="dept-column">
                                    {emp.deptName}
                                </td>

                                {/* 직급 */}
                                <td className="position-column">
                                    {emp.positionName}
                                </td>

                                {/* 생일 */}
                                <td className="birth-column">
                                    {emp.empBirth}
                                </td>

                                {/* 연락처 */}
                                <td className="contact-column">
                                    {emp.empContact}
                                </td>

                                {/* 주소 */}
                                <td className="address-column">
                                    {emp.empAddress1}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
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
    </>);
}