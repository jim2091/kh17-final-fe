import { Col, Row, Card } from "react-bootstrap";
import { useCallback, useEffect, useState, useMemo } from "react";
import { apiClient } from "@utils/reaxios";
import "./member.css";
import "@templates/project.css";
import Pagination from 'react-bootstrap/Pagination';



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







    const loadData = useCallback(async () => {
        const { data } = await apiClient.post("/member/", page);

        setEmpList(data.list);
        setCount(data.count);



    }, [page]);
    // console.log("empList : ", empList);
    useEffect(() => {
        loadData();


    }, [loadData]);

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
            <Row className="user-header py-2 fw-bold">
                <Col className="text-nowrap">이름</Col>
                <Col className="d-none d-md-block text-nowrap">이메일</Col>
                <Col className="text-nowrap">부서</Col>
                <Col className="text-nowrap">직급</Col>
                <Col className="d-none d-md-block text-nowrap">생년월일</Col>
                <Col className="d-none d-md-block text-nowrap">연락처</Col>
                <Col className="d-none d-md-block text-nowrap">주소</Col>
            </Row>


            {empList.map((emp) => {
                return (<>

                    <Card key={emp.empNo} className="mt-2 card">

                        <Card.Body>
                            <Row>
                                <Col className="text-nowrap">{emp.empName}</Col>
                                <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empEmail}</Col>
                                <Col className="text-truncate text-nowrap">{emp.deptName}</Col>
                                <Col className="text-truncate text-nowrap">{emp.positionName}</Col>
                                <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empBirth}</Col>
                                <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empContact}</Col>
                                <Col className="d-none d-lg-block text-truncate text-nowrap">{emp.empAddress1}</Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </>);
            })}
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