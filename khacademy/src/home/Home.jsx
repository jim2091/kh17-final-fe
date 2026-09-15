import { useSetAtom } from "jotai";
import { loginActionState } from "../utils/storage";
import { useCallback, useEffect } from "react";
import { apiClient } from "../utils/reaxios";


export default function Home(){

    const loginAction = useSetAtom(loginActionState);

    const loadData =useCallback(async()=>{
        const {data} = await apiClient.get("/member/me");
        loginAction(data);

    }, []);

    useEffect(()=>{
        loadData();
    }, []);
    return(<>
    
    <h1>메인화면입니다.</h1>
    </>);
}